import 'package:flutter/material.dart';
import '../models/complaint.dart';
import 'status_chip.dart';

class ComplaintCard extends StatelessWidget {
  const ComplaintCard({super.key, required this.complaint, required this.onTap});
  final Complaint complaint;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Card(
        margin: const EdgeInsets.only(bottom: 12),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(15),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [Expanded(child: Text(complaint.publicId, style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xff0b5d4b)))), ComplaintStatusChip(complaint.status)]),
              const SizedBox(height: 10),
              Text(complaint.description, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, height: 1.35)),
              const SizedBox(height: 12),
              Row(children: [const Icon(Icons.location_on_outlined, size: 17, color: Color(0xff6f7d78)), const SizedBox(width: 5), Expanded(child: Text('${complaint.area} · ${complaint.address}', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Color(0xff6f7d78), fontSize: 12))), const Icon(Icons.chevron_right, color: Color(0xff8a9792))]),
            ]),
          ),
        ),
      );
}

