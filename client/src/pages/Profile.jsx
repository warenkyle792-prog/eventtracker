import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  MapPin, CalendarDays, UserPlus, MessageCircle, Settings2, Pencil, Bookmark, Send,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Avatar, EmptyState, Modal, Spinner } from '../components/UI';
import EventCard from '../components/EventCard';
import { timeAgo } from '../utils/format';

export default function Profile() {
  const { username } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user: me, refreshUser, setUser } = useAuth();
  const { toast } = useToast();

  const tab = searchParams.get('tab') || 'hosting';
  const [profile, setProfile] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', bio: '', location: '', avatar_url: '' });
  const [busy, setBusy] = useState(false);

  const isMe = me && profile && me.id === profile.id;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, e] = await Promise.all([
        api.get(`/users/${username}`),
        api.get(`/users/${username}/events?tab=${tab}`),
      ]);
      setProfile(p.user);
      setEvents(e.events || []);
      setEditForm({ name: p.user.name, bio: p.user.bio || '', location: p.user.location || '', avatar_url: p.user.avatar_url || '' });
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [username, tab]);

  useEffect(() => {
    load();
  }, [load]);

  const setTab = (t) => {
    const next = new URLSearchParams(searchParams);
    if (t === 'hosting') next.delete('tab');
    else next.set('tab', t);
    setSearchParams(next, { replace: true });
  };

  const handleFollow = async () => {
    if (!me) {
      toast('Sign in to follow hosts', 'info');
      navigate('/login');
      return;
    }
    try {
      const res = await api.post(`/users/${username}/follow`);
      setProfile((p) => ({ ...p, is_following: res.is_following, stats: res.stats }));
      toast(res.is_following ? `Following ${profile.name}` : 'Unfollowed', 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const message = async () => {
    if (!me) {
      navigate('/login');
      return;
    }
    try {
      const res = await api.post('/conversations', { participantId: profile.id });
      navigate(`/chat?c=${res.conversation.id}`);
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.put('/users/me', editForm);
      setUser(res.user);
      await refreshUser();
      setProfile(res.user);
      setEditOpen(false);
      toast('Profile updated', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleUploadAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.upload('/uploads?kind=avatar', fd);
      setEditForm((f) => ({ ...f, avatar_url: res.url }));
      toast('Avatar uploaded', 'success');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const patchSave = (id, is_saved) => {
    setEvents((list) => list.map((ev) => (ev.id === id ? { ...ev, is_saved } : ev)));
  };

  if (loading) return <div className="page"><Spinner label="Loading profile…" /></div>;
  if (!profile) {
    return (
      <div className="page">
        <EmptyState
          icon={<Settings2 size={34} />}
          title="Profile not found"
          text="This person may have left the platform or the username is incorrect."
          action={<Link to="/" className="btn btn-primary">Back to Discover</Link>}
        />
      </div>
    );
  }

  const tabs = [
    { key: 'hosting', label: 'Hosting', count: profile.stats?.events },
    { key: 'attending', label: 'Attending', count: profile.stats?.attending },
    ...(isMe ? [{ key: 'saved', label: 'Saved', count: null }] : []),
  ];

  return (
    <div className="page">
      <div className="container">
        <div className="profile-cover">
          {profile.cover_url ? (
            <img src={profile.cover_url} alt="" />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              background: 'var(--grad-accent)',
            }} />
          )}
          <div className="veil" />
        </div>

        <div className="profile-head">
          <div className="profile-head-row">
            <div style={{ marginTop: -54, zIndex: 2, position: 'relative' }}>
              <Avatar user={profile} size="xl" />
            </div>
            <div className="who">
              <h1>{profile.name}</h1>
              <div className="handle">@{profile.username}</div>
            </div>
            <div className="profile-actions">
              {isMe ? (
                <>
                  <button className="btn btn-glass" onClick={() => setEditOpen(true)}>
                    <Pencil size={16} /> Edit profile
                  </button>
                  <Link to="/events/new" className="btn btn-primary">
                    <Send size={16} /> Create event
                  </Link>
                </>
              ) : (
                <>
                  <button
                    className={`btn ${profile.is_following ? 'btn-glass' : 'btn-primary'}`}
                    onClick={handleFollow}
                  >
                    <UserPlus size={16} />
                    {profile.is_following ? 'Following ✓' : 'Follow'}
                  </button>
                  <button className="btn btn-glass" onClick={message}>
                    <MessageCircle size={16} /> Message
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="profile-stats">
            <div className="stat">
              <div className="num">{profile.stats?.events ?? 0}</div>
              <div className="lbl">Events hosted</div>
            </div>
            <div className="stat">
              <div className="num">{profile.stats?.followers ?? 0}</div>
              <div className="lbl">Followers</div>
            </div>
            <div className="stat">
              <div className="num">{profile.stats?.following ?? 0}</div>
              <div className="lbl">Following</div>
            </div>
            <div className="stat">
              <div className="num">{profile.stats?.attending ?? 0}</div>
              <div className="lbl">Attending</div>
            </div>
          </div>

          {profile.bio && <p className="profile-bio">{profile.bio}</p>}

          <div className="profile-meta-row">
            {profile.location && (
              <span><MapPin size={15} /> {profile.location}</span>
            )}
            <span><CalendarDays size={15} /> Joined {timeAgo(profile.created_at)}</span>
          </div>
        </div>

        <div className="tabs" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              className={`tab ${tab === t.key ? 'active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.key === 'saved' && <Bookmark size={15} />}
              {t.label}
              {t.count != null && <span className="dim">· {t.count}</span>}
            </button>
          ))}
        </div>

        {events.length > 0 ? (
          <div className="grid-events">
            {events.map((ev) => (
              <EventCard key={ev.id} event={ev} onSave={patchSave} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<CalendarDays size={34} />}
            title={
              tab === 'hosting' ? 'No events hosted yet'
              : tab === 'attending' ? 'Not attending anything yet'
              : 'Nothing saved yet'
            }
            text={
              tab === 'saved'
                ? 'Tap the bookmark on any event to keep it here for later.'
                : 'Events will appear here as soon as they are created.'
            }
            action={isMe ? <Link to="/events/new" className="btn btn-primary">Create an event</Link> : null}
          />
        )}
      </div>

      {/* Edit profile modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit profile">
        <form onSubmit={saveProfile} className="flex-col" style={{ gap: 'var(--s-5)' }}>
          <div className="flex" style={{ gap: 'var(--s-4)' }}>
            <Avatar src={editForm.avatar_url} user={{ name: editForm.name }} size="lg" />
            <div>
              <label className="btn btn-glass btn-sm">
                Upload avatar
                <input type="file" accept="image/*" hidden onChange={handleUploadAvatar} />
              </label>
              <div className="field-hint mt-2">JPG / PNG, up to 8 MB</div>
            </div>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="p-name">Name</label>
            <input id="p-name" className="input" value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="p-bio">Bio</label>
            <textarea id="p-bio" className="textarea" style={{ minHeight: 90 }}
              value={editForm.bio} placeholder="Tell people what you’re about…"
              onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="p-loc">Location</label>
            <input id="p-loc" className="input" value={editForm.location} placeholder="City, Country"
              onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="p-avatar">Avatar URL</label>
            <input id="p-avatar" className="input" value={editForm.avatar_url} placeholder="https://…"
              onChange={(e) => setEditForm({ ...editForm, avatar_url: e.target.value })} />
          </div>

          <div className="flex" style={{ gap: 12 }}>
            <button className="btn btn-primary" disabled={busy}>
              {busy ? 'Saving…' : 'Save changes'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setEditOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
