/**
 * seed.js — Populates MongoDB with a demo user + 30 days of sample activities
 * Usage: node seed.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/productivity_tracker';

const userSchema = new mongoose.Schema({
  name: String, email: String, password: String,
  notifications: { enabled: Boolean, reminderTime: String }
});
const activitySchema = new mongoose.Schema({
  user: mongoose.Schema.Types.ObjectId,
  date: Date, studyHours: Number, sleepHours: Number,
  exerciseMinutes: Number, screenTimeHours: Number,
  mood: String, notes: String, productivityScore: Number,
  productivityLabel: String, cluster: Number
});

const User = mongoose.model('User', userSchema);
const Activity = mongoose.model('Activity', activitySchema);

function calcScore(study, sleep, exercise, screen) {
  const studyScore = Math.min(study / 8, 1) * 40;
  const sleepScore = (sleep >= 7 && sleep <= 9) ? 25 : Math.max(0, 25 - Math.abs(sleep - 8) * 5);
  const exerciseScore = Math.min(exercise / 60, 1) * 20;
  const screenPenalty = Math.max(0, (screen - 4) * 3);
  const score = Math.max(0, Math.min(100, Math.round(studyScore + sleepScore + exerciseScore - screenPenalty)));
  const label = score >= 70 ? 'High' : score >= 40 ? 'Medium' : 'Low';
  return { score, label };
}

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  // Clear existing demo data
  await User.deleteOne({ email: 'test@example.com' });

  // Create demo user
  const hashedPwd = await bcrypt.hash('password123', 12);
  const user = await User.create({
    name: 'Demo Student', email: 'test@example.com',
    password: hashedPwd,
    notifications: { enabled: true, reminderTime: '21:00' }
  });
  console.log(`✅ User created: ${user.email} / password123`);

  // Delete old activities for this user
  await Activity.deleteMany({ user: user._id });

  // Generate 30 days of realistic activities
  const moods = ['terrible', 'bad', 'okay', 'good', 'excellent'];
  const notes = [
    'Productive day', 'Struggled to focus', 'Had exams', 'Gym day',
    'Late night study', 'Lazy day', 'Really focused today', '', '', ''
  ];

  const activities = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);

    // Simulate realistic patterns (better in recent days)
    const trend = (29 - i) / 29; // 0 to 1 improvement
    const studyHours      = parseFloat((2 + trend * 4 + (Math.random() * 3 - 1)).toFixed(1));
    const sleepHours      = parseFloat((5.5 + trend * 2 + (Math.random() * 2 - 1)).toFixed(1));
    const exerciseMinutes = Math.round(Math.max(0, 10 + trend * 40 + (Math.random() * 30 - 10)));
    const screenTimeHours = parseFloat(Math.max(1, (8 - trend * 3 + (Math.random() * 3 - 1.5))).toFixed(1));

    const { score, label } = calcScore(
      Math.min(studyHours, 12), Math.min(sleepHours, 12),
      exerciseMinutes, Math.min(screenTimeHours, 16)
    );

    activities.push({
      user: user._id, date,
      studyHours: Math.min(studyHours, 12),
      sleepHours: Math.min(sleepHours, 12),
      exerciseMinutes,
      screenTimeHours: Math.min(screenTimeHours, 16),
      mood: moods[Math.floor(score / 20)],
      notes: notes[Math.floor(Math.random() * notes.length)],
      productivityScore: score,
      productivityLabel: label,
      cluster: Math.floor(Math.random() * 4)
    });
  }

  await Activity.insertMany(activities);
  console.log(`✅ Inserted 30 days of sample activities`);
  console.log('\n🎉 Seed complete! Login with: test@example.com / password123');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
