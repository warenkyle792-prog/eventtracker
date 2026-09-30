import { Link, useNavigate } from 'react-router-dom';
import { Bookmark, MapPin, Clock, Users } from 'lucide-react';
import { monthDay, formatPrice, formatTime, formatDate } from '../utils/format';
import { AvatarStack } from './UI';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function EventCard({ event, onSave, compact = false }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { mon, day } = monthDay(event.starts_at);

  const handleSave = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast('Sign in to save events', 'info');
      navigate('/login');
      return;
    }
    try {
      const res = await api.post(`/events/${event.id}/save`);
      onSave?.(event.id, res.is_saved);
      toast(res.is_saved ? 'Saved to your collection' : 'Removed from saved', 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <article className="event-card">
      <Link to={`/events/${event.id}`} className="event-card-img" aria-label={event.title}>
        <img
          src={event.image_url || '/uploads/covers/cover-1-music.svg'}
          alt=""
          loading="lazy"
          onError={(e) => { e.currentTarget.src = '/uploads/covers/cover-1-music.svg'; }}
        />
        <div className="date-chip">
          <span className="mon">{mon}</span>
          <span className="day">{day}</span>
        </div>
        <button
          className={`save-btn ${event.is_saved ? 'saved' : ''}`}
          onClick={handleSave}
          aria-label={event.is_saved ? 'Remove from saved' : 'Save event'}
        >
          <Bookmark size={17} fill={event.is_saved ? 'currentColor' : 'none'} />
        </button>
        <span className="badge cat-badge">{event.category_name}</span>
      </Link>

      <div className="event-card-body">
        <div className="event-card-meta">
          <span className="flex" style={{ gap: 6 }}>
            <Clock size={14} /> {formatDate(event.starts_at)} · {formatTime(event.starts_at)}
          </span>
          {(event.city || event.venue) && (
            <>
              <span className="dot-sep" />
              <span className="flex" style={{ gap: 6 }}>
                <MapPin size={14} /> {event.city || event.venue}
              </span>
            </>
          )}
        </div>

        <h3 className="event-card-title">
          <Link to={`/events/${event.id}`}>{event.title}</Link>
        </h3>
        {!compact && event.tagline && <p className="event-card-tagline">{event.tagline}</p>}

        <div className="event-card-footer">
          <div className="flex" style={{ gap: 8, minWidth: 0 }}>
            <AvatarStack users={event.attendees || []} total={event.going_count} max={3} />
            <span
              className="dim"
              style={{ fontSize: '0.82rem', fontWeight: 600, whiteSpace: 'nowrap' }}
            >
              <Users size={13} style={{ verticalAlign: -2 }} /> {event.going_count || 0} going
            </span>
          </div>
          <span className={`event-card-price ${!event.price_cents ? 'free' : ''}`}>
            {formatPrice(event.price_cents, event.currency)}
          </span>
        </div>
      </div>
    </article>
  );
}
