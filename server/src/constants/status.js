export const COMPLAINT_STATUSES = [
  'New',
  'Assigned',
  'Reached',
  'In_Progress',
  'Resolved'
];

export const STATUS_LABELS = {
  New: 'New',
  Assigned: 'Assigned',
  Reached: 'Reached Site',
  In_Progress: 'In Progress',
  Resolved: 'Resolved'
};

export const NEXT_STATUS = {
  New: 'Assigned',
  Assigned: 'Reached',
  Reached: 'In_Progress',
  In_Progress: 'Resolved'
};

export function canTransition(from, to) {
  return NEXT_STATUS[from] === to;
}

export function nextOfficerStatuses(current) {
  const next = NEXT_STATUS[current];
  return next && next !== 'Assigned' ? [next] : [];
}

