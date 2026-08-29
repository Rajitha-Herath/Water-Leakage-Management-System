import '../services/api_service.dart';
import '../services/offline_database.dart';

class SyncResult {
  const SyncResult(this.synced, this.failed);
  final int synced;
  final int failed;
}

class SyncService {
  SyncService(this.api, this.database);
  final ApiService api;
  final OfflineDatabase database;

  Future<SyncResult> synchronize() async {
    var synced = 0;
    var failed = 0;
    for (final action in await database.all()) {
      try {
        if (action.photoPath.isNotEmpty) {
          await api.uploadResolutionPhoto(action.complaintId, action.photoPath);
        }
        await api.updateStatus(action.complaintId, action.status, action.notes);
        await database.remove(action.id!);
        synced += 1;
      } catch (_) {
        failed += 1;
        break;
      }
    }
    return SyncResult(synced, failed);
  }
}

