import { X } from 'lucide-react';
import { initials as getInitials } from '../utils/format';

export function Avatar({ user, src, size = 'md', alt = '' }) {
  const url = src ?? user?.avatar_url ?? '';
  const name = user?.name || alt || 'User';
  const cls = `avatar ${size === 'sm' ? 'avatar-sm' : size === 'lg' ? 'avatar-lg' : size === 'xl' ? 'avatar-xl' : ''}`;
  if (url) {
    return <img className={cls} src={url} alt={name} loading="lazy" />;
  }
  return (
    <span className={`${cls} avatar-initials`} aria-label={name}>
      {getInitials(name)}
    </span>
  );
}

export function Spinner({ label = 'Loading…' }) {
  return (
    <div className="loading-wrap">
      <div className="spinner" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}

export function EmptyState({ icon, title, text, action }) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-icon">{icon}</div>}
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal glass-strong" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="btn btn-icon btn-sm btn-ghost" onClick={onClose} aria-label="Close dialog">
            <X size={17} />
          </button>
        </div>
        {children}
        {footer && <div className="mt-6">{footer}</div>}
      </div>
    </div>
  );
}

export function AvatarStack({ users = [], max = 5, total }) {
  const shown = users.slice(0, max);
  const count = total ?? users.length;
  const extra = count - shown.length;
  return (
    <div className="avatar-stack">
      {shown.map((u) => (
        <Avatar key={u.id ?? u.username} user={u} size="sm" />
      ))}
      {extra > 0 && <span className="more">+{extra}</span>}
    </div>
  );
}

export function SectionHead({ title, sub, link, linkText = 'View all' }) {
  return (
    <div className="section-head">
      <div>
        <h2>{title}</h2>
        {sub && <p className="sub">{sub}</p>}
      </div>
      {link}
    </div>
  );
}
