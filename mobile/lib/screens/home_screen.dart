import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/complaint.dart';
import '../providers/auth_provider.dart';
import '../providers/complaint_provider.dart';
import '../widgets/complaint_card.dart';
import 'complaint_detail_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => context.read<ComplaintProvider>().load());
  }

  Future<void> sync() async {
    final provider = context.read<ComplaintProvider>();
    final result = await provider.synchronize();
    await provider.load(synchronizeFirst: false);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(result.failed > 0 ? '${result.synced} update(s) synced; ${result.failed} still pending.' : '${result.synced} pending update(s) synchronized.')));
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final provider = context.watch<ComplaintProvider>();
    final active = provider.complaints.where((item) => !item.isResolved).length;
    final resolved = provider.complaints.where((item) => item.isResolved).length;
    return Scaffold(
      appBar: AppBar(
        title: const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text('Field Operations', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 19)), Text('Assigned leakage response', style: TextStyle(fontSize: 11, color: Color(0xff6f7d78)))]),
        actions: [
          Stack(children: [IconButton(onPressed: provider.syncing ? null : sync, tooltip: 'Synchronize offline work', icon: provider.syncing ? const SizedBox(width: 21, height: 21, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.sync)), if (provider.pendingCount > 0) Positioned(right: 5, top: 4, child: Container(padding: const EdgeInsets.all(4), decoration: const BoxDecoration(color: Colors.deepOrange, shape: BoxShape.circle), child: Text('${provider.pendingCount}', style: const TextStyle(fontSize: 9, color: Colors.white, fontWeight: FontWeight.bold))))]),
          PopupMenuButton<String>(onSelected: (value) { if (value == 'logout') auth.logout(); }, itemBuilder: (_) => [PopupMenuItem(enabled: false, child: Text('${auth.user?.name}\n${auth.user?.officerId}', style: const TextStyle(fontWeight: FontWeight.w700))), const PopupMenuDivider(), const PopupMenuItem(value: 'logout', child: Row(children: [Icon(Icons.logout), SizedBox(width: 9), Text('Sign out')]))]),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => provider.load(),
        child: ListView(
          padding: const EdgeInsets.fromLTRB(17, 12, 17, 30),
          children: [
            Row(children: [Expanded(child: _Summary(label: 'Active jobs', value: '$active', icon: Icons.construction_outlined, color: const Color(0xff0b5d4b))), const SizedBox(width: 10), Expanded(child: _Summary(label: 'Completed', value: '$resolved', icon: Icons.task_alt, color: const Color(0xff276aa4))), const SizedBox(width: 10), Expanded(child: _Summary(label: 'Pending sync', value: '${provider.pendingCount}', icon: Icons.cloud_upload_outlined, color: const Color(0xffa9630b)))]),
            const SizedBox(height: 19),
            Row(children: [const Expanded(child: Text('My assigned complaints', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900))), Text('${provider.complaints.length} jobs', style: const TextStyle(color: Color(0xff6f7d78), fontSize: 12))]),
            const SizedBox(height: 11),
            SizedBox(height: 37, child: ListView(scrollDirection: Axis.horizontal, children: [for (final entry in <String?, String>{null: 'All', 'Assigned': 'Assigned', 'Reached': 'Reached', 'In_Progress': 'In Progress', 'Resolved': 'Resolved'}.entries) Padding(padding: const EdgeInsets.only(right: 7), child: ChoiceChip(label: Text(entry.value), selected: provider.statusFilter == entry.key, onSelected: (_) => provider.setFilter(entry.key)))])),
            const SizedBox(height: 13),
            if (provider.error != null) Container(margin: const EdgeInsets.only(bottom: 12), padding: const EdgeInsets.all(12), decoration: BoxDecoration(color: const Color(0xffffe8e5), borderRadius: BorderRadius.circular(10)), child: Text(provider.error!, style: const TextStyle(color: Color(0xffa62b22)))),
            if (provider.loading) const Padding(padding: EdgeInsets.all(45), child: Center(child: CircularProgressIndicator())),
            if (!provider.loading && provider.complaints.isEmpty) const _EmptyJobs(),
            for (final complaint in provider.complaints) ComplaintCard(complaint: complaint, onTap: () async { await Navigator.push(context, MaterialPageRoute(builder: (_) => ComplaintDetailScreen(complaintId: complaint.id))); if (mounted) provider.load(synchronizeFirst: false); }),
          ],
        ),
      ),
    );
  }
}

class _Summary extends StatelessWidget {
  const _Summary({required this.label, required this.value, required this.icon, required this.color});
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  @override
  Widget build(BuildContext context) => Container(padding: const EdgeInsets.all(12), decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14)), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Icon(icon, size: 20, color: color), const SizedBox(height: 9), Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900)), Text(label, maxLines: 1, style: const TextStyle(fontSize: 10, color: Color(0xff6f7d78)))]));
}

class _EmptyJobs extends StatelessWidget {
  const _EmptyJobs();
  @override
  Widget build(BuildContext context) => const Padding(padding: EdgeInsets.symmetric(vertical: 60), child: Column(children: [Icon(Icons.assignment_turned_in_outlined, size: 50, color: Color(0xff9aa7a2)), SizedBox(height: 12), Text('No assigned complaints', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 17)), SizedBox(height: 5), Text('New assignments will appear here.', style: TextStyle(color: Color(0xff6f7d78)))]));
}
