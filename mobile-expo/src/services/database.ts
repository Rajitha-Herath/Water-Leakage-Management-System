import * as SQLite from 'expo-sqlite';

import type { ComplaintStatus, PendingAction } from '../types';

type PendingActionRow = {
  id: number;
  complaint_id: string;
  status: ComplaintStatus;
  notes: string;
  photo_uri: string;
  photo_name: string;
  photo_mime_type: string;
  created_at: string;
};

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function database(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync('nwsdb_offline.db').then(async (db) => {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS pending_actions(
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          complaint_id TEXT NOT NULL,
          status TEXT NOT NULL,
          notes TEXT NOT NULL DEFAULT '',
          photo_uri TEXT NOT NULL DEFAULT '',
          photo_name TEXT NOT NULL DEFAULT '',
          photo_mime_type TEXT NOT NULL DEFAULT '',
          created_at TEXT NOT NULL
        );
      `);
      return db;
    });
  }
  return databasePromise;
}

export async function initializeDatabase(): Promise<void> {
  await database();
}

export async function enqueueAction(action: Omit<PendingAction, 'id'>): Promise<void> {
  const db = await database();
  await db.runAsync(
    `INSERT INTO pending_actions(
      complaint_id, status, notes, photo_uri, photo_name, photo_mime_type, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    action.complaintId,
    action.status,
    action.notes,
    action.photoUri,
    action.photoName,
    action.photoMimeType,
    action.createdAt,
  );
}

export async function listPendingActions(): Promise<PendingAction[]> {
  const db = await database();
  const rows = await db.getAllAsync<PendingActionRow>(
    'SELECT * FROM pending_actions ORDER BY created_at ASC',
  );
  return rows.map((row) => ({
    id: row.id,
    complaintId: row.complaint_id,
    status: row.status,
    notes: row.notes,
    photoUri: row.photo_uri,
    photoName: row.photo_name,
    photoMimeType: row.photo_mime_type,
    createdAt: row.created_at,
  }));
}

export async function pendingActionCount(): Promise<number> {
  const db = await database();
  const row = await db.getFirstAsync<{ total: number }>(
    'SELECT COUNT(*) AS total FROM pending_actions',
  );
  return Number(row?.total ?? 0);
}

export async function removePendingAction(id: number): Promise<void> {
  const db = await database();
  await db.runAsync('DELETE FROM pending_actions WHERE id = ?', id);
}

