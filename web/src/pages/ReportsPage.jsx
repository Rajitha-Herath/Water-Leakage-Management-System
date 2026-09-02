import { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  Clock3,
  Download,
  FileSpreadsheet,
  RefreshCw,
} from 'lucide-react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import { api, downloadAuthenticated, errorMessage } from '../api/client.js';
import KpiCard from '../components/KpiCard.jsx';

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  Legend
);

function localDate(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

// Include all complaints from the current year by default.
function defaultPeriod() {
  const now = new Date();
  const firstDayOfYear = new Date(now.getFullYear(), 0, 1);

  return {
    from: localDate(firstDayOfYear),
    to: localDate(now),
  };
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: { usePointStyle: true, boxWidth: 8 },
    },
  },
  scales: {
    y: { beginAtZero: true, ticks: { precision: 0 } },
  },
};

export default function ReportsPage() {
  const [period, setPeriod] = useState(defaultPeriod);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!period.from || !period.to) return;

    if (period.from > period.to) {
      setError('The From date cannot be after the To date.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data } = await api.get('/reports/summary', { params: period });
      setReport(data.summary);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  async function download(type) {
    if (!period.from || !period.to || period.from > period.to) {
      setError('Select a valid From and To date before downloading.');
      return;
    }

    setError('');

    try {
      const query = new URLSearchParams(period).toString();
      const isPdf = type === 'pdf';
      const path = `/reports/${isPdf ? 'monthly.pdf' : 'complaints.csv'}?${query}`;
      const filename = isPdf
        ? `NWSDB-report-${period.from}-to-${period.to}.pdf`
        : `complaints-${period.from}-to-${period.to}.csv`;

      await downloadAuthenticated(path, filename);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  const statusData = report && {
    labels: Object.keys(report.statuses).map((item) => item.replace('_', ' ')),
    datasets: [
      {
        data: Object.values(report.statuses),
        backgroundColor: ['#f97316', '#3b82f6', '#8b5cf6', '#eab308', '#10b981'],
        borderWidth: 0,
      },
    ],
  };

  const trendData = report && {
    labels: report.trend.map((item) => item._id.slice(5)),
    datasets: [
      {
        label: 'Received',
        data: report.trend.map((item) => item.total),
        borderColor: '#0b5d5d',
        backgroundColor: 'rgba(11, 90, 93, 0.12)',
        fill: true,
        tension: 0.35,
      },
      {
        label: 'Resolved',
        data: report.trend.map((item) => item.resolved),
        borderColor: '#38bdf8',
        backgroundColor: 'transparent',
        tension: 0.35,
      },
    ],
  };

  const areaData = report && {
    labels: report.areaBreakdown.map((item) => item._id || 'Unspecified'),
    datasets: [
      {
        label: 'Complaints',
        data: report.areaBreakdown.map((item) => item.total),
        backgroundColor: '#4c82e6',
        borderRadius: 7,
      },
    ],
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Evidence-based management</p>
          <h1>Reports and analytics</h1>
          <p>Measure complaint demand, response performance, and operational outcomes.</p>
        </div>

        <div className="header-actions">
          <button type="button" className="secondary" onClick={() => download('csv')}>
            <FileSpreadsheet size={17} /> Export CSV
          </button>
          <button type="button" className="primary" onClick={() => download('pdf')}>
            <Download size={17} /> Download PDF
          </button>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}

      <section className="panel report-controls">
        <label>
          Reporting period - from
          <input
            type="date"
            value={period.from}
            max={period.to}
            onChange={(event) => setPeriod({ ...period, from: event.target.value })}
          />
        </label>

        <label>
          To
          <input
            type="date"
            value={period.to}
            min={period.from}
            onChange={(event) => setPeriod({ ...period, to: event.target.value })}
          />
        </label>

        <button type="button" className="secondary" onClick={() => setPeriod(defaultPeriod())}>
          Current year
        </button>

        <button type="button" className="secondary" onClick={load} disabled={loading}>
          <RefreshCw size={17} /> {loading ? 'Calculating...' : 'Refresh analysis'}
        </button>
      </section>

      {loading && (
        <div className="full-loader inline">
          <span className="spinner" /> Calculating report...
        </div>
      )}

      {report && (
        <>
          <section className="kpi-grid">
            <KpiCard
              label="Complaints received"
              value={report.kpis.total}
              hint={`${period.from} to ${period.to}`}
              icon={BarChart3}
            />
            <KpiCard
              label="Resolved"
              value={report.kpis.resolved}
              hint={`${report.kpis.resolutionRate}% resolution rate`}
              icon={CheckCircle2}
              tone="blue"
            />
            <KpiCard
              label="Still active"
              value={report.kpis.active}
              hint="Requires monitoring"
              icon={Clock3}
              tone="amber"
            />
            <KpiCard
              label="Average resolution"
              value={`${report.kpis.averageResolutionHours}h`}
              hint="Received to resolved"
              icon={Clock3}
              tone="purple"
            />
          </section>

          <section className="charts-grid">
            <article className="panel chart-card">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Composition</p>
                  <h2>Status distribution</h2>
                </div>
              </div>
              <div className="chart small-chart">
                <Doughnut data={statusData} options={{ ...chartOptions, scales: undefined }} />
              </div>
            </article>

            <article className="panel chart-card wide-chart">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Daily movement</p>
                  <h2>Received versus resolved</h2>
                </div>
              </div>
              <div className="chart">
                <Line data={trendData} options={chartOptions} />
              </div>
            </article>

            <article className="panel chart-card wide-chart">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Demand hotspots</p>
                  <h2>Complaints by area</h2>
                </div>
              </div>
              <div className="chart">
                <Bar data={areaData} options={{ ...chartOptions, indexAxis: 'y' }} />
              </div>
            </article>

            <article className="panel officer-ranking">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Field delivery</p>
                  <h2>Officer performance</h2>
                </div>
              </div>

              {report.officerBreakdown.map((officer, index) => (
                <div className="rank-row" key={officer._id}>
                  <span>{index + 1}</span>
                  <div>
                    <b>{officer.name}</b>
                    <small>{officer.officerId}</small>
                  </div>
                  <p>
                    <b>{officer.resolved}</b> / {officer.total}
                    <small>resolved</small>
                  </p>
                </div>
              ))}

              {!report.officerBreakdown.length && (
                <p className="muted">No officer assignments in this period.</p>
              )}
            </article>
          </section>
        </>
      )}
    </div>
  );
}
