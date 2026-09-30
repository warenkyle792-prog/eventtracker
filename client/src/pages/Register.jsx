import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, UserPlus, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Register() {
  const { register } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setBusy(true);
    try {
      await register({
        name: form.name.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      toast('Welcome to EventTracker 🎉', 'success');
      navigate('/');
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
        <h1>Create your account</h1>
        <p className="sub">Join thousands discovering their next favourite night out.</p>

        <form className="auth-form" onSubmit={submit}>
          {error && <div className="error-text">{error}</div>}

          <div className="field">
            <label className="field-label" htmlFor="name">Full name</label>
            <input id="name" className="input" placeholder="Amara Okafor"
              value={form.name} onChange={set('name')} autoComplete="name" required />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="username">Username</label>
            <input id="username" className="input" placeholder="amara"
              value={form.username} onChange={set('username')} autoComplete="username" required />
            <span className="field-hint">3–24 characters — letters, numbers and underscores.</span>
          </div>

          <div className="field">
            <label className="field-label" htmlFor="email">Email</label>
            <input id="email" type="email" className="input" placeholder="you@example.com"
              value={form.email} onChange={set('email')} autoComplete="email" required />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="password">Password</label>
            <div className="input-with-icon" style={{ position: 'relative' }}>
              <input
                id="password"
                className="input"
                type={showPw ? 'text' : 'password'}
                placeholder="At least 6 characters"
                value={form.password}
                onChange={set('password')}
                autoComplete="new-password"
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
            <UserPlus size={18} /> {busy ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="auth-alt">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
