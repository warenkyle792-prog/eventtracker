import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Calendar, Compass, MessageCircle, PlusCircle, User, LogOut, Bookmark,
  ChevronDown, Menu, X, Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Avatar } from './UI';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate('/');
  };

  const links = [
    { to: '/', label: 'Discover', icon: <Sparkles size={18} /> },
    { to: '/events', label: 'Events', icon: <Compass size={18} /> },
    { to: '/chat', label: 'Chat', icon: <MessageCircle size={18} /> },
  ];

  return (
    <>
      <header className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="container">
          <Link to="/" className="brand" aria-label="EventTracker home">
            <span className="brand-mark">
              <Calendar size={20} />
            </span>
            EventTracker
          </Link>

          <nav className="nav-links" aria-label="Primary">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                {l.label}
              </NavLink>
            ))}
            <NavLink
              to="/events/new"
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            >
              Create
            </NavLink>
          </nav>

          <div className="nav-right">
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
              title="Toggle theme"
            >
              {theme === 'light' ? '☾ Night' : '☀ Lumos'}
            </button>

            {user ? (
              <>
                <Link to="/events/new" className="btn btn-primary btn-sm nav-create">
                  <PlusCircle size={16} /> Create
                </Link>
                <div className="user-menu" ref={menuRef}>
                  <button
                    className="user-menu-trigger"
                    onClick={() => setMenuOpen((o) => !o)}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                  >
                    <Avatar user={user} size="sm" />
                    <ChevronDown size={15} />
                  </button>
                  {menuOpen && (
                    <div className="user-menu-card" role="menu">
                      <Link to={`/u/${user.username}`} className="menu-item" role="menuitem">
                        <User size={17} /> Profile
                      </Link>
                      <Link to={`/u/${user.username}?tab=saved`} className="menu-item" role="menuitem">
                        <Bookmark size={17} /> Saved events
                      </Link>
                      <Link to="/chat" className="menu-item" role="menuitem">
                        <MessageCircle size={17} /> Messages
                      </Link>
                      <div className="menu-sep" />
                      <button className="menu-item" onClick={handleLogout} role="menuitem">
                        <LogOut size={17} /> Sign out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-ghost btn-sm">Sign in</Link>
                <Link to="/register" className="btn btn-primary btn-sm">Get started</Link>
              </>
            )}

            <button
              className="btn btn-icon btn-ghost mobile-only-btn"
              onClick={() => setDrawerOpen((o) => !o)}
              aria-label="Open menu"
            >
              {drawerOpen ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>
        </div>
      </header>

      {drawerOpen && (
        <>
          <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)} />
          <div className="drawer" role="menu">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.to === '/'} className="nav-link">
                {l.icon} {l.label}
              </NavLink>
            ))}
            <NavLink to="/events/new" className="nav-link">
              <PlusCircle size={18} /> Create event
            </NavLink>
            {user ? (
              <>
                <NavLink to={`/u/${user.username}`} className="nav-link">
                  <User size={18} /> Profile
                </NavLink>
                <button className="menu-item" onClick={handleLogout}>
                  <LogOut size={18} /> Sign out
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className="nav-link"><User size={18} /> Sign in</NavLink>
                <NavLink to="/register" className="nav-link"><Sparkles size={18} /> Get started</NavLink>
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}
