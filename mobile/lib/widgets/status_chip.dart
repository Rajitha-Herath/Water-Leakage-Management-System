import 'package:flutter/material.dart';
import '../models/complaint.dart';

class ComplaintStatusChip extends StatelessWidget {
  const ComplaintStatusChip(this.status, {super.key});
  final String status;
  @override
  Widget build(BuildContext context) {
    final colors = switch (status) {
      'New' => (const Color(0xffffead0), const Color(0xffa85300)),
      'Assigned' => (const Color(0xffe1efff), const Color(0xff21629b)),
      'Reached' => (const Color(0xffeee8ff), const Color(0xff694bb2)),
      'In_Progress' => (const Color(0xfffff3c6), const Color(0xff856800)),
      'Resolved' => (const Color(0xffdaf4e9), const Color(0xff08705a)),
      _ => (Colors.grey.shade200, Colors.grey.shade700),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
      decoration: BoxDecoration(color: colors.$1, borderRadius: BorderRadius.circular(99)),
      child: Text(statusLabel(status), style: TextStyle(color: colors.$2, fontSize: 11, fontWeight: FontWeight.w800)),
    );
  }
}

