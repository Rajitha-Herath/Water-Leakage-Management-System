import { BarChart3, Droplets, LayoutDashboard, LogOut, Menu, Users, X } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

const navItems = [
  ['/dashboard', LayoutDashboard, 'Operations'],
  ['/officers', Users, 'Officers'],
  ['/reports', BarChart3, 'Reports']
];

export default function Layout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand"><span className="brand-mark"><Droplets size={24} /></span><div><b>NWSDB</b><small>Leakage Operations</small></div></div>
        <nav>
          {navItems.map(([to, Icon, label]) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)}><Icon size={19} /> {label}</NavLink>
          ))}
        </nav>
        <div className="sidebar-user">
          <div className="avatar">{user?.name?.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div>
          <div><b>{user?.name}</b><small>{user?.officerId} · {user?.role}</small></div>
          <button className="icon-button" onClick={logout} title="Sign out"><LogOut size={18} /></button>
        </div>
      </aside>
      {open && <button className="scrim" aria-label="Close menu" onClick={() => setOpen(false)} />}
      <main className="main-content">
        <header className="mobile-header">
          <button className="icon-button" onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
          <span>Leakage Operations</span>
        </header>
        <Outlet />
      </main>
    </div>
  );
}

