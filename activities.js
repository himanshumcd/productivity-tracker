const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    default: Date.now
  },
  studyHours: {
    type: Number,
    required: [true, 'Study hours required'],
    min: [0, 'Cannot be negative'],
    max: [24, 'Cannot exceed 24 hours']
  },
  sleepHours: {
    type: Number,
    required: [true, 'Sleep hours required'],
    min: [0, 'Cannot be negative'],
    max: [24, 'Cannot exceed 24 hours']
  },
  exerciseMinutes: {
    type: Number,
    required: [true, 'Exercise time required'],
    min: [0, 'Cannot be negative'],
    max: [480, 'Cannot exceed 8 hours']
  },
  screenTimeHours: {
    type: Number,
    required: [true, 'Screen time required'],
    min: [0, 'Cannot be negative'],
    max: [24, 'Cannot exceed 24 hours']
  },
  mood: {
    type: String,
    enum: ['terrible', 'bad', 'okay', 'good', 'excellent'],
    default: 'okay'
  },
  notes: {
    type: String,
    maxlength: 500,
    default: ''
  },
  // Calculated fields (set by ML or backend)
  productivityScore: {
    type: Number,
    min: 0,
    max: 100,
    default: null
  },
  productivityLabel: {
    type: String,
    enum: ['Low', 'Medium', 'High', null],
    default: null
  },
  cluster: {
    type: Number,
    default: null
  }
}, { timestamps: true });

// Prevent duplicate entries for same user on same day
activitySchema.index({ user: 1, date: 1 }, { unique: false });

// Calculate a basic productivity score before saving (fallback if ML is down)
activitySchema.pre('save', function(next) {
  if (this.productivityScore === null) {
    // Simple formula: weighted sum
    const studyScore = Math.min(this.studyHours / 8, 1) * 40;
    const sleepScore = (this.sleepHours >= 7 && this.sleepHours <= 9) ? 25 : Math.max(0, 25 - Math.abs(this.sleepHours - 8) * 5);
    const exerciseScore = Math.min(this.exerciseMinutes / 60, 1) * 20;
    const screenPenalty = Math.max(0, (this.screenTimeHours - 4) * 3);
    this.productivityScore = Math.max(0, Math.min(100, Math.round(studyScore + sleepScore + exerciseScore - screenPenalty)));

    if (this.productivityScore >= 70) this.productivityLabel = 'High';
    else if (this.productivityScore >= 40) this.productivityLabel = 'Medium';
    else this.productivityLabel = 'Low';
  }
  next();
});

module.exports = mongoose.model('Activity', activitySchema);
