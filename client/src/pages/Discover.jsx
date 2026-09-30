import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, ArrowRight, Sparkles, MapPin, CalendarDays, Flame, TrendingUp,
  Mic2, Cpu, Palette, UtensilsCrossed, Dumbbell, Briefcase, HeartHandshake, Heart,
} from 'lucide-react';
import { api } from '../api/client';
import EventCard from '../components/EventCard';
import { SectionHead, Spinner } from '../components/UI';

const CATEGORY_ICONS = {
  music: Mic2, cpu: Cpu, palette: Palette, utensils: UtensilsCrossed,
  dumbbell: Dumbbell, briefcase: Briefcase, heart: Heart, users: HeartHandshake,
};

export default function Discover() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [feed, cats] = await Promise.all([api.get('/feed'), api.get('/categories')]);
        setData(feed);
        setCategories(cats.categories);
      } catch {
        setData({ featured: [], trending: [], upcoming: [], forYou: [], following: [] });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set('search', query.trim());
    if (cat) params.set('category', cat);
    navigate(`/events?${params.toString()}`);
  };

  const patchSave = (id, is_saved) => {
    setData((d) => {
      if (!d) return d;
      const patch = (arr) => arr?.map((ev) => (ev.id === id ? { ...ev, is_saved } : ev));
      return {
        ...d,
        featured: patch(d.featured), trending: patch(d.trending),
        upcoming: patch(d.upcoming), forYou: patch(d.forYou), following: patch(d.following),
      };
    });
  };

  const featured = data?.featured?.slice(0, 4) || [];
  const trending = data?.trending?.slice(0, 4) || [];
  const upcoming = data?.upcoming?.slice(0, 4) || [];
  const floatCards = (data?.featured || []).slice(0, 3);

  return (
    <div className="page">
      <div className="container">
        {/* ---------------- Hero ---------------- */}
        <section className="hero">
          <div className="hero-grid">
            <div>
              <span className="hero-overline">
                <span className="pulse" /> 12,400+ events happening this month
              </span>
              <h1>
                Discover <span className="text-gradient">extraordinary</span> events, effortlessly.
              </h1>
              <p className="hero-sub">
                From rooftop sunsets to midnight hackathons — find what moves you,
                save your favourites, and meet the people who make it happen.
              </p>

              <form className="hero-search" onSubmit={handleSearch}>
                <div className="input-with-icon">
                  <span className="ii-icon"><Search size={18} /></span>
                  <input
                    className="input"
                    placeholder="Search events, cities, vibes…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    aria-label="Search events"
                  />
                </div>
                <select className="select" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category">
                  <option value="">All categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.slug}>{c.name}</option>
                  ))}
                </select>
                <button className="btn btn-primary" type="submit">
                  <Search size={17} /> Search
                </button>
              </form>

              <div className="hero-chips">
                <span className="label">Popular:</span>
                {['music', 'tech', 'food', 'wellness'].map((slug) => (
                  <Link key={slug} to={`/events?category=${slug}`} className="pill">
                    {categories.find((c) => c.slug === slug)?.name || slug}
                  </Link>
                ))}
              </div>

              <div className="hero-stats">
                <div className="hero-stat">
                  <div className="num text-gradient">12k+</div>
                  <div className="lbl">Live events</div>
                </div>
                <div className="hero-stat">
                  <div className="num text-gradient">180</div>
                  <div className="lbl">Cities</div>
                </div>
                <div className="hero-stat">
                  <div className="num text-gradient">4.9★</div>
                  <div className="lbl">Host rating</div>
                </div>
              </div>
            </div>

            <div className="hero-visual" aria-hidden="true">
              {loading
                ? [0, 1, 2].map((i) => (
                    <div key={i} className="float-card glass" style={{ height: 200, opacity: 0.5 }} />
                  ))
                : floatCards.map((ev) => (
                    <Link key={ev.id} to={`/events/${ev.id}`} className="float-card">
                      <div className="glass" style={{ overflow: 'hidden' }}>
                        <img
                          src={ev.image_url}
                          alt=""
                          style={{ width: '100%', height: 150, objectFit: 'cover' }}
                          onError={(e) => { e.currentTarget.src = '/uploads/covers/cover-1-music.svg'; }}
                        />
                        <div style={{ padding: 14 }}>
                          <div className="badge badge-accent" style={{ fontSize: '0.68rem' }}>{ev.category_name}</div>
                          <div style={{ fontWeight: 700, marginTop: 8, fontSize: '0.95rem', lineHeight: 1.35 }}>
                            {ev.title}
                          </div>
                          <div className="dim" style={{ fontSize: '0.8rem', marginTop: 4 }}>
                            <MapPin size={12} style={{ verticalAlign: -2 }} /> {ev.city || 'Online'}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
            </div>
          </div>
        </section>

        {loading ? (
          <Spinner label="Curating the best events for you…" />
        ) : (
          <>
            {/* ---------------- Featured ---------------- */}
            <section className="section">
              <SectionHead
                title="Featured this week"
                sub="Hand-picked experiences our editors can’t stop talking about."
                link={<Link className="section-link" to="/events?sort=popular">View all <ArrowRight size={16} /></Link>}
              />
              <div className="grid-events">
                {featured.map((ev) => (
                  <EventCard key={ev.id} event={ev} onSave={patchSave} />
                ))}
              </div>
            </section>

            {/* ---------------- Categories ---------------- */}
            <section className="section">
              <SectionHead
                title="Browse by category"
                sub="Whatever your mood, there’s a room full of people waiting."
                link={<Link className="section-link" to="/events">Explore all <ArrowRight size={16} /></Link>}
              />
              <div className="category-grid">
                {categories.slice(0, 8).map((c) => {
                  const Icon = CATEGORY_ICONS[c.icon] || Sparkles;
                  return (
                    <Link key={c.id} to={`/events?category=${c.slug}`} className="category-tile">
                      <span className="cat-icon" style={{ background: c.gradient }}>
                        <Icon size={22} />
                      </span>
                      <div>
                        <div className="name">{c.name}</div>
                        <div className="count">{c.event_count} upcoming {c.event_count === 1 ? 'event' : 'events'}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>

            {/* ---------------- Trending ---------------- */}
            <section className="section">
              <SectionHead
                title={<span className="flex" style={{ gap: 10 }}><Flame size={26} style={{ color: '#ff9d6c' }} /> Trending now</span>}
                sub="What everyone is RSVPing to right now."
                link={<Link className="section-link" to="/events?sort=popular">View all <ArrowRight size={16} /></Link>}
              />
              <div className="grid-events">
                {trending.map((ev) => (
                  <EventCard key={ev.id} event={ev} onSave={patchSave} />
                ))}
              </div>
            </section>

            {/* ---------------- Upcoming ---------------- */}
            <section className="section">
              <SectionHead
                title={<span className="flex" style={{ gap: 10 }}><CalendarDays size={26} style={{ color: '#00d4ff' }} /> Coming up next</span>}
                sub="Start planning — these are just around the corner."
                link={<Link className="section-link" to="/events?when=week">This week <ArrowRight size={16} /></Link>}
              />
              <div className="grid-events">
                {upcoming.map((ev) => (
                  <EventCard key={ev.id} event={ev} onSave={patchSave} />
                ))}
              </div>
            </section>

            {/* ---------------- CTA ---------------- */}
            <section className="section">
              <div className="cta-banner">
                <div>
                  <span className="hero-overline" style={{ marginBottom: 16 }}>
                    <TrendingUp size={15} /> For hosts & creators
                  </span>
                  <h2>Have something <span className="text-gradient">worth showing up for?</span></h2>
                  <p>
                    Create your event in minutes, reach the right crowd, and manage
                    your guests with a dashboard you’ll actually enjoy using.
                  </p>
                </div>
                <div className="flex wrap" style={{ gap: 14 }}>
                  <Link to="/events/new" className="btn btn-primary btn-lg">
                    <Sparkles size={18} /> Create an event
                  </Link>
                  <Link to="/events" className="btn btn-glass btn-lg">
                    Browse events
                  </Link>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
