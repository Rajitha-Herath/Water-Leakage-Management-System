import 'dart:io';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import '../models/complaint.dart';
import '../models/pending_action.dart';
import '../services/api_service.dart';
import '../services/offline_database.dart';
import '../services/sync_service.dart';

class UpdateOutcome {
  const UpdateOutcome({required this.queued, required this.message});
  final bool queued;
  final String message;
}

class ComplaintProvider extends ChangeNotifier {
  ComplaintProvider(this.api, this.database) : syncService = SyncService(api, database);
  final ApiService api;
  final OfflineDatabase database;
  final SyncService syncService;
  List<Complaint> complaints = [];
  bool loading = false;
  bool syncing = false;
  String? error;
  int pendingCount = 0;
  String? statusFilter;

  Future<void> load({bool synchronizeFirst = true}) async {
    loading = true;
    error = null;
    notifyListeners();
    try {
      if (synchronizeFirst && await _online()) await synchronize(showLoading: false);
      complaints = await api.listComplaints(status: statusFilter);
    } catch (exception) {
      error = exception.toString();
    } finally {
      pendingCount = await database.count();
      loading = false;
      notifyListeners();
    }
  }

  Future<Complaint> details(String id) => api.getComplaint(id);

  Future<void> setFilter(String? status) async {
    statusFilter = status;
    await load(synchronizeFirst: false);
  }

  Future<UpdateOutcome> applyStatus({
    required String complaintId,
    required String status,
    required String notes,
    String photoPath = '',
  }) async {
    try {
      if (!await _online()) throw const SocketException('Offline');
      if (photoPath.isNotEmpty) await api.uploadResolutionPhoto(complaintId, photoPath);
      await api.updateStatus(complaintId, status, notes);
      await load(synchronizeFirst: false);
      return const UpdateOutcome(queued: false, message: 'Complaint updated successfully.');
    } catch (_) {
      final durablePhoto = photoPath.isEmpty ? '' : await _copyForOffline(photoPath);
      await database.enqueue(PendingAction(
        complaintId: complaintId,
        status: status,
        notes: notes,
        photoPath: durablePhoto,
        createdAt: DateTime.now(),
      ));
      pendingCount = await database.count();
      notifyListeners();
      return const UpdateOutcome(queued: true, message: 'No server connection. The update is saved on this phone and will sync later.');
    }
  }

  Future<SyncResult> synchronize({bool showLoading = true}) async {
    if (syncing) return const SyncResult(0, 0);
    syncing = showLoading;
    if (showLoading) notifyListeners();
    final result = await syncService.synchronize();
    pendingCount = await database.count();
    syncing = false;
    notifyListeners();
    return result;
  }

  Future<bool> _online() async {
    final results = await Connectivity().checkConnectivity();
    return !results.contains(ConnectivityResult.none);
  }

  Future<String> _copyForOffline(String source) async {
    final directory = await getApplicationSupportDirectory();
    final offline = Directory(p.join(directory.path, 'pending_photos'));
    await offline.create(recursive: true);
    final extension = p.extension(source).isEmpty ? '.jpg' : p.extension(source);
    final destination = p.join(offline.path, '${DateTime.now().microsecondsSinceEpoch}$extension');
    return (await File(source).copy(destination)).path;
  }
}

