const Activity = require('../models/Activity');
const { validationResult } = require('express-validator');
const axios = require('axios');

// @desc    Add new activity
// @route   POST /api/activities
const addActivity = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { date, studyHours, sleepHours, exerciseMinutes, screenTimeHours, mood, notes } = req.body;

  try {
    // Try to get ML prediction first
    let productivityScore = null;
    let productivityLabel = null;
    let cluster = null;

    try {
      const mlResponse = await axios.post(`${process.env.ML_SERVICE_URL}/predict`, {
        study_hours: studyHours,
        sleep_hours: sleepHours,
        exercise_minutes: exerciseMinutes,
        screen_time_hours: screenTimeHours
      }, { timeout: 3000 });

      if (mlResponse.data) {
        productivityScore = mlResponse.data.productivity_score;
        productivityLabel = mlResponse.data.productivity_label;
        cluster = mlResponse.data.cluster;
      }
    } catch (mlErr) {
      // ML service unavailable - will use model's pre-save hook fallback
      console.log('ML service unavailable, using fallback calculation');
    }

    const activity = await Activity.create({
      user: req.user._id,
      date: date || new Date(),
      studyHours,
      sleepHours,
      exerciseMinutes,
      screenTimeHours,
      mood,
      notes,
      productivityScore,
      productivityLabel,
      cluster
    });

    res.status(201).json({ success: true, message: 'Activity logged!', activity });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get all activities for user
// @route   GET /api/activities
const getActivities = async (req, res) => {
  const { period = '30', page = 1, limit = 20 } = req.query;

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    const activities = await Activity.find({
      user: req.user._id,
      date: { $gte: startDate }
    })
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Activity.countDocuments({ user: req.user._id, date: { $gte: startDate } });

    res.json({ success: true, activities, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get single activity
// @route   GET /api/activities/:id
const getActivity = async (req, res) => {
  try {
    const activity = await Activity.findOne({ _id: req.params.id, user: req.user._id });
    if (!activity) return res.status(404).json({ success: false, message: 'Activity not found' });
    res.json({ success: true, activity });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Update activity
// @route   PUT /api/activities/:id
const updateActivity = async (req, res) => {
  try {
    const activity = await Activity.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { ...req.body, productivityScore: null, productivityLabel: null }, // Recalculate
      { new: true, runValidators: true }
    );
    if (!activity) return res.status(404).json({ success: false, message: 'Activity not found' });
    res.json({ success: true, activity });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Delete activity
// @route   DELETE /api/activities/:id
const deleteActivity = async (req, res) => {
  try {
    const activity = await Activity.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!activity) return res.status(404).json({ success: false, message: 'Activity not found' });
    res.json({ success: true, message: 'Activity deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get dashboard stats (averages, trends)
// @route   GET /api/activities/stats
const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activities = await Activity.find({
      user: userId,
      date: { $gte: thirtyDaysAgo }
    }).sort({ date: 1 });

    if (activities.length === 0) {
      return res.json({ success: true, stats: null, message: 'No data yet' });
    }

    // Calculate averages
    const avg = activities.reduce((acc, a) => {
      acc.study += a.studyHours;
      acc.sleep += a.sleepHours;
      acc.exercise += a.exerciseMinutes;
      acc.screen += a.screenTimeHours;
      acc.score += a.productivityScore || 0;
      return acc;
    }, { study: 0, sleep: 0, exercise: 0, screen: 0, score: 0 });

    const count = activities.length;
    const avgStats = {
      studyHours: (avg.study / count).toFixed(1),
      sleepHours: (avg.sleep / count).toFixed(1),
      exerciseMinutes: (avg.exercise / count).toFixed(0),
      screenTimeHours: (avg.screen / count).toFixed(1),
      productivityScore: (avg.score / count).toFixed(0)
    };

    // Weekly data for chart (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const weeklyData = activities.filter(a => new Date(a.date) >= sevenDaysAgo);

    // Label distribution
    const labelCounts = { Low: 0, Medium: 0, High: 0 };
    activities.forEach(a => {
      if (a.productivityLabel) labelCounts[a.productivityLabel]++;
    });

    // Recent 7 activities for trend line
    const recentActivities = activities.slice(-7);

    res.json({
      success: true,
      stats: {
        averages: avgStats,
        totalLogs: count,
        labelDistribution: labelCounts,
        weeklyData: weeklyData.map(a => ({
          date: a.date,
          studyHours: a.studyHours,
          sleepHours: a.sleepHours,
          exerciseMinutes: a.exerciseMinutes,
          screenTimeHours: a.screenTimeHours,
          productivityScore: a.productivityScore,
          productivityLabel: a.productivityLabel
        })),
        recentTrend: recentActivities.map(a => ({
          date: a.date,
          score: a.productivityScore
        }))
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { addActivity, getActivities, getActivity, updateActivity, deleteActivity, getDashboardStats };
