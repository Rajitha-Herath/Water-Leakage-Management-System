import 'package:path/path.dart';
import 'package:sqflite/sqflite.dart';
import '../models/pending_action.dart';

class OfflineDatabase {
  Database? _database;
  Future<Database> get database async {
    if (_database != null) return _database!;
    final dbPath = join(await getDatabasesPath(), 'nwsdb_offline.db');
    _database = await openDatabase(
      dbPath,
      version: 1,
      onCreate: (db, _) => db.execute('''
        CREATE TABLE pending_actions(
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          complaint_id TEXT NOT NULL,
          status TEXT NOT NULL,
          notes TEXT NOT NULL DEFAULT '',
          photo_path TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL
        )
      '''),
    );
    return _database!;
  }

  Future<int> enqueue(PendingAction action) async => (await database).insert('pending_actions', action.toMap());
  Future<List<PendingAction>> all() async {
    final rows = await (await database).query('pending_actions', orderBy: 'created_at ASC');
    return rows.map(PendingAction.fromMap).toList();
  }
  Future<int> count() async {
    final result = await (await database).rawQuery('SELECT COUNT(*) AS total FROM pending_actions');
    return Sqflite.firstIntValue(result) ?? 0;
  }
  Future<void> remove(int id) async {
    await (await database).delete('pending_actions', where: 'id = ?', whereArgs: [id]);
  }

  Future<void> clear() async {
    await (await database).delete('pending_actions');
  }
}
