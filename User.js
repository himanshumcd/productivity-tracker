const Activity = require('../models/Activity');
const PDFDocument = require('pdfkit');

// @desc    Generate and download PDF report
// @route   GET /api/reports/pdf
const generatePDFReport = async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    const activities = await Activity.find({
      user: req.user._id,
      date: { $gte: startDate }
    }).sort({ date: -1 });

    if (activities.length === 0) {
      return res.status(400).json({ success: false, message: 'No activities found for this period' });
    }

    // Calculate summary
    const avg = activities.reduce((acc, a) => ({
      study: acc.study + a.studyHours,
      sleep: acc.sleep + a.sleepHours,
      exercise: acc.exercise + a.exerciseMinutes,
      screen: acc.screen + a.screenTimeHours,
      score: acc.score + (a.productivityScore || 0)
    }), { study: 0, sleep: 0, exercise: 0, screen: 0, score: 0 });

    const count = activities.length;
    const avgStudy = (avg.study / count).toFixed(1);
    const avgSleep = (avg.sleep / count).toFixed(1);
    const avgExercise = (avg.exercise / count).toFixed(0);
    const avgScreen = (avg.screen / count).toFixed(1);
    const avgScore = (avg.score / count).toFixed(0);

    // Create PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=productivity_report_${Date.now()}.pdf`);
    doc.pipe(res);

    // Header
    doc.fontSize(24).fillColor('#4F46E5').text('Productivity Tracker Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor('#6B7280').text(`Report for: ${req.user.name}`, { align: 'center' });
    doc.text(`Period: Last ${period} days (${activities.length} entries)`, { align: 'center' });
    doc.text(`Generated: ${new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}`, { align: 'center' });

    // Divider
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#E5E7EB').stroke();
    doc.moveDown();

    // Summary stats
    doc.fontSize(16).fillColor('#111827').text('📊 Summary Statistics');
    doc.moveDown(0.5);

    const stats = [
      ['Avg Study Hours/day', `${avgStudy} hrs`, avgStudy >= 6 ? '✅ Good' : '⚠️ Needs improvement'],
      ['Avg Sleep Hours/day', `${avgSleep} hrs`, (avgSleep >= 7 && avgSleep <= 9) ? '✅ Optimal' : '⚠️ Adjust needed'],
      ['Avg Exercise/day', `${avgExercise} mins`, avgExercise >= 30 ? '✅ Active' : '⚠️ Exercise more'],
      ['Avg Screen Time/day', `${avgScreen} hrs`, avgScreen <= 4 ? '✅ Controlled' : '⚠️ High usage'],
      ['Avg Productivity Score', `${avgScore}/100`, avgScore >= 70 ? '✅ High' : avgScore >= 40 ? '📊 Medium' : '❌ Low']
    ];

    stats.forEach(([label, value, status]) => {
      doc.fontSize(11).fillColor('#374151')
        .text(`• ${label}: `, { continued: true })
        .fillColor('#4F46E5').text(`${value}  `, { continued: true })
        .fillColor('#6B7280').text(status);
    });

    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#E5E7EB').stroke();
    doc.moveDown();

    // Activity log
    doc.fontSize(16).fillColor('#111827').text('📅 Activity Log');
    doc.moveDown(0.5);

    // Table headers
    const cols = [50, 130, 195, 255, 325, 400, 470];
    doc.fontSize(9).fillColor('#6B7280');
    ['Date', 'Study (h)', 'Sleep (h)', 'Exercise (m)', 'Screen (h)', 'Score', 'Level'].forEach((h, i) => {
      doc.text(h, cols[i], doc.y, { width: 70 });
    });
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#D1D5DB').stroke();
    doc.moveDown(0.3);

    activities.slice(0, 25).forEach((a, idx) => {
      const y = doc.y;
      const dateStr = new Date(a.date).toLocaleDateString('en-IN');
      const rowColor = idx % 2 === 0 ? '#F9FAFB' : '#FFFFFF';

      doc.rect(50, y - 2, 495, 14).fillColor(rowColor).fill();
      doc.fontSize(9).fillColor('#374151');

      const row = [
        dateStr,
        `${a.studyHours}`,
        `${a.sleepHours}`,
        `${a.exerciseMinutes}`,
        `${a.screenTimeHours}`,
        `${a.productivityScore || 'N/A'}`,
        a.productivityLabel || 'N/A'
      ];

      row.forEach((val, i) => {
        doc.text(val, cols[i], y, { width: 70 });
      });

      doc.moveDown(0.5);
      if (doc.y > 750) { doc.addPage(); }
    });

    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#E5E7EB').stroke();
    doc.moveDown();

    // Recommendations
    doc.fontSize(16).fillColor('#111827').text('💡 Personalized Recommendations');
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor('#374151');

    if (avgSleep < 7) doc.text('• Prioritize sleep: aim for at least 7 hours nightly for cognitive function');
    if (avgStudy < 4) doc.text('• Increase study time: try Pomodoro technique (25 min focus + 5 min break)');
    if (avgExercise < 30) doc.text('• Add movement: even a 20-min daily walk improves brain performance by 20%');
    if (avgScreen > 6) doc.text('• Reduce screen time: set app limits and take digital detox breaks');
    if (avgScore >= 70) doc.text('• Excellent work! Maintain consistency and avoid burnout with regular rest days');
    else if (avgScore >= 40) doc.text('• You\'re on track! Small improvements in sleep and exercise will push scores higher');
    else doc.text('• Focus on fundamentals: fix sleep schedule first, then gradually add study and exercise goals');

    // Footer
    doc.fontSize(9).fillColor('#9CA3AF')
      .text('Generated by Productivity Tracker App — Your personal AI-powered coach', 50, 780, { align: 'center' });

    doc.end();
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { generatePDFReport };
