import React, { useState, useEffect, useRef } from 'react';
import { sendMessage, subscribeToChat, getChatId } from './firebase';

function timeAgo(ts) {
  if (!ts) return '';
  const ms   = ts.toMillis ? ts.toMillis() : new Date(ts).getTime();
  const diff = Date.now() - ms;
  const m    = Math.floor(diff / 60000);
  if (m < 1)  return 'ahora';
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
}

function Avatar({ photoURL, displayName, size = 28 }) {
  const initial = (displayName || '?').charAt(0).toUpperCase();
  return photoURL
    ? <img src={photoURL} alt={displayName} className="chat-avatar-img" style={{ width: size, height: size }} />
    : <span className="chat-avatar-initials" style={{ width: size, height: size, fontSize: size * 0.42 }}>{initial}</span>;
}

export default function ChatPanel({ myUser, otherUser, onBack }) {
  const [messages, setMessages] = useState([]);
  const [text, setText]         = useState('');
  const [sending, setSending]   = useState(false);
  const bottomRef               = useRef(null);
  const textareaRef             = useRef(null);

  const chatId = getChatId(myUser.uid, otherUser.uid);

  useEffect(() => {
    const unsub = subscribeToChat(chatId, setMessages);
    return unsub;
  }, [chatId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    if (!text.trim() || sending) return;
    setSending(true);
    await sendMessage(chatId, myUser.uid, myUser.displayName, myUser.photoURL, text.trim());
    setText('');
    setSending(false);
    textareaRef.current?.focus();
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <button className="profile-back-btn" onClick={onBack}>← Volver</button>
        <div className="chat-header-info">
          <Avatar photoURL={otherUser.photoURL} displayName={otherUser.displayName} size={28} />
          <span className="chat-header-name">{otherUser.displayName || '(sin nombre)'}</span>
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">Comenzá la conversación ✉️</div>
        )}
        {messages.map(m => {
          const isMe = m.uid === myUser.uid;
          return (
            <div key={m.id} className={`chat-msg-row ${isMe ? 'mine' : 'theirs'}`}>
              {!isMe && (
                <div className="chat-msg-avatar">
                  <Avatar photoURL={m.photoURL} displayName={m.displayName} size={24} />
                </div>
              )}
              <div className="chat-msg-col">
                <div className={`chat-bubble ${isMe ? 'mine' : 'theirs'}`}>{m.text}</div>
                <div className={`chat-time ${isMe ? 'mine' : ''}`}>{timeAgo(m.timestamp)}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-row">
        <textarea
          ref={textareaRef}
          className="chat-textarea"
          placeholder="Escribí un mensaje…"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          rows={1}
        />
        <button
          className="chat-send-btn"
          onClick={handleSend}
          disabled={!text.trim() || sending}
        >
          {sending ? '…' : '↑'}
        </button>
      </div>
    </div>
  );
}
