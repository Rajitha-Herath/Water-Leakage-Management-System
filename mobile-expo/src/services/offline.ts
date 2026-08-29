import { Directory, File, Paths } from 'expo-file-system';

import type { ComplaintStatus, PhotoAsset } from '../types';
import { api } from './api';
import {
  enqueueAction,
  listPendingActions,
  removePendingAction,
} from './database';

async function persistPhoto(photo?: PhotoAsset): Promise<PhotoAsset | null> {
  if (!photo) return null;

  const directory = new Directory(Paths.document, 'pending_photos');
  directory.create({ idempotent: true, intermediates: true });

  const source = new File(photo.uri);
  const extension = source.extension || '.jpg';
  const destination = new File(
    directory,
    `completion_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${extension}`,
  );
  await source.copy(destination);

  return {
    uri: destination.uri,
    fileName: destination.name,
    mimeType: photo.mimeType || 'image/jpeg',
  };
}

function removePhoto(uri: string): void {
  if (!uri) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // The status action is already synchronized; a missing cached file is harmless.
  }
}

export async function queueStatusUpdate(input: {
  complaintId: string;
  status: ComplaintStatus;
  notes: string;
  photo?: PhotoAsset;
}): Promise<void> {
  const persistedPhoto = await persistPhoto(input.photo);
  await enqueueAction({
    complaintId: input.complaintId,
    status: input.status,
    notes: input.notes,
    photoUri: persistedPhoto?.uri ?? '',
    photoName: persistedPhoto?.fileName ?? '',
    photoMimeType: persistedPhoto?.mimeType ?? '',
    createdAt: new Date().toISOString(),
  });
}

export async function synchronizePendingActions(): Promise<{
  synced: number;
  failed: number;
}> {
  let synced = 0;
  let failed = 0;

  for (const action of await listPendingActions()) {
    try {
      if (action.photoUri) {
        await api.uploadResolutionPhoto(action.complaintId, {
          uri: action.photoUri,
          fileName: action.photoName || 'completion.jpg',
          mimeType: action.photoMimeType || 'image/jpeg',
        });
      }
      await api.updateStatus(action.complaintId, action.status, action.notes);
      await removePendingAction(action.id);
      removePhoto(action.photoUri);
      synced += 1;
    } catch {
      failed += 1;
      break;
    }
  }

  return { synced, failed };
}

