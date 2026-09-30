import { Link } from 'react-router-dom';
import { Compass, Home, Sparkles } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="page">
      <div className="nf-wrap">
        <div className="nf-code text-gradient">404</div>
        <h1 style={{ fontSize: '1.8rem' }}>This page slipped off the dance floor</h1>
        <p className="muted" style={{ maxWidth: 420, lineHeight: 1.75 }}>
          The link may be broken, or the page has been moved. Let’s get you back to
          something worth showing up for.
        </p>
        <div className="flex wrap" style={{ gap: 12, justifyContent: 'center' }}>
          <Link to="/" className="btn btn-primary btn-lg"><Home size={18} /> Back home</Link>
          <Link to="/events" className="btn btn-glass btn-lg"><Compass size={18} /> Explore events</Link>
        </div>
        <p className="dim mt-5" style={{ fontSize: '0.88rem' }}>
          <Sparkles size={13} style={{ verticalAlign: -2 }} /> Tip: use the search bar to find events by city or vibe.
        </p>
      </div>
    </div>
  );
}
