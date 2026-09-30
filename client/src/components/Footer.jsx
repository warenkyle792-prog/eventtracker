import { Link } from 'react-router-dom';
import { Calendar, Github, Twitter, Instagram, Youtube } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Link to="/" className="brand">
              <span className="brand-mark"><Calendar size={20} /></span>
              EventTracker
            </Link>
            <p className="muted mt-4" style={{ maxWidth: 320, lineHeight: 1.75 }}>
              Discover extraordinary events, meet the people behind them, and keep the
              conversation going — all in one beautifully simple place.
            </p>
            <div className="social-row mt-5">
              <a className="social-btn" href="#" aria-label="Twitter"><Twitter size={17} /></a>
              <a className="social-btn" href="#" aria-label="Instagram"><Instagram size={17} /></a>
              <a className="social-btn" href="#" aria-label="YouTube"><Youtube size={17} /></a>
              <a className="social-btn" href="#" aria-label="GitHub"><Github size={17} /></a>
            </div>
          </div>

          <div>
            <h4>Explore</h4>
            <Link className="footer-link" to="/events">All events</Link>
            <Link className="footer-link" to="/events?category=music">Music</Link>
            <Link className="footer-link" to="/events?category=tech">Tech</Link>
            <Link className="footer-link" to="/events?category=food">Food & Drink</Link>
            <Link className="footer-link" to="/events?price=free">Free events</Link>
          </div>

          <div>
            <h4>Community</h4>
            <Link className="footer-link" to="/events/new">Host an event</Link>
            <Link className="footer-link" to="/chat">Messages</Link>
            <Link className="footer-link" to="/register">Create account</Link>
            <Link className="footer-link" to="/login">Sign in</Link>
          </div>

          <div>
            <h4>Support</h4>
            <a className="footer-link" href="#">Help centre</a>
            <a className="footer-link" href="#">Safety guidelines</a>
            <a className="footer-link" href="#">Terms of service</a>
            <a className="footer-link" href="#">Privacy policy</a>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} EventTracker. Crafted with care.</span>
          <span>Glassy nights, bright events.</span>
        </div>
      </div>
    </footer>
  );
}
