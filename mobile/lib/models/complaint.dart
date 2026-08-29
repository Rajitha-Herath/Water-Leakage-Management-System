class ComplaintPhoto {
  const ComplaintPhoto({required this.url, required this.type});
  final String url;
  final String type;
  factory ComplaintPhoto.fromJson(Map<String, dynamic> json) => ComplaintPhoto(
        url: json['url']?.toString() ?? '',
        type: json['type']?.toString() ?? 'complaint',
      );
}

class StatusHistory {
  const StatusHistory({required this.status, required this.changedAt, required this.notes, this.changedBy});
  final String status;
  final DateTime? changedAt;
  final String notes;
  final String? changedBy;
  factory StatusHistory.fromJson(Map<String, dynamic> json) {
    final rawChangedBy = json['changedBy'];
    return StatusHistory(
      status: json['status']?.toString() ?? '',
      changedAt: DateTime.tryParse(json['changedAt']?.toString() ?? ''),
      notes: json['notes']?.toString() ?? '',
      changedBy: rawChangedBy is Map<String, dynamic>
          ? rawChangedBy['name']?.toString()
          : null,
    );
  }
}

class Complaint {
  const Complaint({
    required this.id,
    required this.publicId,
    required this.description,
    required this.address,
    required this.area,
    required this.category,
    required this.priority,
    required this.source,
    required this.status,
    required this.phoneNumber,
    required this.latitude,
    required this.longitude,
    required this.receivedAt,
    required this.resolutionNotes,
    required this.photos,
    required this.history,
    this.officerName,
  });

  final String id;
  final String publicId;
  final String description;
  final String address;
  final String area;
  final String category;
  final String priority;
  final String source;
  final String status;
  final String phoneNumber;
  final double latitude;
  final double longitude;
  final DateTime? receivedAt;
  final String resolutionNotes;
  final List<ComplaintPhoto> photos;
  final List<StatusHistory> history;
  final String? officerName;

  String? get nextStatus => switch (status) {
        'Assigned' => 'Reached',
        'Reached' => 'In_Progress',
        'In_Progress' => 'Resolved',
        _ => null,
      };

  bool get isResolved => status == 'Resolved';

  factory Complaint.fromJson(Map<String, dynamic> json) {
    final location = json['location'] as Map<String, dynamic>?;
    final rawCoordinates = location?['coordinates'] as List<dynamic>? ?? const [80.7718, 7.8731];
    final citizen = json['citizen'] as Map<String, dynamic>?;
    final officer = json['assignedOfficer'] as Map<String, dynamic>?;
    return Complaint(
      id: json['_id']?.toString() ?? '',
      publicId: json['publicId']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      address: json['address']?.toString() ?? '',
      area: json['area']?.toString() ?? 'Unspecified',
      category: json['category']?.toString() ?? 'Other',
      priority: json['priority']?.toString() ?? 'Medium',
      source: json['source']?.toString() ?? 'whatsapp',
      status: json['status']?.toString() ?? 'New',
      phoneNumber: citizen?['phoneNumber']?.toString() ?? '',
      longitude: ((rawCoordinates.isNotEmpty ? rawCoordinates[0] : 80.7718) as num).toDouble(),
      latitude: ((rawCoordinates.length > 1 ? rawCoordinates[1] : 7.8731) as num).toDouble(),
      receivedAt: DateTime.tryParse(json['receivedAt']?.toString() ?? ''),
      resolutionNotes: json['resolutionNotes']?.toString() ?? '',
      photos: (json['photos'] as List<dynamic>? ?? const [])
          .map((item) => ComplaintPhoto.fromJson(item as Map<String, dynamic>))
          .toList(),
      history: (json['history'] as List<dynamic>? ?? const [])
          .map((item) => StatusHistory.fromJson(item as Map<String, dynamic>))
          .toList(),
      officerName: officer?['name']?.toString(),
    );
  }
}

String statusLabel(String status) => switch (status) {
      'Reached' => 'Reached Site',
      'In_Progress' => 'In Progress',
      _ => status,
    };
