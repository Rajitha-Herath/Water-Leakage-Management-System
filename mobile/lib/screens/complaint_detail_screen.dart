import 'dart:io';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/complaint.dart';
import '../providers/complaint_provider.dart';
import '../services/api_service.dart';
import '../widgets/status_chip.dart';

class ComplaintDetailScreen extends StatefulWidget {
  const ComplaintDetailScreen({super.key, required this.complaintId});
  final String complaintId;
  @override
  State<ComplaintDetailScreen> createState() => _ComplaintDetailScreenState();
}

class _ComplaintDetailScreenState extends State<ComplaintDetailScreen> {
  late Future<Complaint> future;
  final notes = TextEditingController();
  String photoPath = '';
  bool saving = false;

  @override
  void initState() { super.initState(); future = context.read<ComplaintProvider>().details(widget.complaintId); }
  @override
  void dispose() { notes.dispose(); super.dispose(); }

  void reload() => setState(() => future = context.read<ComplaintProvider>().details(widget.complaintId));
  Future<void> openNavigation(Complaint item) async {
    await launchUrl(
      Uri.parse('https://www.google.com/maps/dir/?api=1&destination=${item.latitude},${item.longitude}'),
      mode: LaunchMode.externalApplication,
    );
  }

  Future<void> callCitizen(Complaint item) async {
    await launchUrl(Uri.parse('tel:${item.phoneNumber}'));
  }
  Future<void> choosePhoto() async { final image = await ImagePicker().pickImage(source: ImageSource.camera, imageQuality: 80, maxWidth: 1800); if (image != null) setState(() => photoPath = image.path); }

  Future<String> arrivalGpsNote(Complaint item) async {
    if (!await Geolocator.isLocationServiceEnabled()) throw Exception('Enable phone location services before recording arrival.');
    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) permission = await Geolocator.requestPermission();
    if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) throw Exception('Location permission is required to record site arrival.');
    final position = await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high);
    final distance = Geolocator.distanceBetween(position.latitude, position.longitude, item.latitude, item.longitude).round();
    return 'Arrival GPS ${position.latitude.toStringAsFixed(6)}, ${position.longitude.toStringAsFixed(6)}; approximately ${distance}m from reported point.';
  }

  Future<void> update(Complaint item) async {
    final next = item.nextStatus;
    if (next == null) return;
    if (next == 'Resolved' && notes.text.trim().isEmpty) { message('Enter repair/resolution notes.', error: true); return; }
    if (next == 'Resolved' && photoPath.isEmpty) { message('Capture a completion photograph.', error: true); return; }
    setState(() => saving = true);
    try {
      var statusNotes = notes.text.trim();
      if (next == 'Reached') statusNotes = await arrivalGpsNote(item);
      final outcome = await context.read<ComplaintProvider>().applyStatus(complaintId: item.id, status: next, notes: statusNotes, photoPath: next == 'Resolved' ? photoPath : '');
      if (!mounted) return;
      message(outcome.message, error: false);
      if (!outcome.queued) { notes.clear(); photoPath = ''; reload(); } else { Navigator.pop(context); }
    } catch (error) { message(error.toString().replaceFirst('Exception: ', ''), error: true); }
    finally { if (mounted) setState(() => saving = false); }
  }

  void message(String value, {required bool error}) => ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(value), backgroundColor: error ? Colors.red.shade700 : const Color(0xff0b5d4b)));

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Complaint details', style: TextStyle(fontWeight: FontWeight.w900))),
        body: FutureBuilder<Complaint>(
          future: future,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) return const Center(child: CircularProgressIndicator());
            if (snapshot.hasError) return Center(child: Padding(padding: const EdgeInsets.all(25), child: Column(mainAxisSize: MainAxisSize.min, children: [const Icon(Icons.cloud_off, size: 50), const SizedBox(height: 12), Text(snapshot.error.toString(), textAlign: TextAlign.center), const SizedBox(height: 12), OutlinedButton(onPressed: reload, child: const Text('Try again'))])));
            final item = snapshot.data!;
            return ListView(padding: const EdgeInsets.fromLTRB(17, 5, 17, 35), children: [
              Row(children: [Expanded(child: Text(item.publicId, style: const TextStyle(color: Color(0xff0b5d4b), fontWeight: FontWeight.w900, fontSize: 17))), ComplaintStatusChip(item.status)]),
              const SizedBox(height: 13), Text(item.description, style: const TextStyle(fontSize: 21, height: 1.35, fontWeight: FontWeight.w900)),
              const SizedBox(height: 15), Wrap(spacing: 7, runSpacing: 7, children: [_Tag(item.priority, Icons.priority_high), _Tag(item.category, Icons.plumbing), _Tag(item.source, Icons.chat_outlined)]),
              const SizedBox(height: 18), _Section(title: 'Location and citizen', child: Column(children: [_Info(Icons.location_on_outlined, item.address, item.area), const Divider(height: 25), _Info(Icons.phone_outlined, item.phoneNumber, 'Citizen contact'), const SizedBox(height: 13), Row(children: [Expanded(child: OutlinedButton.icon(onPressed: () => openNavigation(item), icon: const Icon(Icons.navigation_outlined), label: const Text('Navigate'))), const SizedBox(width: 9), Expanded(child: OutlinedButton.icon(onPressed: () => callCitizen(item), icon: const Icon(Icons.call_outlined), label: const Text('Call citizen')))] )])),
              if (item.photos.isNotEmpty) ...[const SizedBox(height: 15), _Section(title: 'Evidence photographs', child: SizedBox(height: 130, child: ListView.separated(scrollDirection: Axis.horizontal, itemCount: item.photos.length, separatorBuilder: (_, _) => const SizedBox(width: 9), itemBuilder: (_, index) { final photo = item.photos[index]; final url = context.read<ApiService>().absolutePhotoUrl(photo.url); return ClipRRect(borderRadius: BorderRadius.circular(10), child: CachedNetworkImage(imageUrl: url, width: 165, height: 130, fit: BoxFit.cover, placeholder: (_, _) => Container(width: 165, color: Colors.grey.shade200, child: const Center(child: CircularProgressIndicator())), errorWidget: (_, _, _) => Container(width: 165, color: Colors.grey.shade200, child: const Icon(Icons.broken_image_outlined)))); })))],
              const SizedBox(height: 15), _Section(title: 'Progress history', child: Column(children: [for (var index = 0; index < item.history.length; index++) _History(item.history[index], last: index == item.history.length - 1)])),
              if (!item.isResolved) ...[const SizedBox(height: 15), _Section(title: 'Next action: ${statusLabel(item.nextStatus!)}', child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [if (item.nextStatus == 'Resolved') ...[TextField(controller: notes, maxLines: 4, decoration: const InputDecoration(labelText: 'Repair and resolution notes', alignLabelWithHint: true)), const SizedBox(height: 11), if (photoPath.isNotEmpty) ClipRRect(borderRadius: BorderRadius.circular(11), child: Image.file(File(photoPath), height: 175, fit: BoxFit.cover)), if (photoPath.isNotEmpty) const SizedBox(height: 8), OutlinedButton.icon(onPressed: choosePhoto, icon: const Icon(Icons.camera_alt_outlined), label: Text(photoPath.isEmpty ? 'Capture completion photo' : 'Retake completion photo')), const SizedBox(height: 11)], ElevatedButton.icon(onPressed: saving ? null : () => update(item), icon: saving ? const SizedBox(width: 19, height: 19, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Icon(Icons.arrow_forward), label: Text(saving ? 'Saving...' : 'Mark as ${statusLabel(item.nextStatus!)}'))]))],
              if (item.isResolved && item.resolutionNotes.isNotEmpty) ...[const SizedBox(height: 15), _Section(title: 'Resolution', child: Text(item.resolutionNotes, style: const TextStyle(height: 1.5)))],
            ]);
          },
        ),
      );
}

