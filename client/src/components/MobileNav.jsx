import { NavLink } from 'react-router-dom';
import { Compass, Home, MessageCircle, Plus, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function MobileNav() {
  const { user } = useAuth();
  return (
    <nav className="mobile-nav" aria-label="Mobile">
      <div className="mobile-nav-inner">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
          <Home size={20} />
          <span>Home</span>
        </NavLink>
        <NavLink to="/events" className={({ isActive }) => (isActive ? 'active' : '')}>
          <Compass size={20} />
          <span>Explore</span>
        </NavLink>
        <NavLink to="/events/new" className="accent" aria-label="Create event">
          <Plus size={22} />
          <span>Create</span>
        </NavLink>
        <NavLink to="/chat" className={({ isActive }) => (isActive ? 'active' : '')}>
          <MessageCircle size={20} />
          <span>Chat</span>
        </NavLink>
        <NavLink
          to={user ? `/u/${user.username}` : '/login'}
          className={({ isActive }) => (isActive ? 'active' : '')}
        >
          <User size={20} />
          <span>Profile</span>
        </NavLink>
      </div>
    </nav>
  );
}
