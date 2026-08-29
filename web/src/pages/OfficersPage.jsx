import { useCallback, useEffect, useState } from 'react';
import {
  Eye,
  EyeOff,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react';
import { api, errorMessage } from '../api/client.js';

const blank = {
  officerId: '',
  name: '',
  email: '',
  phone: '',
  password: '',
  role: 'OFFICER',
};

export default function OfficersPage() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(blank);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [visiblePasswords, setVisiblePasswords] = useState({});

  // Holds newly created passwords only until this page is refreshed.
  // Existing passwords must never be returned by the server.
  const [temporaryPasswords, setTemporaryPasswords] = useState({});

  const load = useCallback(async () => {
    setError('');

    try {
      const { data } = await api.get('/users');
      setUsers(data.users);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function create(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    const submittedForm = { ...form };

    try {
      await api.post('/users', submittedForm);

      setTemporaryPasswords((current) => ({
        ...current,
        [submittedForm.officerId.trim().toUpperCase()]: submittedForm.password,
      }));

      setForm(blank);
      setShowForm(false);
      setMessage('Officer account created successfully.');
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggle(user) {
    const operation = user.active ? 'Deactivate' : 'Activate';

    if (!window.confirm(`${operation} ${user.name}'s account?`)) {
      return;
    }

    setError('');
    setMessage('');

    try {
      await api.patch(`/users/${user.id}`, {
        active: !user.active,
      });

      setMessage(
        `Account ${user.active ? 'deactivated' : 'activated'} successfully.`
      );
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function deleteAccount(user) {
    const confirmed = window.confirm(
      `Permanently delete ${user.name}'s account?\n\nThis action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(user.id);
    setError('');
    setMessage('');

    try {
      await api.delete(`/users/${user.id}`);

      setTemporaryPasswords((current) => {
        const updated = { ...current };
        delete updated[user.officerId];
        return updated;
      });
      setVisiblePasswords((current) => {
        const updated = { ...current };
        delete updated[user.id];
        return updated;
      });

      setMessage(`${user.name}'s account was deleted successfully.`);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setDeletingId(null);
    }
  }

  const shown = users.filter((user) =>
    `${user.name} ${user.email} ${user.officerId} ${user.phone}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const officers = users.filter((user) => user.role === 'OFFICER');

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Identity and access</p>
          <h1>Officer accounts</h1>
          <p>Create staff logins, review workloads, and control access.</p>
        </div>

        <button
          type="button"
          className="primary"
          onClick={() => setShowForm((current) => !current)}
        >
          <Plus size={18} /> Add officer
        </button>
      </div>

      {error && <div className="alert error">{error}</div>}
      {message && <div className="alert success">{message}</div>}

      <section className="kpi-grid compact">
        <article className="mini-kpi">
          <span><Users /></span>
          <div>
            <strong>{officers.length}</strong>
            <small>Total field officers</small>
          </div>
        </article>

        <article className="mini-kpi">
          <span><UserCheck /></span>
          <div>
            <strong>{officers.filter((item) => item.active).length}</strong>
            <small>Active accounts</small>
          </div>
        </article>

        <article className="mini-kpi">
          <span><UserX /></span>
          <div>
            <strong>{officers.filter((item) => !item.active).length}</strong>
            <small>Inactive accounts</small>
          </div>
        </article>

        <article className="mini-kpi">
          <span><ShieldCheck /></span>
          <div>
            <strong>{users.filter((item) => item.role === 'OIC').length}</strong>
            <small>OIC accounts</small>
          </div>
        </article>
      </section>

      {showForm && (
        <section className="panel create-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">New staff identity</p>
              <h2>Create officer account</h2>
            </div>
          </div>

          <form className="user-form" onSubmit={create}>
            <label>
              Officer ID
              <input
                value={form.officerId}
                onChange={(event) =>
                  setForm({ ...form, officerId: event.target.value })
                }
                placeholder="EA003"
                required
              />
            </label>

            <label>
              Full name
              <input
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                required
              />
            </label>

            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm({ ...form, email: event.target.value })
                }
                required
              />
            </label>

            <label>
              Phone
              <input
                value={form.phone}
                onChange={(event) =>
                  setForm({ ...form, phone: event.target.value })
                }
                required
              />
            </label>

            <label>
              Temporary password
              <input
                type="password"
                minLength="8"
                value={form.password}
                onChange={(event) =>
                  setForm({ ...form, password: event.target.value })
                }
                required
              />
            </label>

            <div className="form-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setShowForm(false);
                  setForm(blank);
                }}
              >
                Cancel
              </button>

              <button type="submit" className="primary" disabled={saving}>
                {saving ? 'Creating...' : 'Create account'}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="panel table-panel">
        <div className="panel-head table-title">
          <div>
            <p className="eyebrow">Directory</p>
            <h2>System users</h2>
          </div>

          <button
            type="button"
            className="icon-button"
            onClick={load}
            aria-label="Refresh users"
          >
            <RefreshCw size={18} />
          </button>
        </div>

        <div className="filters officers-filter">
          <div className="search-box">
            <Search size={17} />
            <input
              placeholder="Search officers..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Officer</th>
                <th>Contact</th>
                <th>Password</th>
                <th>Role</th>
                <th>Active workload</th>
                <th>Status</th>
                <th>Action</th>
                <th>Delete</th>
              </tr>
            </thead>

            <tbody>
              {shown.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="person-cell">
                      <span className="avatar small-avatar">
                        {user.name
                          .split(' ')
                          .map((part) => part[0])
                          .slice(0, 2)
                          .join('')}
                      </span>
                      <span>
                        <b>{user.name}</b>
                        <small>{user.officerId}</small>
                      </span>
                    </div>
                  </td>

                  <td>
                    <b>{user.email}</b>
                    <small>{user.phone}</small>
                  </td>

                  <td>
                    <div className="password-cell">
                      <code className={visiblePasswords[user.id] ? 'temporary-password' : 'password-hidden'}>
                        {visiblePasswords[user.id] && temporaryPasswords[user.officerId]
                          ? temporaryPasswords[user.officerId]
                          : '••••••••'}
                      </code>
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() =>
                          setVisiblePasswords((current) => ({
                            ...current,
                            [user.id]: !current[user.id],
                          }))
                        }
                        disabled={!temporaryPasswords[user.officerId]}
                        aria-label={`${visiblePasswords[user.id] ? 'Hide' : 'Show'} ${user.name}'s temporary password`}
                        title={
                          temporaryPasswords[user.officerId]
                            ? `${visiblePasswords[user.id] ? 'Hide' : 'Show'} temporary password`
                            : 'Existing passwords are securely hashed and cannot be displayed'
                        }
                      >
                        {visiblePasswords[user.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </td>

                  <td><span className="role-badge">{user.role}</span></td>
                  <td><b>{user.activeComplaints}</b> active</td>

                  <td>
                    <span className={`account-state ${user.active ? 'active' : ''}`}>
                      <i /> {user.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>

                  <td>
                    <button
                      type="button"
                      className={user.active ? 'danger-text' : 'text-button'}
                      onClick={() => toggle(user)}
                    >
                      {user.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>

                  <td>
                    <button
                      type="button"
                      className="danger-text delete-account-button"
                      onClick={() => deleteAccount(user)}
                      disabled={deletingId === user.id}
                    >
                      <Trash2 size={15} />
                      {deletingId === user.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}

              {shown.length === 0 && (
                <tr>
                  <td colSpan="8" className="empty-table-message">
                    No user accounts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
