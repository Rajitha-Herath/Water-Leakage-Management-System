class PendingAction {
  const PendingAction({
    this.id,
    required this.complaintId,
    required this.status,
    required this.notes,
    required this.photoPath,
    required this.createdAt,
  });
  final int? id;
  final String complaintId;
  final String status;
  final String notes;
  final String photoPath;
  final DateTime createdAt;

  Map<String, Object?> toMap() => {
        'complaint_id': complaintId,
        'status': status,
        'notes': notes,
        'photo_path': photoPath,
        'created_at': createdAt.toIso8601String(),
      };

  factory PendingAction.fromMap(Map<String, Object?> map) => PendingAction(
        id: map['id'] as int?,
        complaintId: map['complaint_id'] as String,
        status: map['status'] as String,
        notes: map['notes'] as String? ?? '',
        photoPath: map['photo_path'] as String? ?? '',
        createdAt: DateTime.parse(map['created_at'] as String),
      );
}

