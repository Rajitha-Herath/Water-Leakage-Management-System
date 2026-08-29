import { useCallback, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { AlertTriangle, CheckCircle2, Clock3, Droplet, Eye, RefreshCw, Search, SlidersHorizontal } from 'lucide-react';
import { API_BASE_URL, api, errorMessage } from '../api/client.js';
import { formatDate } from '../utils.js';
import KpiCard from '../components/KpiCard.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import MapPanel from '../components/MapPanel.jsx';
import ComplaintModal from '../components/ComplaintModal.jsx';

const emptyFilters = { q: '', status: '', source: '', officer: '', from: '', to: '' };

export default function DashboardPage() {
  const [complaints, setComplaints] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [filters, setFilters] = useState(emptyFilters);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const query = useMemo(() => Object.fromEntries(Object.entries(filters).filter(([, value]) => value)), [filters]);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [complaintResult, officerResult, summaryResult] = await Promise.all([
        api.get('/complaints', { params: { ...query, limit: 100 } }),
        api.get('/users', { params: { role: 'OFFICER', active: true } }),
        api.get('/reports/summary', { params: { from: filters.from || undefined, to: filters.to || undefined } })
      ]);
      setComplaints(complaintResult.data.complaints);
      setOfficers(officerResult.data.users);
      setSummary(summaryResult.data.summary);
      setLastUpdated(new Date());
    } catch (err) { setError(errorMessage(err)); }
    finally { setLoading(false); }
  }, [query, filters.from, filters.to]);

  useEffect(() => { const timer = setTimeout(load, 250); return () => clearTimeout(timer); }, [load]);
  useEffect(() => {
    const socket = io(API_BASE_URL.replace(/\/api$/, ''), {
      transports: ['websocket', 'polling'],
      auth: { token: localStorage.getItem('nwsdb_token') }
    });
    const refresh = () => load();
    socket.on('complaint:created', refresh);
    socket.on('complaint:updated', refresh);
    socket.on('complaint:photo', refresh);
    return () => socket.disconnect();
  }, [load]);

  return (
    <div className="page">
      <div className="page-header"><div><p className="eyebrow">Live operational picture</p><h1>Complaint command centre</h1><p>Monitor incoming reports, deploy officers, and track every repair.</p></div><div className="header-actions"><span className="last-updated"><i /> Live{lastUpdated && ` · ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}</span><button className="secondary" onClick={load}><RefreshCw size={17} /> Refresh</button></div></div>
      {error && <div className="alert error">{error}</div>}
      <section className="kpi-grid">
        <KpiCard label="Total complaints" value={summary?.kpis.total ?? '-'} hint="Selected period" icon={Droplet} />
        <KpiCard label="New / unassigned" value={summary?.statuses.New ?? '-'} hint="Requires action" icon={AlertTriangle} tone="amber" />
        <KpiCard label="Active field work" value={summary?.kpis.active ?? '-'} hint="All unresolved" icon={Clock3} tone="blue" />
        <KpiCard label="Resolution rate" value={summary ? `${summary.kpis.resolutionRate}%` : '-'} hint={`${summary?.kpis.resolved ?? 0} resolved`} icon={CheckCircle2} tone="purple" />
      </section>
      <section className="dashboard-split">
        <article className="panel map-panel"><div className="panel-head"><div><p className="eyebrow">Geographic view</p><h2>Leak locations</h2></div><span>{complaints.length} shown</span></div><MapPanel complaints={complaints} /></article>
        <article className="panel status-panel"><div className="panel-head"><div><p className="eyebrow">Workload</p></div></div><div className="status-summary">{['New', 'Assigned', 'Reached', 'In_Progress', 'Resolved'].map((status) => { const count = summary?.statuses[status] ?? 0; const total = summary?.kpis.total || 1; return <div key={status}><div><StatusBadge status={status} /><b>{count}</b></div><span><i style={{ width: `${(count / total) * 100}%` }} /></span></div>; })}</div></article>
      </section>
      <section className="panel table-panel">
        <div className="panel-head table-title"><div><p className="eyebrow">Complaint register</p><h2>All leakage reports</h2></div><button className="text-button" onClick={() => setFilters(emptyFilters)}>Clear filters</button></div>
        <div className="filters">
          <div className="search-box"><Search size={17} /><input placeholder="Search ID, address, phone..." value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} /></div>
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="">All statuses</option>{['New', 'Assigned', 'Reached', 'In_Progress', 'Resolved'].map((status) => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}</select>
          <select value={filters.source} onChange={(e) => setFilters({ ...filters, source: e.target.value })}><option value="">All sources</option><option value="whatsapp">WhatsApp</option><option value="manual">Manual</option></select>
          <select value={filters.officer} onChange={(e) => setFilters({ ...filters, officer: e.target.value })}><option value="">All officers</option>{officers.map((officer) => <option value={officer.id} key={officer.id}>{officer.name}</option>)}</select>
          <label className="date-filter"><span>From</span><input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} /></label>
          <label className="date-filter"><span>To</span><input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} /></label>
        </div>
        <div className="table-wrap">
          <table><thead><tr><th>Complaint</th><th>Received</th><th>Area</th><th>Priority</th><th>Status</th><th>Assigned officer</th><th>Source</th><th aria-label="Actions" /></tr></thead><tbody>
            {complaints.map((item) => <tr key={item._id}><td><b>{item.publicId}</b><small>{item.description}</small></td><td>{formatDate(item.receivedAt)}</td><td>{item.area}</td><td><span className={`priority priority-${item.priority.toLowerCase()}`}>{item.priority}</span></td><td><StatusBadge status={item.status} /></td><td>{item.assignedOfficer ? <><b>{item.assignedOfficer.name}</b><small>{item.assignedOfficer.officerId}</small></> : <span className="unassigned">Unassigned</span>}</td><td><span className={`source source-${item.source}`}>{item.source}</span></td><td><button className="icon-button" onClick={() => setSelected(item._id)} title="View details"><Eye size={18} /></button></td></tr>)}
            {!loading && !complaints.length && <tr><td colSpan="8"><div className="empty-state"><SlidersHorizontal /><b>No complaints match these filters</b><span>Change or clear the filters to see more results.</span></div></td></tr>}
            {loading && <tr><td colSpan="8"><div className="table-loading"><span className="spinner" /> Loading complaints...</div></td></tr>}
          </tbody></table>
        </div>
      </section>
      {selected && <ComplaintModal complaintId={selected} officers={officers} onClose={() => setSelected(null)} onChanged={load} />}
    </div>
  );
}
