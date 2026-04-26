const Activity = require('../models/Activity');
const axios = require('axios');

// @desc    Get ML predictions + AI suggestions
// @route   POST /api/predictions/analyze
const analyze = async (req, res) => {
  const { studyHours, sleepHours, exerciseMinutes, screenTimeHours } = req.body;

  try {
    let prediction = null;

    // Try ML service
    try {
      const mlRes = await axios.post(`${process.env.ML_SERVICE_URL}/predict`, {
        study_hours: studyHours,
        sleep_hours: sleepHours,
        exercise_minutes: exerciseMinutes,
        screen_time_hours: screenTimeHours
      }, { timeout: 5000 });
      prediction = mlRes.data;
    } catch (e) {
      // Fallback scoring
      const studyScore = Math.min(studyHours / 8, 1) * 40;
      const sleepScore = (sleepHours >= 7 && sleepHours <= 9) ? 25 : Math.max(0, 25 - Math.abs(sleepHours - 8) * 5);
      const exerciseScore = Math.min(exerciseMinutes / 60, 1) * 20;
      const screenPenalty = Math.max(0, (screenTimeHours - 4) * 3);
      const score = Math.max(0, Math.min(100, Math.round(studyScore + sleepScore + exerciseScore - screenPenalty)));

      prediction = {
        productivity_score: score,
        productivity_label: score >= 70 ? 'High' : score >= 40 ? 'Medium' : 'Low',
        cluster: 0,
        cluster_description: 'Balanced Performer'
      };
    }

    // Generate AI suggestions based on input
    const suggestions = generateSuggestions(studyHours, sleepHours, exerciseMinutes, screenTimeHours, prediction.productivity_score);

    res.json({ success: true, prediction, suggestions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc    Get user's pattern analysis
// @route   GET /api/predictions/patterns
const getPatterns = async (req, res) => {
  try {
    const activities = await Activity.find({ user: req.user._id }).sort({ date: -1 }).limit(30);

    if (activities.length < 3) {
      return res.json({ success: true, patterns: null, message: 'Need at least 3 logs for pattern analysis' });
    }

    const latest = activities.slice(0, 7);
    const avgStudy = latest.reduce((s, a) => s + a.studyHours, 0) / latest.length;
    const avgSleep = latest.reduce((s, a) => s + a.sleepHours, 0) / latest.length;
    const avgExercise = latest.reduce((s, a) => s + a.exerciseMinutes, 0) / latest.length;
    const avgScreen = latest.reduce((s, a) => s + a.screenTimeHours, 0) / latest.length;
    const avgScore = latest.reduce((s, a) => s + (a.productivityScore || 0), 0) / latest.length;

    const suggestions = generateSuggestions(avgStudy, avgSleep, avgExercise, avgScreen, avgScore);
    const trend = calculateTrend(activities.map(a => a.productivityScore).filter(Boolean));

    res.json({
      success: true,
      patterns: {
        averages: { study: avgStudy, sleep: avgSleep, exercise: avgExercise, screen: avgScreen, score: avgScore },
        trend,
        suggestions,
        totalDaysTracked: activities.length
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Helper: generate rule-based suggestions
function generateSuggestions(study, sleep, exercise, screen, score) {
  const suggestions = [];

  if (sleep < 7) suggestions.push({ type: 'warning', icon: '😴', text: `You're only sleeping ${sleep} hours. Aim for 7-9 hours for better focus and memory.` });
  else if (sleep > 9) suggestions.push({ type: 'info', icon: '🌙', text: 'You might be oversleeping. 7-9 hours is optimal.' });
  else suggestions.push({ type: 'success', icon: '✅', text: 'Great sleep schedule! Keep maintaining 7-9 hours.' });

  if (study < 4) suggestions.push({ type: 'warning', icon: '📚', text: `Only ${study} hours of study today. Try to reach at least 4-6 hours for meaningful progress.` });
  else if (study >= 8) suggestions.push({ type: 'info', icon: '🧠', text: 'Studying 8+ hours — make sure to take breaks to avoid burnout!' });
  else suggestions.push({ type: 'success', icon: '📖', text: `Good study session (${study} hrs). Stay consistent!` });

  if (exercise < 20) suggestions.push({ type: 'warning', icon: '🏃', text: 'Very little exercise. Even a 20-30 min walk boosts brain function by 20%.' });
  else if (exercise >= 60) suggestions.push({ type: 'success', icon: '💪', text: `Excellent workout (${exercise} mins)! Physical activity improves focus significantly.` });
  else suggestions.push({ type: 'info', icon: '🏋️', text: `Good workout (${exercise} mins). Try to reach 45-60 mins for max benefit.` });

  if (screen > 6) suggestions.push({ type: 'danger', icon: '📵', text: `${screen} hours of screen time is too high. Aim for under 4 hours to protect your eyes and sleep.` });
  else if (screen > 4) suggestions.push({ type: 'warning', icon: '📱', text: 'Try to cut screen time. Use the 20-20-20 rule: every 20 mins, look 20 feet away for 20 seconds.' });
  else suggestions.push({ type: 'success', icon: '👁️', text: 'Good screen time management! Your eyes thank you.' });

  if (score >= 70) suggestions.push({ type: 'success', icon: '🌟', text: 'High productivity day! You\'re in the zone. Keep up this momentum.' });
  else if (score < 40) suggestions.push({ type: 'danger', icon: '⚡', text: 'Low productivity score. Focus on fixing sleep first — it affects everything else.' });

  return suggestions;
}

// Helper: calculate trend direction
function calculateTrend(scores) {
  if (scores.length < 2) return 'stable';
  const recent = scores.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
  const older = scores.slice(-3).reduce((a, b) => a + b, 0) / 3;
  if (recent > older + 5) return 'improving';
  if (recent < older - 5) return 'declining';
  return 'stable';
}

module.exports = { analyze, getPatterns };
