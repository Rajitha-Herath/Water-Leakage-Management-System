class AppUser {
  const AppUser({
    required this.id,
    required this.officerId,
    required this.name,
    required this.email,
    required this.phone,
    required this.role,
    required this.position,
  });

  final String id;
  final String officerId;
  final String name;
  final String email;
  final String phone;
  final String role;
  final String position;

  factory AppUser.fromJson(Map<String, dynamic> json) => AppUser(
        id: json['id']?.toString() ?? '',
        officerId: json['officerId']?.toString() ?? '',
        name: json['name']?.toString() ?? '',
        email: json['email']?.toString() ?? '',
        phone: json['phone']?.toString() ?? '',
        role: json['role']?.toString() ?? '',
        position: json['position']?.toString() ?? '',
      );
}

