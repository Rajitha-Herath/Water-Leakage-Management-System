import 'package:flutter_test/flutter_test.dart';
import 'package:water_leakage_officer/models/complaint.dart';

void main() {
  test('status lifecycle exposes the correct next officer action', () {
    Complaint build(String status) => Complaint(
      id: '1', publicId: 'WL-1', description: 'Leak', address: 'Road', area: 'Kandy', category: 'Other', priority: 'Medium', source: 'whatsapp', status: status, phoneNumber: '0710000000', latitude: 7.2, longitude: 80.6, receivedAt: DateTime(2026), resolutionNotes: '', photos: const [], history: const [],
    );
    expect(build('Assigned').nextStatus, 'Reached');
    expect(build('Reached').nextStatus, 'In_Progress');
    expect(build('In_Progress').nextStatus, 'Resolved');
    expect(build('Resolved').nextStatus, isNull);
  });
}

