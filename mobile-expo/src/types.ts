export type ComplaintStatus =
  | 'New'
  | 'Assigned'
  | 'Reached'
  | 'In_Progress'
  | 'Resolved';

export interface AppUser {
  id: string;
  officerId: string;
  name: string;
  email: string;
  phone: string;
  role: 'OIC' | 'OFFICER';
  position: string;
}

export interface ComplaintPhoto {
  _id?: string;
  url: string;
  type: 'complaint' | 'resolution';
  mimeType?: string;
  uploadedAt?: string;
}

export interface StatusHistory {
  status: ComplaintStatus;
  changedAt?: string;
  notes?: string;
  changedBy?: {
    name?: string;
    officerId?: string;
  } | null;
}

export interface Complaint {
  _id: string;
  publicId: string;
  description: string;
  address: string;
  area: string;
  category: string;
  priority: string;
  source: string;
  status: ComplaintStatus;
  citizen?: {
    phoneNumber?: string;
    name?: string;
  };
  location?: {
    type?: 'Point';
    coordinates?: number[];
  };
  assignedOfficer?: {
    officerId?: string;
    name?: string;
    phone?: string;
    position?: string;
  } | null;
  resolutionNotes?: string;
  receivedAt?: string;
  resolvedAt?: string;
  photos?: ComplaintPhoto[];
  history?: StatusHistory[];
}

export interface PhotoAsset {
  uri: string;
  fileName: string;
  mimeType: string;
}

export interface PendingAction {
  id: number;
  complaintId: string;
  status: ComplaintStatus;
  notes: string;
  photoUri: string;
  photoName: string;
  photoMimeType: string;
  createdAt: string;
}

export function statusLabel(status: ComplaintStatus): string {
  if (status === 'Reached') return 'Reached Site';
  if (status === 'In_Progress') return 'In Progress';
  return status;
}

export function nextStatus(status: ComplaintStatus): ComplaintStatus | null {
  if (status === 'Assigned') return 'Reached';
  if (status === 'Reached') return 'In_Progress';
  if (status === 'In_Progress') return 'Resolved';
  return null;
}

export function complaintCoordinates(complaint: Complaint): {
  latitude: number;
  longitude: number;
} {
  const coordinates = complaint.location?.coordinates ?? [80.7718, 7.8731];
  return {
    longitude: Number(coordinates[0] ?? 80.7718),
    latitude: Number(coordinates[1] ?? 7.8731),
  };
}

