import { useEffect, useState, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Bookmark, Share2, Calendar, Clock, MapPin, Ticket, Users,
  MessageCircle, Tag, UserPlus, Sparkles, Send, Pencil, Trash2, Globe,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Avatar, AvatarStack, Spinner, EmptyState, SectionHead } from '../components/UI';
import EventCard from '../components/EventCard';
import { formatDate, formatTime, formatPrice, relativeDay, timeAgo, monthDay } from '../utils/format';

export default function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [event, setEvent] = useState(null);
  const [related, setRelated] = useState([]);
  const [comments, setComments] = useState([]);
  const [commentBody, setCommentBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [evData, relData, comData] = await Promise.all([
        api.get(`/events/${id}`),
        api.get(`/events/${id}/related`),
        api.get(`/events/${id}/comments`),
      ]);
      setEvent(evData.event);
      setRelated(relData.events);
      setComments(comData.comments);
    } catch {
      setEvent(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    load();
    window.scrollTo({ top: 0 });
  }, [load]);

  const requireAuth = () => {
    if (user) return true;
    toast('Please sign in first', 'info');
    navigate('/login');
    return false;
  };

  const handleRsvp = async (status) => {
    if (!requireAuth()) return;
    setBusy(true);
    try {
      const res = await api.post(`/events/${id}/rsvp`, { status: event.my_rsvp === status ? 'none' : status });
      setEvent((e) => ({
        ...e,
        my_rsvp: res.status === 'none' ? null : res.status,
        going_count: res.going_count,
        interested_count: res.interested_count,
      }));
      toast(res.status === 'none' ? 'RSVP removed' : res.status === 'going' ? "You're going! 🎉" : 'Marked as interested', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    if (!requireAuth()) return;
    try {
      const res = await api.post(`/events/${id}/save`);
      setEvent((e) => ({ ...e, is_saved: res.is_saved }));
      toast(res.is_saved ? 'Saved to your collection' : 'Removed from saved', 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: event.title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast('Link copied to clipboard', 'success');
      }
    } catch { /* user cancelled */ }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!requireAuth()) return;
    const body = commentBody.trim();
    if (!body) return;
    try {
      const res = await api.post(`/events/${id}/comments`, { body });
      setComments((c) => [res.comment, ...c]);
      setCommentBody('');
      toast('Comment posted', 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this event? This cannot be undone.')) return;
    try {
      await api.del(`/events/${id}`);
      toast('Event deleted', 'success');
      navigate('/events');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const messageHost = async () => {
    if (!requireAuth()) return;
    try {
      const res = await api.post('/conversations', { participantId: event.host_id });
      navigate(`/chat?c=${res.conversation.id}`);
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const openEventChat = async () => {
    if (!requireAuth()) return;
    try {
      const res = await api.post('/conversations', { eventId: event.id });
      navigate(`/chat?c=${res.conversation.id}`);
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  if (loading) return <div className="page"><Spinner label="Loading event…" /></div>;
  if (!event) {
    return (
      <div className="page">
        <EmptyState
          icon={<Calendar size={34} />}
          title="Event not found"
          text="This event may have been removed or the link is incorrect."
          action={<Link to="/events" className="btn btn-primary">Browse events</Link>}
        />
      </div>
    );
  }

  const isHost = user && user.id === event.host_id;
  const capacityPct = event.capacity
    ? Math.min(100, Math.round(((event.going_count || 0) / event.capacity) * 100))
    : 0;

  return (
    <div className="page">
      <div className="container">
        {/* ---------- Hero ---------- */}
        <div className="detail-hero">
          <img
            src={event.image_url || '/uploads/covers/cover-1-music.svg'}
            alt=""
            onError={(e) => { e.currentTarget.src = '/uploads/covers/cover-1-music.svg'; }}
          />
          <div className="veil" />
          <Link to="/events" className="back-float btn btn-glass btn-sm">
            <ArrowLeft size={16} /> Back
          </Link>
          <div className="actions-float">
            <button className="btn btn-glass btn-sm" onClick={handleShare}>
              <Share2 size={16} /> Share
            </button>
            <button className={`btn btn-sm ${event.is_saved ? 'btn-primary' : 'btn-glass'}`} onClick={handleSave}>
              <Bookmark size={16} fill={event.is_saved ? 'currentColor' : 'none'} />
              {event.is_saved ? 'Saved' : 'Save'}
            </button>
            {isHost && (
              <button className="btn btn-danger btn-sm" onClick={handleDelete}>
                <Trash2 size={16} /> Delete
              </button>
            )}
          </div>
          <div className="hero-content">
            <div className="flex wrap" style={{ gap: 10, marginBottom: 14 }}>
              <span className="badge badge-accent">{event.category_name}</span>
              <span className="badge">{relativeDay(event.starts_at)}</span>
              {event.price_cents === 0 && <span className="badge badge-free">Free entry</span>}
            </div>
            <h1>{event.title}</h1>
            {event.tagline && <p className="tagline">{event.tagline}</p>}
            <div className="hero-meta">
              <span className="badge"><Calendar size={14} /> {formatDate(event.starts_at, { year: true })}</span>
              <span className="badge"><Clock size={14} /> {formatTime(event.starts_at)}{event.ends_at ? ` – ${formatTime(event.ends_at)}` : ''}</span>
              {(event.venue || event.city) && (
                <span className="badge"><MapPin size={14} /> {[event.venue, event.city, event.country].filter(Boolean).join(', ')}</span>
              )}
              <span className="badge"><Ticket size={14} /> {formatPrice(event.price_cents, event.currency)}</span>
            </div>
          </div>
        </div>

        {/* ---------- Body ---------- */}
        <div className="detail-grid">
          <main>
            {/* Host */}
            <div className="glass host-card">
              <Avatar user={event.host} size="lg" />
              <div className="info">
                <div className="dim" style={{ fontSize: '0.82rem', fontWeight: 600 }}>HOSTED BY</div>
                <Link to={`/u/${event.host_username}`} className="name" style={{ display: 'block' }}>
                  {event.host_name}
                </Link>
                <div className="handle">
                  @{event.host_username} · {event.host?.stats?.events || 0} events · {event.host?.stats?.followers || 0} followers
                </div>
              </div>
              {isHost ? (
                <Link to={`/events/${event.id}/edit`} className="btn btn-glass btn-sm">
                  <Pencil size={15} /> Edit
                </Link>
              ) : (
                <button className="btn btn-glass btn-sm" onClick={messageHost}>
                  <MessageCircle size={15} /> Message
                </button>
              )}
            </div>

            {/* About */}
            <section className="section" style={{ marginTop: 'var(--s-7)' }}>
              <h2 style={{ fontSize: '1.45rem', marginBottom: 'var(--s-4)' }}>About this event</h2>
              <p className="about-text">{event.description}</p>
            </section>

            {/* Tags */}
            {event.tags?.length > 0 && (
              <section className="section" style={{ marginTop: 'var(--s-7)' }}>
                <h3 className="flex mb-4" style={{ fontSize: '1.12rem', gap: 8 }}>
                  <Tag size={18} /> Tags
                </h3>
                <div className="tag-row">
                  {event.tags.map((t) => (
                    <Link key={t} to={`/events?search=${encodeURIComponent(t)}`} className="pill">
                      #{t}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Attendees */}
            {event.attendees?.length > 0 && (
              <section className="section" style={{ marginTop: 'var(--s-7)' }}>
                <div className="glass detail-card">
                  <div className="flex-between wrap">
                    <div>
                      <h3 style={{ marginBottom: 6 }}>
                        <Users size={18} /> Who’s coming
                      </h3>
                      <p className="dim">{event.going_count} going · {event.interested_count} interested</p>
                    </div>
                    <AvatarStack users={event.attendees} total={event.going_count} max={6} />
                  </div>
                </div>
              </section>
            )}

            {/* Comments */}
            <section className="section" style={{ marginTop: 'var(--s-7)' }}>
              <h2 style={{ fontSize: '1.45rem' }}>
                Conversation <span className="dim" style={{ fontWeight: 600 }}>· {comments.length}</span>
              </h2>
              <form className="comment-form" onSubmit={handleComment}>
                {user && <Avatar user={user} />}
                <input
                  className="input"
                  placeholder={user ? 'Add to the conversation…' : 'Sign in to comment'}
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  onFocus={() => { if (!user) requireAuth(); }}
                />
                <button className="btn btn-primary" type="submit" disabled={!commentBody.trim()}>
                  <Send size={16} /> Post
                </button>
              </form>

              <div className="mt-6">
                {comments.length === 0 ? (
                  <p className="dim">Be the first to share your thoughts.</p>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className="comment">
                      <Avatar user={{ name: c.name, avatar_url: c.avatar_url }} />
                      <div className="body">
                        <div className="head">
                          <Link to={`/u/${c.username}`} className="who">{c.name}</Link>
                          <span className="when">{timeAgo(c.created_at)}</span>
                        </div>
                        <p className="text">{c.body}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Related */}
            {related.length > 0 && (
              <section className="section">
                <SectionHead title="You might also like" />
                <div className="grid-events">
                  {related.map((ev) => (
                    <EventCard key={ev.id} event={ev} />
                  ))}
                </div>
              </section>
            )}
          </main>

          {/* ---------- Sidebar ---------- */}
          <aside className="detail-side">
            <div className="glass detail-card">
              <h3><Calendar size={18} /> When</h3>
              <div className="meta-row">
                <span className="meta-icon"><Calendar size={19} /></span>
                <div>
                  <div className="lbl">Date</div>
                  <div className="val">{formatDate(event.starts_at, { year: true })}</div>
                </div>
              </div>
              <div className="meta-row">
                <span className="meta-icon"><Clock size={19} /></span>
                <div>
                  <div className="lbl">Time</div>
                  <div className="val">
                    {formatTime(event.starts_at)}
                    {event.ends_at && ` → ${formatTime(event.ends_at)}`}
                  </div>
                </div>
              </div>
              {(event.venue || event.city) && (
                <div className="meta-row">
                  <span className="meta-icon"><MapPin size={19} /></span>
                  <div>
                    <div className="lbl">Where</div>
                    <div className="val">{event.venue || event.city}</div>
                    <div className="dim" style={{ fontSize: '0.85rem' }}>
                      {[event.city, event.country].filter(Boolean).join(', ')}
                    </div>
                  </div>
                </div>
              )}
              <div className="meta-row">
                <span className="meta-icon"><Ticket size={19} /></span>
                <div>
                  <div className="lbl">Price</div>
                  <div className="val">{formatPrice(event.price_cents, event.currency)}</div>
                </div>
              </div>
            </div>

            <div className="glass detail-card">
              <h3><Sparkles size={18} /> Your spot</h3>
              {event.capacity > 0 && (
                <div className="mb-4">
                  <div className="flex-between" style={{ fontSize: '0.88rem', fontWeight: 600, marginBottom: 8 }}>
                    <span className="dim">{event.going_count} / {event.capacity} spots</span>
                    <span>{capacityPct}%</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${capacityPct}%` }} />
                  </div>
                </div>
              )}
              <div className="rsvp-stack">
                <button
                  className={`btn btn-lg ${event.my_rsvp === 'going' ? 'btn-primary' : 'btn-glass'}`}
                  onClick={() => handleRsvp('going')}
                  disabled={busy}
                >
                  <UserPlus size={18} /> {event.my_rsvp === 'going' ? "You're going ✓" : 'Attend event'}
                </button>
                <button
                  className={`btn ${event.my_rsvp === 'interested' ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => handleRsvp('interested')}
                  disabled={busy}
                >
                  <Bookmark size={16} /> {event.my_rsvp === 'interested' ? 'Interested ✓' : 'I’m interested'}
                </button>
                <button className="btn btn-ghost" onClick={openEventChat}>
                  <MessageCircle size={16} /> Event chat
                </button>
                <button className="btn btn-ghost" onClick={handleShare}>
                  <Share2 size={16} /> Share event
                </button>
              </div>
              <div className="flex mt-5" style={{ gap: 12 }}>
                <AvatarStack users={event.attendees || []} total={event.going_count} max={5} />
                <span className="dim" style={{ fontSize: '0.86rem', fontWeight: 600 }}>
                  {event.going_count > 0 ? `${event.going_count} people are going` : 'Be the first to RSVP'}
                </span>
              </div>
            </div>

            <div className="glass detail-card">
              <h3><Globe size={18} /> Organised by</h3>
              <div className="flex">
                <Avatar user={event.host} />
                <div>
                  <Link to={`/u/${event.host_username}`} style={{ fontWeight: 700 }}>
                    {event.host_name}
                  </Link>
                  <div className="dim" style={{ fontSize: '0.85rem' }}>{event.host?.location || `@${event.host_username}`}</div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
