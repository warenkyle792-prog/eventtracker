import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, SlidersHorizontal, CalendarSearch, X } from 'lucide-react';
import { api } from '../api/client';
import EventCard from '../components/EventCard';
import { EmptyState, Spinner } from '../components/UI';

const WHEN_OPTIONS = [
  { value: '', label: 'Any date' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
];
const PRICE_OPTIONS = [
  { value: '', label: 'Any price' },
  { value: 'free', label: 'Free' },
  { value: 'paid', label: 'Paid' },
];
const SORT_OPTIONS = [
  { value: 'soon', label: 'Soonest first' },
  { value: 'popular', label: 'Most popular' },
  { value: 'new', label: 'Recently added' },
  { value: 'price_asc', label: 'Price: low to high' },
];

export default function Events() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';
  const when = searchParams.get('when') || '';
  const price = searchParams.get('price') || '';
  const sort = searchParams.get('sort') || 'soon';

  const [searchInput, setSearchInput] = useState(search);

  useEffect(() => {
    api.get('/categories').then((d) => setCategories(d.categories)).catch(() => {});
  }, []);

  const updateParam = useCallback((key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (category) params.set('category', category);
    if (when) params.set('when', when);
    if (price) params.set('price', price);
    if (sort) params.set('sort', sort);
    api.get(`/events?${params.toString()}`)
      .then((d) => alive && setResult(d))
      .catch(() => alive && setResult({ events: [], total: 0 }))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [search, category, when, price, sort]);

  const patchSave = (id, is_saved) => {
    setResult((r) => r && { ...r, events: r.events.map((ev) => (ev.id === id ? { ...ev, is_saved } : ev)) });
  };

  const clearAll = () => setSearchParams(new URLSearchParams(), { replace: true });
  const hasFilters = Boolean(search || category || when || price);

  return (
    <div className="page">
      <div className="container">
        <div className="section-head" style={{ marginBottom: 'var(--s-6)' }}>
          <div>
            <h2 style={{ fontSize: 'clamp(1.9rem, 3.5vw, 2.6rem)' }}>
              {category
                ? categories.find((c) => c.slug === category)?.name || 'Events'
                : 'Explore events'}
            </h2>
            <p className="sub">
              {loading ? 'Searching…' : `${result?.total || 0} events match your vibe.`}
            </p>
          </div>
        </div>

        {/* Filter bar */}
        <div className="glass filter-bar">
          <form
            className="input-with-icon"
            style={{ flex: 1, minWidth: 220 }}
            onSubmit={(e) => {
              e.preventDefault();
              updateParam('search', searchInput.trim());
            }}
          >
            <span className="ii-icon"><Search size={17} /></span>
            <input
              className="input"
              placeholder="Search by title, city, venue or tag…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              aria-label="Search events"
            />
          </form>
          <select className="select" value={when} onChange={(e) => updateParam('when', e.target.value)} aria-label="When">
            {WHEN_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select className="select" value={price} onChange={(e) => updateParam('price', e.target.value)} aria-label="Price">
            {PRICE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select className="select" value={sort} onChange={(e) => updateParam('sort', e.target.value)} aria-label="Sort">
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {hasFilters && (
            <button className="btn btn-ghost btn-sm" onClick={clearAll}>
              <X size={15} /> Clear
            </button>
          )}
        </div>

        {/* Category chips */}
        <div className="filter-chips mt-4">
          <button
            className={`pill ${!category ? 'active' : ''}`}
            onClick={() => updateParam('category', '')}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              className={`pill ${category === c.slug ? 'active' : ''}`}
              onClick={() => updateParam('category', category === c.slug ? '' : c.slug)}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {loading ? (
            <Spinner label="Finding events…" />
          ) : result?.events?.length ? (
            <>
              <div className="grid-events">
                {result.events.map((ev) => (
                  <EventCard key={ev.id} event={ev} onSave={patchSave} />
                ))}
              </div>
              {result.total > result.events.length && (
                <div className="flex" style={{ justifyContent: 'center', marginTop: 'var(--s-8)' }}>
                  <span className="dim">Showing {result.events.length} of {result.total}</span>
                </div>
              )}
            </>
          ) : (
            <EmptyState
              icon={<CalendarSearch size={34} />}
              title="No events found"
              text="Try a different search or loosen up the filters — your next favourite event is out there."
              action={
                <div className="flex" style={{ gap: 12 }}>
                  <button className="btn btn-glass" onClick={clearAll}>Reset filters</button>
                  <Link to="/events/new" className="btn btn-primary">Create an event</Link>
                </div>
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
