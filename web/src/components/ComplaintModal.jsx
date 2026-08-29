import { useEffect, useState } from 'react';
import { ExternalLink, Phone, UserRound, X } from 'lucide-react';
import { API_BASE_URL, api, errorMessage } from '../api/client.js';
import { formatDate, googleMapsUrl, STATUS_LABEL } from '../utils.js';
import StatusBadge from './StatusBadge.jsx';

function photoUrl(url) {
  if (!url || /^https?:/.test(url)) return url;
  return `${API_BASE_URL.replace(/\/api$/, '')}${url}`;
}

export default function ComplaintModal({ complaintId, officers, onClose, onChanged }) {
  const [complaint, setComplaint] = useState(null);
  const [officerId, setOfficerId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/complaints/${complaintId}`).then(({ data }) => {
      setComplaint(data.complaint);
      setOfficerId(data.complaint.assignedOfficer?._id || '');
    }).catch((err) => setError(errorMessage(err)));
  }, [complaintId]);

  async function assign() {
    if (!officerId) return;
    setSaving(true); setError('');
    try {
      const { data } = await api.patch(`/complaints/${complaintId}/assign`, { officerId });
      setComplaint((current) => ({ ...current, ...data.complaint }));
      onChanged();
    } catch (err) { setError(errorMessage(err)); } finally { setSaving(false); }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal" role="dialog" aria-modal="true" aria-label="Complaint details">
        <header><div><span className="eyebrow">Complaint details</span><h2>{complaint?.publicId || 'Loading...'}</h2></div><button className="icon-button" onClick={onClose}><X /></button></header>
        {error && <div className="alert error">{error}</div>}
        {!complaint ? <div className="modal-loading"><span className="spinner" /> Loading complaint...</div> : (
          <div className="modal-body">
            <div className="detail-heading"><StatusBadge status={complaint.status} /><span className={`priority priority-${complaint.priority.toLowerCase()}`}>{complaint.priority} priority</span><span>{complaint.source}</span></div>
            <h3>{complaint.description}</h3>
            <div className="detail-grid">
              <div><small>Area</small><b>{complaint.area}</b></div><div><small>Received</small><b>{formatDate(complaint.receivedAt)}</b></div>
              <div><small>Address</small><b>{complaint.address}</b></div><div><small>Category</small><b>{complaint.category}</b></div>
              <div><small>Citizen phone</small><a href={`tel:${complaint.citizen.phoneNumber}`}><Phone size={15} /> {complaint.citizen.phoneNumber}</a></div>
              <div><small>Location</small><a href={googleMapsUrl(complaint)} target="_blank" rel="noreferrer">Open navigation <ExternalLink size={14} /></a></div>
            </div>
            {complaint.status !== 'Resolved' && (
              <div className="assignment-box">
                <label><UserRound size={17} /> Assigned field officer</label>
                <div><select value={officerId} onChange={(e) => setOfficerId(e.target.value)}><option value="">Select an active officer</option>{officers.map((officer) => <option key={officer.id} value={officer.id}>{officer.officerId} · {officer.name} ({officer.activeComplaints} active)</option>)}</select><button onClick={assign} disabled={!officerId || saving}>{saving ? 'Saving...' : complaint.assignedOfficer ? 'Reassign' : 'Assign'}</button></div>
              </div>
            )}
            <div className="photos"><h4>Evidence photographs</h4><div>{complaint.photos?.map((photo) => <a key={photo._id} href={photoUrl(photo.url)} target="_blank" rel="noreferrer"><img src={photoUrl(photo.url)} alt={`${photo.type} evidence`} /><span>{photo.type}</span></a>)}{!complaint.photos?.length && <p>No photographs available.</p>}</div></div>
            <div className="timeline"><h4>Status history</h4>{complaint.history.map((entry, index) => <div className="timeline-item" key={`${entry.status}-${index}`}><span /><div><b>{STATUS_LABEL[entry.status]}</b><small>{formatDate(entry.changedAt)}{entry.changedBy?.name ? ` · ${entry.changedBy.name}` : ''}</small>{entry.notes && <p>{entry.notes}</p>}</div></div>)}</div>
            {complaint.resolutionNotes && <div className="resolution-note"><small>Resolution</small><p>{complaint.resolutionNotes}</p></div>}
          </div>
        )}
      </section>
    </div>
  );
}

