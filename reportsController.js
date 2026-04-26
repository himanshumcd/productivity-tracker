const Activity = require('../models/Activity');

// Simple rule-based chatbot for productivity suggestions
// @route   POST /api/chatbot/message
const sendMessage = async (req, res) => {
  const { message } = req.body;
  const userMessage = message.toLowerCase().trim();

  try {
    // Get latest activity for context
    const latestActivity = await Activity.findOne({ user: req.user._id }).sort({ date: -1 });

    let reply = '';
    let quickReplies = [];

    // Pattern matching for responses
    if (userMessage.includes('hello') || userMessage.includes('hi') || userMessage.includes('hey')) {
      reply = `Hey ${req.user.name}! 👋 I'm your productivity coach. Ask me about sleep, study, exercise, or screen time tips!`;
      quickReplies = ['How to improve sleep?', 'Study tips', 'Exercise advice', 'My productivity score'];
    }
    else if (userMessage.includes('sleep')) {
      if (latestActivity && latestActivity.sleepHours < 7) {
        reply = `Based on your recent logs, you're averaging only ${latestActivity.sleepHours} hours of sleep. 😴 Here's what you should do:\n\n• Set a consistent bedtime (e.g., 11 PM)\n• Avoid screens 1 hour before bed\n• Keep your room dark and cool\n• Avoid caffeine after 4 PM\n\nEven 30 extra minutes of sleep can boost your focus by 20%!`;
      } else {
        reply = '💤 Sleep Tips for Students:\n\n• Aim for 7-9 hours every night\n• Maintain a consistent sleep schedule (even weekends)\n• Power naps of 20 mins boost alertness\n• Avoid studying in bed — keep bed for sleeping only\n• Blue light from screens delays melatonin — stop screen use 1hr before sleep';
      }
      quickReplies = ['Study tips', 'Reduce screen time', 'Exercise advice'];
    }
    else if (userMessage.includes('study') || userMessage.includes('focus')) {
      reply = '📚 Study Productivity Tips:\n\n• Use Pomodoro Technique: 25 min work + 5 min break\n• Study in 90-minute deep work blocks\n• Eliminate phone distractions (use Focus mode)\n• Review notes within 24 hours of learning\n• Teach concepts to someone else — best way to retain!\n• Active recall > re-reading (use flashcards)';
      quickReplies = ['Sleep tips', 'How to reduce stress?', 'Best study hours'];
    }
    else if (userMessage.includes('exercise') || userMessage.includes('workout')) {
      reply = '🏃 Exercise & Productivity:\n\n• Even 30 mins of moderate exercise increases brain-derived neurotrophic factor (BDNF)\n• Morning exercise sets an energetic tone for the day\n• Try: 20 min walk + 10 min stretching daily\n• Exercise during study breaks for better retention\n• Yoga and meditation reduce cortisol (stress hormone)';
      quickReplies = ['Sleep tips', 'Study tips', 'Motivation tips'];
    }
    else if (userMessage.includes('screen') || userMessage.includes('phone') || userMessage.includes('social media')) {
      reply = '📵 Reducing Screen Time:\n\n• Use app timers (set 30 min limit for social media)\n• Practice 20-20-20 rule: every 20 mins look 20 feet away for 20 secs\n• Keep phone in another room while studying\n• Use grayscale mode to make phone less appealing\n• Replace 30 mins scrolling with reading or exercise\n• Turn off all non-essential notifications';
      quickReplies = ['Sleep tips', 'Study tips', 'Show my stats'];
    }
    else if (userMessage.includes('score') || userMessage.includes('productivity') || userMessage.includes('stats')) {
      if (latestActivity) {
        reply = `📊 Your Latest Stats:\n\n🎯 Productivity Score: ${latestActivity.productivityScore}/100 (${latestActivity.productivityLabel})\n📚 Study: ${latestActivity.studyHours} hrs\n😴 Sleep: ${latestActivity.sleepHours} hrs\n🏃 Exercise: ${latestActivity.exerciseMinutes} mins\n📱 Screen Time: ${latestActivity.screenTimeHours} hrs\n\nWant tips to improve any specific area?`;
      } else {
        reply = "You haven't logged any activities yet! Head to the Activities page to log your first entry. 📝";
      }
      quickReplies = ['How to improve?', 'Sleep tips', 'Study tips'];
    }
    else if (userMessage.includes('stress') || userMessage.includes('anxiety') || userMessage.includes('burnout')) {
      reply = '🧘 Managing Stress & Burnout:\n\n• Take a full day off every 7 days — rest is productive!\n• Practice 4-7-8 breathing: inhale 4s, hold 7s, exhale 8s\n• Write a "done list" instead of a to-do list to see progress\n• Talk to a friend or mentor about challenges\n• 10 min of sunlight daily regulates mood hormones\n• Remember: Progress > Perfection';
      quickReplies = ['Exercise advice', 'Sleep tips', 'Motivation tips'];
    }
    else if (userMessage.includes('motivat')) {
      reply = "🌟 Stay Motivated:\n\n• Set tiny daily wins — achievement triggers dopamine\n• Track your progress visually (that's what this app is for!)\n• Use the 2-minute rule: if it takes < 2 mins, do it now\n• Find your 'why' — deep motivation beats willpower\n• Reward yourself after hitting weekly goals\n• Surround yourself with people who push you forward";
      quickReplies = ['Study tips', 'How to build habits?', 'Show my stats'];
    }
    else if (userMessage.includes('habit')) {
      reply = '🔄 Building Good Habits:\n\n• Use habit stacking: attach new habit to existing one\n• Start with 2-minute versions of habits (tiny habits)\n• Track streaks — don\'t break the chain!\n• Design your environment for good habits\n• It takes ~66 days (not 21!) to form a habit\n• Focus on identity: "I am a person who studies daily"';
      quickReplies = ['Sleep tips', 'Exercise advice', 'Motivation tips'];
    }
    else {
      reply = "I'm here to help you boost productivity! 🚀 Try asking me about:\n\n• Sleep optimization\n• Study techniques\n• Exercise tips\n• Screen time reduction\n• Stress management\n• Habit building\n• Your productivity stats";
      quickReplies = ['Sleep tips', 'Study tips', 'My productivity score', 'Motivation tips'];
    }

    res.json({
      success: true,
      reply,
      quickReplies,
      timestamp: new Date()
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { sendMessage };
