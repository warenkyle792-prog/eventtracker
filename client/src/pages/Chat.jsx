import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
  MessageCircle, Send, ArrowLeft, Search, Plus, Users, CalendarDays,
} from 'lucide-react';
import { api, getToken } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Avatar, EmptyState, Modal, Spinner } from '../components/UI';
import { timeLabel, formatDate, parseDate } from '../utils/format';

export default function Chat() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(Number(searchParams.get('c')) || null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [newOpen, setNewOpen] = useState(false);
  const [people, setPeople] = useState([]);
  const [peopleQuery, setPeopleQuery] = useState('');
  const [threadOpenMobile, setThreadOpenMobile] = useState(Boolean(activeId));

  const socketRef = useRef(null);
  const bottomRef = useRef(null);
  const typingTimer = useRef(null);

  useEffect(() => {
    if (!authLoading && !user) navigate('/login');
  }, [user, authLoading, navigate]);

  /* -------- socket connection -------- */
  useEffect(() => {
    if (!user) return;
    const socket = io({
      auth: { token: getToken() },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('message:new', ({ conversationId, message }) => {
      if (conversationId === activeId) {
        setMessages((m) => (m.some((x) => x.id === message.id) ? m : [...m, message]));
      }
      setConversations((list) =>
        list.map((c) =>
          c.id === conversationId
            ? { ...c, last_message: message }
            : c
        )
      );
    });

    socket.on('typing:start', ({ conversationId, userId }) => {
      if (conversationId === activeId) {
        setTypingUsers((t) => ({ ...t, [userId]: true }));
      }
    });
    socket.on('typing:stop', ({ conversationId, userId }) => {
      setTypingUsers((t) => {
        const copy = { ...t };
        delete copy[userId];
        return copy;
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  /* -------- load conversation list -------- */
  const loadList = useCallback(async () => {
    try {
      const d = await api.get('/conversations');
      setConversations(d.conversations);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setLoadingList(false);
    }
  }, [toast]);

  useEffect(() => {
    if (user) loadList();
  }, [user, loadList]);

  /* -------- load messages when active changes -------- */
  useEffect(() => {
    if (!activeId) return;
    setLoadingMsgs(true);
    socketRef.current?.emit('conversation:join', activeId);
    api.get(`/conversations/${activeId}/messages`)
      .then((d) => setMessages(d.messages))
      .catch((err) => toast(err.message, 'error'))
      .finally(() => setLoadingMsgs(false));

    const next = new URLSearchParams(searchParams);
    next.set('c', String(activeId));
    setSearchParams(next, { replace: true });
    setThreadOpenMobile(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  /* -------- search people for new DM -------- */
  useEffect(() => {
    if (!newOpen) return;
    const t = setTimeout(() => {
      api.get(`/users?q=${encodeURIComponent(peopleQuery)}`)
        .then((d) => setPeople(d.users || []))
        .catch(() => setPeople([]));
    }, 250);
    return () => clearTimeout(t);
  }, [newOpen, peopleQuery]);

  const activeConv = conversations.find((c) => c.id === activeId);

  const openConversation = (id) => {
    if (socketRef.current && activeId) socketRef.current.emit('conversation:leave', activeId);
    setActiveId(id);
  };

  const startDm = async (person) => {
    try {
      const res = await api.post('/conversations', { participantId: person.id });
      setNewOpen(false);
      setPeopleQuery('');
      await loadList();
      openConversation(res.conversation.id);
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const send = (e) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || !activeId) return;
    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit('message:send', { conversationId: activeId, body }, (res) => {
        if (res?.message) {
          setMessages((m) => (m.some((x) => x.id === res.message.id) ? m : [...m, res.message]));
        }
      });
    } else {
      // REST fallback
      api.post(`/conversations/${activeId}/messages`, { body })
        .then((res) => setMessages((m) => [...m, res.message]))
        .catch((err) => toast(err.message, 'error'));
    }
    setText('');
    socketRef.current?.emit('typing:stop', { conversationId: activeId });
  };

  const onType = (e) => {
    setText(e.target.value);
    const socket = socketRef.current;
    if (!socket || !activeId) return;
    socket.emit('typing:start', { conversationId: activeId });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket.emit('typing:stop', { conversationId: activeId });
    }, 1800);
  };

  const convTitle = (c) => {
    if (!c) return '';
    if (c.type === 'event') return c.title || 'Event chat';
    return c.participants?.map((p) => p.name).join(', ') || 'Conversation';
  };

  const typingLabel = Object.keys(typingUsers).length > 0
    ? `${Object.keys(typingUsers).length === 1 ? 'Someone is' : 'People are'} typing…`
    : null;

  if (authLoading) return <div className="page"><Spinner /></div>;

  return (
    <div className="page" style={{ paddingTop: 'calc(var(--nav-h) + var(--s-6))', paddingBottom: 'var(--s-8)' }}>
      <div className="container">
        <div className={`chat-shell ${threadOpenMobile ? 'mobile-thread-open' : ''}`}>
          {/* ---------- Conversation list ---------- */}
          <aside className="chat-list glass">
            <div className="chat-list-head">
              <h2>Messages</h2>
              <button className="btn btn-primary btn-sm" onClick={() => setNewOpen(true)}>
                <Plus size={16} /> New
              </button>
            </div>
            <div style={{ padding: 'var(--s-3) var(--s-4) 0' }}>
              <div className="input-with-icon">
                <span className="ii-icon"><Search size={15} /></span>
                <input className="input" placeholder="Search chats…" aria-label="Search conversations" />
              </div>
            </div>
            <div className="chat-scroll">
              {loadingList ? (
                <Spinner label="Loading chats…" />
              ) : conversations.length === 0 ? (
                <EmptyState
                  icon={<MessageCircle size={28} />}
                  title="No conversations yet"
                  text="Start a chat from an event page or a host’s profile."
                />
              ) : (
                conversations.map((c) => (
                  <button
                    key={c.id}
                    className={`conv-item ${c.id === activeId ? 'active' : ''}`}
                    onClick={() => openConversation(c.id)}
                  >
                    {c.type === 'event' ? (
                      <span className="meta-icon" style={{ width: 42, height: 42 }}>
                        <CalendarDays size={18} />
                      </span>
                    ) : (
                      <Avatar user={c.participants?.[0]} />
                    )}
                    <span className="info">
                      <span className="title">{convTitle(c)}</span>
                      <span className="preview">
                        {c.last_message
                          ? `${c.last_message.sender_id === user?.id ? 'You: ' : ''}${c.last_message.body}`
                          : 'No messages yet'}
                      </span>
                    </span>
                    {c.last_message && (
                      <span className="time">{timeLabel(c.last_message.created_at)}</span>
                    )}
                  </button>
                ))
              )}
            </div>
          </aside>

          {/* ---------- Thread ---------- */}
          <section className="chat-thread glass">
            {!activeConv ? (
              <div className="chat-empty">
                <MessageCircle size={44} />
                <h3 style={{ color: 'var(--text-0)' }}>Your conversations live here</h3>
                <p style={{ maxWidth: 320, lineHeight: 1.7 }}>
                  Pick a chat from the list, or start a new one to connect with hosts and fellow event-goers.
                </p>
                <button className="btn btn-primary" onClick={() => setNewOpen(true)}>
                  <Plus size={16} /> Start a conversation
                </button>
              </div>
            ) : (
              <>
                <div className="chat-thread-head">
                  <button
                    className="btn btn-icon btn-sm btn-ghost desktop-hidden"
                    onClick={() => setThreadOpenMobile(false)}
                    aria-label="Back to chats"
                  >
                    <ArrowLeft size={17} />
                  </button>
                  {activeConv.type === 'event' ? (
                    <span className="meta-icon"><Users size={18} /></span>
                  ) : (
                    <Avatar user={activeConv.participants?.[0]} />
                  )}
                  <div>
                    <div className="title">{convTitle(activeConv)}</div>
                    <div className="status">
                      <span className="presence-dot" /> Active now
                      {activeConv.type === 'event' && (
                        <Link to={`/events/${activeConv.event_id}`} className="flex" style={{ gap: 4, marginLeft: 8, color: 'var(--accent-2)' }}>
                          <CalendarDays size={12} /> View event
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                <div className="chat-messages">
                  {loadingMsgs ? (
                    <Spinner label="Loading messages…" />
                  ) : (
                    <>
                      {messages.map((m, i) => {
                        const mine = m.sender_id === user?.id;
                        const prev = messages[i - 1];
                        const newDay = !prev || parseDate(prev.created_at)?.toDateString() !== parseDate(m.created_at)?.toDateString();
                        return (
                          <div key={m.id} style={{ display: 'contents' }}>
                            {newDay && (
                              <span className="date-divider">{formatDate(m.created_at, { year: true })}</span>
                            )}
                            <div className={`msg-row ${mine ? 'mine' : 'theirs'}`}>
                              {!mine && <Avatar user={{ name: m.name, avatar_url: m.avatar_url }} size="sm" />}
                              <div>
                                {!mine && activeConv.type === 'event' && (
                                  <div className="msg-sender">{m.name}</div>
                                )}
                                <div className="msg-bubble">{m.body}</div>
                                <div className="msg-time">{timeLabel(m.created_at)}</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {typingLabel && (
                        <div className="typing-row" title={typingLabel}>
                          <i /><i /><i />
                        </div>
                      )}
                      <div ref={bottomRef} />
                    </>
                  )}
                </div>

                <form className="chat-input-row" onSubmit={send}>
                  <input
                    className="input"
                    placeholder="Write a message…"
                    value={text}
                    onChange={onType}
                    aria-label="Message text"
                  />
                  <button className="btn btn-primary btn-icon" type="submit" disabled={!text.trim()} aria-label="Send message">
                    <Send size={18} />
                  </button>
                </form>
              </>
            )}
          </section>
        </div>
      </div>

      {/* New conversation modal */}
      <Modal open={newOpen} onClose={() => setNewOpen(false)} title="New conversation">
        <div className="input-with-icon mb-4">
          <span className="ii-icon"><Search size={16} /></span>
          <input
            className="input"
            placeholder="Search people by name or username…"
            value={peopleQuery}
            onChange={(e) => setPeopleQuery(e.target.value)}
            autoFocus
          />
        </div>
        <div className="flex-col" style={{ gap: 6, maxHeight: 320, overflowY: 'auto' }}>
          {people.length === 0 ? (
            <p className="dim" style={{ padding: 'var(--s-4)' }}>No people found.</p>
          ) : (
            people
              .filter((p) => p.id !== user?.id)
              .map((p) => (
                <button key={p.id} className="conv-item" onClick={() => startDm(p)}>
                  <Avatar user={p} />
                  <span className="info">
                    <span className="title">{p.name}</span>
                    <span className="preview">@{p.username}{p.bio ? ` · ${p.bio}` : ''}</span>
                  </span>
                </button>
              ))
          )}
        </div>
      </Modal>
    </div>
  );
}
