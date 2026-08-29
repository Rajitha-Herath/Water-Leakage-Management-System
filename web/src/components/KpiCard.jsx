export default function KpiCard({ label, value, hint, icon: Icon, tone = 'green' }) {
  return (
    <article className="kpi-card">
      <span className={`kpi-icon tone-${tone}`}><Icon size={22} /></span>
      <div><small>{label}</small><strong>{value}</strong>{hint && <span>{hint}</span>}</div>
    </article>
  );
}

