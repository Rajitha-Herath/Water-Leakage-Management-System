import { connectDatabase, disconnectDatabase } from './config/db.js';
import { User, hashPassword } from './models/User.js';
import { Complaint } from './models/Complaint.js';
import { Photo } from './models/Photo.js';

await connectDatabase();

const accounts = [
  { officerId: 'OIC001', name: 'Nimal Perera', email: 'oic@nwsdb.lk', password: 'Admin@123', phone: '0710000001', role: 'OIC'},
  { officerId: 'EA001', name: 'Kasun Silva', email: 'officer1@nwsdb.lk', password: 'Officer@123', phone: '0710000002', role: 'OFFICER' },
  { officerId: 'EA002', name: 'Tharushi Fernando', email: 'officer2@nwsdb.lk', password: 'Officer@123', phone: '0710000003', role: 'OFFICER'}
];

for (const account of accounts) {
  const passwordHash = await hashPassword(account.password);
  await User.findOneAndUpdate(
    { email: account.email },
    { $set: { officerId: account.officerId, name: account.name, phone: account.phone, role: account.role, active: true, passwordHash } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

const [officer1, officer2] = await Promise.all([
  User.findOne({ email: 'officer1@nwsdb.lk' }),
  User.findOne({ email: 'officer2@nwsdb.lk' })
]);

if ((await Complaint.countDocuments()) === 0) {
  const now = Date.now();
  const samples = await Complaint.insertMany([
    {
      publicId: 'WL-202608-DEMO01',
      citizen: { phoneNumber: '+94771234567', name: 'Citizen A' },
      description: 'Large water main leak beside Kandy Road bus stop',
      address: 'Kandy Road bus stop, Kadawatha', area: 'Kadawatha', category: 'Pipe Burst', priority: 'Critical', source: 'whatsapp', status: 'New',
      location: { type: 'Point', coordinates: [79.9528, 7.0019] }, receivedAt: new Date(now - 2 * 60 * 60 * 1000),
      history: [{ status: 'New', notes: 'WhatsApp complaint received' }]
    },
    {
      publicId: 'WL-202608-DEMO02',
      citizen: { phoneNumber: '+94772345678', name: 'Citizen B' },
      description: 'Service line leak near the public library',
      address: 'Main Street, Kegalle', area: 'Kegalle', category: 'Service Line', priority: 'High', source: 'whatsapp', status: 'Assigned', assignedOfficer: officer1._id,
      location: { type: 'Point', coordinates: [80.3464, 7.2513] }, receivedAt: new Date(now - 8 * 60 * 60 * 1000), assignedAt: new Date(now - 7 * 60 * 60 * 1000),
      history: [{ status: 'New', notes: 'Complaint received' }, { status: 'Assigned', notes: 'Assigned to Kasun Silva' }]
    },
    {
      publicId: 'WL-202608-DEMO03',
      citizen: { phoneNumber: '+94773456789', name: 'Citizen C' },
      description: 'Valve chamber continuously overflowing',
      address: 'Lake Road, Kandy', area: 'Kandy', category: 'Valve Leak', priority: 'High', source: 'manual', status: 'In_Progress', assignedOfficer: officer2._id,
      location: { type: 'Point', coordinates: [80.6337, 7.2906] }, receivedAt: new Date(now - 24 * 60 * 60 * 1000), assignedAt: new Date(now - 22 * 60 * 60 * 1000),
      history: [{ status: 'New' }, { status: 'Assigned' }, { status: 'Reached' }, { status: 'In_Progress', notes: 'Replacement valve requested' }]
    },
    {
      publicId: 'WL-202608-DEMO04',
      citizen: { phoneNumber: '+94774567890', name: 'Citizen D' },
      description: 'Leak repaired beside the market',
      address: 'Market Road, Gampaha', area: 'Gampaha', category: 'Pipe Burst', priority: 'Medium', source: 'whatsapp', status: 'Resolved', assignedOfficer: officer1._id,
      location: { type: 'Point', coordinates: [80.0220, 7.0840] }, receivedAt: new Date(now - 48 * 60 * 60 * 1000), assignedAt: new Date(now - 46 * 60 * 60 * 1000), resolvedAt: new Date(now - 40 * 60 * 60 * 1000), resolutionNotes: 'Damaged PVC section replaced and supply restored.',
      history: [{ status: 'New' }, { status: 'Assigned' }, { status: 'Reached' }, { status: 'In_Progress' }, { status: 'Resolved', notes: 'Damaged PVC section replaced' }]
    }
  ]);
  await Photo.create({ complaint: samples[3]._id, url: 'https://placehold.co/800x600?text=Resolution+Photo', type: 'resolution', mimeType: 'image/jpeg', uploadedBy: officer1._id });
}

console.log('Seed complete. OIC: oic@nwsdb.lk / Admin@123');
console.log('Officer: officer1@nwsdb.lk / Officer@123');
await disconnectDatabase();

