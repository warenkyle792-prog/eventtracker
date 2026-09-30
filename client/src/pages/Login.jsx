import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Calendar, LogIn, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Login() {
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(form.email.trim(), form.password);
      toast(`Welcome back! ✨`, 'success');
      navigate(location.state?.from || '/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card glass-strong">
        <Link to="/" className="brand">
          <span className="brand-mark"><Calendar size={20} /></span>
          EventTracker
        </Link>
        <h1>Welcome back</h1>
        <p className="sub">Sign in to pick up where the night left off.</p>

        <form className="auth-form" onSubmit={submit}>
          {error && <div className="error-text">{error}</div>}

          <div className="field">
            <label className="field-label" htmlFor="email">Email or username</label>
            <input
              id="email"
              className="input"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              autoComplete="username"
              required
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="password">Password</label>
            <div className="input-with-icon" style={{ position: 'relative' }}>
              <input
                id="password"
                className="input"
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                autoComplete="current-password"
                required
                style={{ paddingRight: 46 }}
              />
              <button
                type="button"
                className="btn btn-icon btn-sm btn-ghost"
                style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)' }}
                onClick={() => setShowPw((s) => !s)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button className="btn btn-primary btn-lg btn-block" disabled={busy}>
            <LogIn size={18} /> {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="auth-alt">
          New to EventTracker? <Link to="/register">Create an account</Link>
        </p>

        <div className="demo-note">
          <strong>Demo accounts</strong> — any of these work with password <code>password123</code>:<br />
          <code>amara@eventtracker.app</code> · <code>daniel@eventtracker.app</code> · <code>mei@eventtracker.app</code>
        </div>
      </div>
    </div>
  );
}
