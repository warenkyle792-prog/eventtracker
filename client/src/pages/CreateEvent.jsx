import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ImagePlus, Sparkles, CalendarPlus, Upload, Link2, MapPin, Ticket, Users, Type, AlignLeft,
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import EventCard from '../components/EventCard';
import { Spinner } from '../components/UI';

const emptyForm = {
  title: '', tagline: '', description: '', category_id: '',
  venue: '', city: '', country: '', starts_at: '', ends_at: '',
  price: '', currency: 'USD', capacity: '', image_url: '', tags: '',
};

export default function CreateEvent() {
  const { id: editId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [form, setForm] = useState(emptyForm);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(Boolean(editId));

  useEffect(() => {
    api.get('/categories').then((d) => setCategories(d.categories)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!editId) return;
    (async () => {
      try {
        const { event } = await api.get(`/events/${editId}`);
        if (user && event.host_id !== user.id) {
          toast('Only the host can edit this event', 'error');
          navigate(`/events/${editId}`);
          return;
        }
        setForm({
          title: event.title, tagline: event.tagline || '', description: event.description,
          category_id: String(event.category_id), venue: event.venue || '', city: event.city || '',
          country: event.country || '',
          starts_at: event.starts_at ? event.starts_at.replace(' ', 'T').slice(0, 16) : '',
          ends_at: event.ends_at ? event.ends_at.replace(' ', 'T').slice(0, 16) : '',
          price: event.price_cents ? String(event.price_cents / 100) : '',
          currency: event.currency || 'USD', capacity: event.capacity ? String(event.capacity) : '',
          image_url: event.image_url || '', tags: (event.tags || []).join(', '),
        });
      } catch {
        toast('Could not load this event', 'error');
        navigate('/events');
      } finally {
        setLoadingEdit(false);
      }
    })();
  }, [editId, user, navigate, toast]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const previewEvent = useMemo(() => {
    const cat = categories.find((c) => String(c.id) === String(form.category_id));
    return {
      id: 0,
      title: form.title || 'Your amazing event title',
      tagline: form.tagline,
      category_name: cat?.name || 'Category',
      starts_at: form.starts_at ? form.starts_at.replace('T', ' ') : new Date().toISOString(),
      city: form.city || 'Your city',
      venue: form.venue,
      price_cents: form.price ? Math.round(Number(form.price) * 100) : 0,
      currency: form.currency,
      going_count: 0,
      attendees: [],
      image_url: form.image_url || '/uploads/covers/cover-2-tech.svg',
      is_saved: false,
    };
  }, [form, categories]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.upload('/uploads?kind=cover', fd);
      setForm((f) => ({ ...f, image_url: res.url }));
      toast('Cover image uploaded', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.title.trim() || !form.description.trim() || !form.category_id || !form.starts_at) {
      setError('Please fill in title, category, description and the start date.');
      return;
    }
    setBusy(true);
    const payload = {
      title: form.title,
      tagline: form.tagline,
      description: form.description,
      category_id: Number(form.category_id),
      venue: form.venue,
      city: form.city,
      country: form.country,
      starts_at: form.starts_at,
      ends_at: form.ends_at,
      price: Number(form.price) || 0,
      currency: form.currency,
      capacity: Number(form.capacity) || 0,
      image_url: form.image_url,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
    };
    try {
      const res = editId
        ? await api.put(`/events/${editId}`, payload)
        : await api.post('/events', payload);
      toast(editId ? 'Event updated' : 'Event created 🎉', 'success');
      navigate(`/events/${res.event.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (authLoading || loadingEdit) return <div className="page"><Spinner label="Preparing the stage…" /></div>;

  return (
    <div className="page">
      <div className="container">
        <div className="section-head">
          <div>
            <h2 style={{ fontSize: 'clamp(1.9rem, 3.5vw, 2.5rem)' }}>
              {editId ? 'Edit your event' : <>Create an <span className="text-gradient">event</span></>}
            </h2>
            <p className="sub">
              {editId
                ? 'Tweak the details — your guests will see the update instantly.'
                : 'Fill in the details below. Your card on the right updates live as you type.'}
            </p>
          </div>
        </div>

        <div className="create-grid">
          <form className="glass" style={{ padding: 'var(--s-7)' }} onSubmit={submit}>
            {error && <div className="error-text mb-6">{error}</div>}

            <div className="form-grid">
              <div className="field full">
                <label className="field-label" htmlFor="f-title">
                  <Type size={14} style={{ verticalAlign: -2 }} /> Event title
                </label>
                <input id="f-title" className="input" placeholder="e.g. Neon Nights: Open-Air Festival"
                  value={form.title} onChange={set('title')} maxLength={140} required />
              </div>

              <div className="field full">
                <label className="field-label" htmlFor="f-tagline">Tagline</label>
                <input id="f-tagline" className="input" placeholder="A short, punchy one-liner"
                  value={form.tagline} onChange={set('tagline')} maxLength={200} />
              </div>

              <div className="field">
                <label className="field-label" htmlFor="f-cat">Category</label>
                <select id="f-cat" className="select" value={form.category_id} onChange={set('category_id')} required>
                  <option value="">Choose a category…</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label className="field-label" htmlFor="f-tags">Tags</label>
                <input id="f-tags" className="input" placeholder="music, outdoor, summer (comma-separated)"
                  value={form.tags} onChange={set('tags')} />
              </div>

              <div className="field full">
                <label className="field-label" htmlFor="f-desc">
                  <AlignLeft size={14} style={{ verticalAlign: -2 }} /> Description
                </label>
                <textarea id="f-desc" className="textarea" placeholder="What should guests expect? Paint the picture…"
                  value={form.description} onChange={set('description')} required />
              </div>

              <div className="field">
                <label className="field-label" htmlFor="f-start">Starts</label>
                <input id="f-start" type="datetime-local" className="input"
                  value={form.starts_at} onChange={set('starts_at')} required />
              </div>

              <div className="field">
                <label className="field-label" htmlFor="f-end">Ends (optional)</label>
                <input id="f-end" type="datetime-local" className="input"
                  value={form.ends_at} onChange={set('ends_at')} />
              </div>

              <div className="field">
                <label className="field-label" htmlFor="f-venue">
                  <MapPin size={14} style={{ verticalAlign: -2 }} /> Venue
                </label>
                <input id="f-venue" className="input" placeholder="Venue name"
                  value={form.venue} onChange={set('venue')} />
              </div>

              <div className="field">
                <label className="field-label" htmlFor="f-city">City</label>
                <input id="f-city" className="input" placeholder="e.g. Nairobi"
                  value={form.city} onChange={set('city')} />
              </div>

              <div className="field">
                <label className="field-label" htmlFor="f-country">Country</label>
                <input id="f-country" className="input" placeholder="e.g. Kenya"
                  value={form.country} onChange={set('country')} />
              </div>

              <div className="field">
                <label className="field-label" htmlFor="f-cap">
                  <Users size={14} style={{ verticalAlign: -2 }} /> Capacity (0 = unlimited)
                </label>
                <input id="f-cap" type="number" min="0" className="input" placeholder="100"
                  value={form.capacity} onChange={set('capacity')} />
              </div>

              <div className="field">
                <label className="field-label" htmlFor="f-price">
                  <Ticket size={14} style={{ verticalAlign: -2 }} /> Price (USD, 0 = free)
                </label>
                <input id="f-price" type="number" min="0" step="0.01" className="input" placeholder="0.00"
                  value={form.price} onChange={set('price')} />
              </div>

              <div className="field">
                <label className="field-label" htmlFor="f-currency">Currency</label>
                <select id="f-currency" className="select" value={form.currency} onChange={set('currency')}>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="KES">KES</option>
                </select>
              </div>

              <div className="field full">
                <label className="field-label" htmlFor="f-image">
                  <ImagePlus size={14} style={{ verticalAlign: -2 }} /> Cover image URL
                </label>
                <div className="input-with-icon">
                  <span className="ii-icon"><Link2 size={16} /></span>
                  <input id="f-image" className="input" placeholder="https://… (or upload below)"
                    value={form.image_url} onChange={set('image_url')} />
                </div>
                <div className="upload-zone mt-3">
                  {form.image_url ? (
                    <img src={form.image_url} alt="Cover preview"
                      onError={(e) => { e.currentTarget.src = '/uploads/covers/cover-2-tech.svg'; }} />
                  ) : (
                    <span className="meta-icon"><ImagePlus size={19} /></span>
                  )}
                  <div className="hint">
                    <strong>Upload a cover</strong> — JPG, PNG or WEBP up to 8 MB.
                    Leave empty and we’ll use a stylish default.
                  </div>
                  <label className="btn btn-glass btn-sm" style={{ marginLeft: 'auto' }}>
                    <Upload size={15} /> {uploading ? 'Uploading…' : 'Choose file'}
                    <input type="file" accept="image/*" hidden onChange={handleUpload} disabled={uploading} />
                  </label>
                </div>
              </div>
            </div>

            <div className="flex wrap mt-6" style={{ gap: 14 }}>
              <button className="btn btn-primary btn-lg" type="submit" disabled={busy || uploading}>
                <CalendarPlus size={18} />
                {busy ? 'Saving…' : editId ? 'Save changes' : 'Publish event'}
              </button>
              <Link to={editId ? `/events/${editId}` : '/events'} className="btn btn-ghost btn-lg">
                Cancel
              </Link>
            </div>
          </form>

          <aside className="preview-panel">
            <div className="preview-label flex" style={{ gap: 8 }}>
              <Sparkles size={14} /> Live preview
            </div>
            <EventCard event={previewEvent} compact />
            <div className="glass" style={{ padding: 'var(--s-5)' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: 10 }}>Tips for a great listing</h3>
              <ul className="dim" style={{ fontSize: '0.88rem', lineHeight: 1.9, listStyle: 'none', padding: 0 }}>
                <li>• Use a vivid title — “Sunset Rooftop Jazz” beats “Concert”.</li>
                <li>• Set an accurate capacity to create healthy urgency.</li>
                <li>• Add 3–5 tags so search can find you.</li>
                <li>• Cover images with faces or landscapes perform best.</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
