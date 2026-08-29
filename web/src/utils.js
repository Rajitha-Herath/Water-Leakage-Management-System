export const STATUS_LABEL = {
  New: 'New', Assigned: 'Assigned', Reached: 'Reached Site', In_Progress: 'In Progress', Resolved: 'Resolved'
};

export const STATUS_ORDER = ['New', 'Assigned', 'Reached', 'In_Progress', 'Resolved'];

export function formatDate(value, includeTime = true) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-LK', includeTime
    ? { dateStyle: 'medium', timeStyle: 'short' }
    : { dateStyle: 'medium' }).format(new Date(value));
}

export function coordinatesOf(complaint) {
  const [longitude, latitude] = complaint?.location?.coordinates || [];
  return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
}

export function googleMapsUrl(complaint) {
  const point = coordinatesOf(complaint);
  return point ? `https://www.google.com/maps/search/?api=1&query=${point.latitude},${point.longitude}` : '#';
}