class _Section extends StatelessWidget { const _Section({required this.title, required this.child}); final String title; final Widget child; @override Widget build(BuildContext context) => Container(padding: const EdgeInsets.all(15), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(15)), child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [Text(title.toUpperCase(), style: const TextStyle(fontSize: 10, letterSpacing: 1, color: Color(0xff147d65), fontWeight: FontWeight.w900)), const SizedBox(height: 12), child])); }
class _Info extends StatelessWidget { const _Info(this.icon, this.title, this.subtitle); final IconData icon; final String title; final String subtitle; @override Widget build(BuildContext context) => Row(children: [Container(width: 39, height: 39, decoration: BoxDecoration(color: const Color(0xffe7f4ef), borderRadius: BorderRadius.circular(10)), child: Icon(icon, color: const Color(0xff0b5d4b), size: 21)), const SizedBox(width: 11), Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(title, style: const TextStyle(fontWeight: FontWeight.w800)), const SizedBox(height: 2), Text(subtitle, style: const TextStyle(color: Color(0xff6f7d78), fontSize: 12))]))]); }
class _Tag extends StatelessWidget { const _Tag(this.text, this.icon); final String text; final IconData icon; @override Widget build(BuildContext context) => Container(padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8)), child: Row(mainAxisSize: MainAxisSize.min, children: [Icon(icon, size: 14, color: const Color(0xff6f7d78)), const SizedBox(width: 4), Text(text, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700))])); }
class _History extends StatelessWidget { const _History(this.item, {required this.last}); final StatusHistory item; final bool last; @override Widget build(BuildContext context) => IntrinsicHeight(child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [Column(children: [Container(width: 13, height: 13, decoration: BoxDecoration(color: const Color(0xff0b5d4b), shape: BoxShape.circle, border: Border.all(color: const Color(0xffbce4d6), width: 3))), if (!last) Expanded(child: Container(width: 2, color: const Color(0xffdbe7e2)))]), const SizedBox(width: 10), Expanded(child: Padding(padding: const EdgeInsets.only(bottom: 14), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(statusLabel(item.status), style: const TextStyle(fontWeight: FontWeight.w800)), if (item.changedAt != null) Text('${item.changedAt!.toLocal()}'.substring(0, 16), style: const TextStyle(fontSize: 11, color: Color(0xff6f7d78))), if (item.notes.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 3), child: Text(item.notes, style: const TextStyle(fontSize: 12, color: Color(0xff55635e))))])))])); }
