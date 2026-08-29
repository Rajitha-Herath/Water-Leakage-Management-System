import PDFDocument from 'pdfkit';
import { Complaint } from '../models/Complaint.js';
import { asyncHandler } from '../utils/asyncHandler.js';

function dateRange(query) {
  const now = new Date();
  const defaultFrom = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const defaultTo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  const from = query.from ? new Date(`${query.from}T00:00:00.000Z`) : defaultFrom;
  const to = query.to ? new Date(`${query.to}T23:59:59.999Z`) : defaultTo;
  return { from, to, match: { receivedAt: { $gte: from, $lte: to } } };
}

async function buildSummary(query) {
  const { from, to, match } = dateRange(query);
  const [statusCounts, sourceCounts, areaBreakdown, officerBreakdown, trend, resolvedMetrics] =
    await Promise.all([
      Complaint.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Complaint.aggregate([{ $match: match }, { $group: { _id: '$source', count: { $sum: 1 } } }]),
      Complaint.aggregate([
        { $match: match },
        { $group: { _id: '$area', total: { $sum: 1 }, resolved: { $sum: { $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0] } } } },
        { $sort: { total: -1 } },
        { $limit: 10 }
      ]),
      Complaint.aggregate([
        { $match: { ...match, assignedOfficer: { $ne: null } } },
        { $group: { _id: '$assignedOfficer', total: { $sum: 1 }, resolved: { $sum: { $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0] } } } },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'officer' } },
        { $unwind: '$officer' },
        { $project: { name: '$officer.name', officerId: '$officer.officerId', total: 1, resolved: 1 } },
        { $sort: { total: -1 } }
      ]),
      Complaint.aggregate([
        { $match: match },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$receivedAt' } }, total: { $sum: 1 }, resolved: { $sum: { $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0] } } } },
        { $sort: { _id: 1 } }
      ]),
      Complaint.aggregate([
        { $match: { ...match, status: 'Resolved', resolvedAt: { $ne: null } } },
        { $group: { _id: null, averageMs: { $avg: { $subtract: ['$resolvedAt', '$receivedAt'] } }, count: { $sum: 1 } } }
      ])
    ]);

  const statuses = Object.fromEntries(['New', 'Assigned', 'Reached', 'In_Progress', 'Resolved'].map((key) => [key, 0]));
  statusCounts.forEach((item) => { statuses[item._id] = item.count; });
  const sources = { whatsapp: 0, manual: 0 };
  sourceCounts.forEach((item) => { sources[item._id] = item.count; });
  const total = Object.values(statuses).reduce((sum, value) => sum + value, 0);
  const averageResolutionHours = resolvedMetrics[0]?.averageMs
    ? Number((resolvedMetrics[0].averageMs / 3_600_000).toFixed(1))
    : 0;
  return {
    period: { from, to },
    kpis: {
      total,
      active: total - statuses.Resolved,
      resolved: statuses.Resolved,
      resolutionRate: total ? Number(((statuses.Resolved / total) * 100).toFixed(1)) : 0,
      averageResolutionHours
    },
    statuses,
    sources,
    areaBreakdown,
    officerBreakdown,
    trend
  };
}

export const summary = asyncHandler(async (req, res) => {
  res.json({ success: true, summary: await buildSummary(req.query) });
});

function formatDate(value) {
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeZone: 'Asia/Colombo' }).format(value);
}

export const monthlyPdf = asyncHandler(async (req, res) => {
  const report = await buildSummary(req.query);
  const filename = `NWSDB-Leakage-Report-${report.period.from.toISOString().slice(0, 10)}-to-${report.period.to.toISOString().slice(0, 10)}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: 'NWSDB Water Leakage Report' } });
  doc.pipe(res);
  doc.fillColor('#0b5d4b').fontSize(20).text('National Water Supply & Drainage Board');
  doc.fillColor('#111827').fontSize(15).text('Water Leakage Management Report', { paragraphGap: 8 });
  doc.fontSize(10).fillColor('#4b5563').text(`${formatDate(report.period.from)} to ${formatDate(report.period.to)}`);
  doc.moveDown(1.5);

  const cards = [
    ['Total complaints', report.kpis.total],
    ['Active complaints', report.kpis.active],
    ['Resolved complaints', report.kpis.resolved],
    ['Resolution rate', `${report.kpis.resolutionRate}%`],
    ['Average resolution', `${report.kpis.averageResolutionHours} hours`]
  ];
  doc.fillColor('#111827').fontSize(13).text('Executive summary');
  doc.moveDown(0.4);
  cards.forEach(([label, value]) => doc.fontSize(10).fillColor('#374151').text(`${label}: `, { continued: true }).fillColor('#111827').text(String(value)));

  doc.moveDown();
  doc.fontSize(13).fillColor('#111827').text('Status distribution');
  Object.entries(report.statuses).forEach(([status, count]) => doc.fontSize(10).text(`${status.replace('_', ' ')}: ${count}`));

  doc.moveDown();
  doc.fontSize(13).text('Top areas');
  if (!report.areaBreakdown.length) doc.fontSize(10).text('No complaints in this reporting period.');
  report.areaBreakdown.forEach((row, index) => doc.fontSize(10).text(`${index + 1}. ${row._id || 'Unspecified'} - ${row.total} total, ${row.resolved} resolved`));

  doc.moveDown();
  doc.fontSize(13).text('Officer performance');
  if (!report.officerBreakdown.length) doc.fontSize(10).text('No officer assignments in this reporting period.');
  report.officerBreakdown.forEach((row, index) => doc.fontSize(10).text(`${index + 1}. ${row.name} (${row.officerId}) - ${row.total} assigned, ${row.resolved} resolved`));

  doc.moveDown(1.5);
  doc.fontSize(8).fillColor('#6b7280').text(`Generated ${new Date().toLocaleString('en-GB', { timeZone: 'Asia/Colombo' })}. This report is produced from the live complaint database.`);
  doc.end();
});

function csvCell(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export const complaintsCsv = asyncHandler(async (req, res) => {
  const { match, from, to } = dateRange(req.query);
  const complaints = await Complaint.find(match)
    .populate('assignedOfficer', 'officerId name')
    .sort({ receivedAt: 1 })
    .lean();
  const headings = ['Complaint ID', 'Received', 'Citizen Phone', 'Area', 'Address', 'Description', 'Source', 'Priority', 'Status', 'Officer ID', 'Officer Name', 'Resolved'];
  const lines = [headings.map(csvCell).join(',')];
  for (const item of complaints) {
    lines.push([
      item.publicId,
      item.receivedAt?.toISOString(),
      item.citizen?.phoneNumber,
      item.area,
      item.address,
      item.description,
      item.source,
      item.priority,
      item.status,
      item.assignedOfficer?.officerId,
      item.assignedOfficer?.name,
      item.resolvedAt?.toISOString()
    ].map(csvCell).join(','));
  }
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="complaints-${from.toISOString().slice(0, 10)}-to-${to.toISOString().slice(0, 10)}.csv"`);
  res.send(`\uFEFF${lines.join('\n')}`);
});

