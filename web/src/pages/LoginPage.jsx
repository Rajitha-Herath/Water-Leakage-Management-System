import { useState } from 'react';
import { Droplets, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { errorMessage } from '../api/client.js';

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('oic@nwsdb.lk');
  const [password, setPassword] = useState('Admin@123');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (user) return <Navigate to="/dashboard" replace />;

  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { await login(email, password); navigate('/dashboard'); }
    catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  }

  return (
    <main className="login-page">
      <section className="login-visual"><div className="login-visual-content"><span className="brand-mark large"><Droplets /></span><p className="eyebrow light">National Water Supply & Drainage Board</p><h1>Every report.<br />Every repair.<br /><em>Visible.</em></h1><p>Live operational control for faster leakage response and accountable public service.</p><div className="live-pill"><span /> Operations system online</div></div><div className="water-rings" /></section>
      <section className="login-form-wrap"><form className="login-card" onSubmit={submit}><div className="login-mobile-brand"><Droplets /> NWSDB Leakage Operations</div><p className="eyebrow">Officer-in-Charge portal</p><h2>Welcome back</h2><p className="muted">Sign in to monitor and coordinate field response.</p>{error && <div className="alert error">{error}</div>}<label>Email address<div className="input-with-icon"><Mail size={18} /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div></label><label>Password<div className="input-with-icon"><LockKeyhole size={18} /><input type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required /><button type="button" onClick={() => setShow(!show)}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label><button className="primary wide" disabled={busy}>{busy ? <><span className="spinner small" /> Signing in...</> : 'Sign in to dashboard'}</button><small className="security-note">Authorized NWSDB staff access only. Activities are audited.</small></form>
      </section>
    </main>
  );
}

