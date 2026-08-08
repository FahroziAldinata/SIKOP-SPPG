import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks/useApi';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';

export const ChatWidget = () => {
  const { hasPerm } = useAuth();
  const api = useApi();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  // Guard — jangan render kalau tidak punya permission
  if (!hasPerm('chatbot', 'READ')) return null;

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.request('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // Cek apakah error karena API key belum diatur
        const errMsg = data.error || '';
        if (
          res.status === 400 &&
          (errMsg.toLowerCase().includes('api key belum diatur') ||
            errMsg.toLowerCase().includes('api key'))
        ) {
          setMessages(prev => [
            ...prev,
            { role: 'bot', content: '__API_KEY_MISSING__' },
          ]);
        } else {
          setMessages(prev => [
            ...prev,
            { role: 'bot', content: errMsg || 'Terjadi kesalahan. Coba lagi.' },
          ]);
        }
      } else {
        const jawaban = data?.data?.jawaban || '(Jawaban kosong)';
        setMessages(prev => [...prev, { role: 'bot', content: jawaban }]);
      }
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'bot', content: 'Terjadi kesalahan koneksi.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        onClick={handleOpen}
        title="AI Assistant"
        style={{
          position: 'fixed',
          bottom: '28px',
          right: '28px',
          zIndex: 9000,
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          border: '1px solid var(--border)',
          backgroundColor: 'var(--btn-primary-bg)',
          color: 'var(--btn-primary-text)',
          display: open ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: 'var(--shadow-hover)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.08)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(7, 30, 73, 0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = 'var(--shadow-hover)';
        }}
      >
        <MessageCircle size={22} strokeWidth={2} />
      </button>

      {/* Chat Panel Overlay — pola modal Bug Report */}
      {open && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'flex-end',
            zIndex: 10000,
            padding: '0 28px 28px 0',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-hover)',
              width: '360px',
              maxWidth: 'calc(100vw - 56px)',
              height: '520px',
              maxHeight: 'calc(100vh - 56px)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderBottom: '1px solid var(--border)',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bot size={18} strokeWidth={2} style={{ color: 'var(--color-primary)' }} />
                <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text)' }}>
                  AI Assistant
                </span>
              </div>
              <button
                onClick={handleClose}
                title="Tutup"
                style={{
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--border)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <X size={14} strokeWidth={2} />
              </button>
            </div>

            {/* Messages Area */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              {messages.length === 0 && (
                <div
                  style={{
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontSize: '12px',
                    marginTop: '40px',
                    lineHeight: '1.6',
                  }}
                >
                  <Bot size={28} strokeWidth={1.5} style={{ marginBottom: '8px', opacity: 0.5 }} />
                  <p style={{ margin: 0 }}>Halo! Saya asisten AI SPPG.</p>
                  <p style={{ margin: '4px 0 0' }}>Tanyakan apa saja seputar sistem ini.</p>
                </div>
              )}

              {messages.map((msg, idx) => {
                const isUser = msg.role === 'user';
                const isApiKeyMissing = msg.content === '__API_KEY_MISSING__';

                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      flexDirection: isUser ? 'row-reverse' : 'row',
                      alignItems: 'flex-start',
                      gap: '8px',
                    }}
                  >
                    {/* Avatar */}
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: isUser
                          ? 'var(--color-primary)'
                          : 'var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {isUser
                        ? <User size={14} strokeWidth={2} style={{ color: 'white' }} />
                        : <Bot size={14} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
                      }
                    </div>

                    {/* Bubble */}
                    <div
                      style={{
                        maxWidth: '75%',
                        padding: '9px 12px',
                        borderRadius: isUser
                          ? '12px 4px 12px 12px'
                          : '4px 12px 12px 12px',
                        backgroundColor: isUser
                          ? 'var(--color-primary)'
                          : 'var(--bg)',
                        color: isUser ? 'white' : 'var(--text)',
                        fontSize: '13px',
                        lineHeight: '1.5',
                        border: isUser ? 'none' : '1px solid var(--border)',
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {isApiKeyMissing ? (
                        <span>
                          API key belum diatur.{' '}
                          <Link
                            to="/setting"
                            onClick={handleClose}
                            style={{
                              color: 'var(--color-primary)',
                              fontWeight: 600,
                              textDecoration: 'underline',
                            }}
                          >
                            Atur API key di Pengaturan
                          </Link>
                        </span>
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Loading indicator */}
              {loading && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                  }}
                >
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Bot size={14} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
                  </div>
                  <div
                    style={{
                      padding: '9px 14px',
                      borderRadius: '4px 12px 12px 12px',
                      backgroundColor: 'var(--bg)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--text-muted)',
                          display: 'inline-block',
                          animation: `chat-dot-bounce 1.2s ${i * 0.2}s infinite ease-in-out`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div
              style={{
                padding: '12px 16px',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-end',
                flexShrink: 0,
              }}
            >
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ketik pesan… (Enter untuk kirim)"
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg)',
                  color: 'var(--text)',
                  fontSize: '13px',
                  outline: 'none',
                  fontFamily: 'inherit',
                  resize: 'none',
                  lineHeight: '1.5',
                  maxHeight: '100px',
                  overflowY: 'auto',
                  opacity: loading ? 0.6 : 1,
                }}
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                title="Kirim"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  backgroundColor:
                    loading || !input.trim()
                      ? 'var(--border)'
                      : 'var(--btn-primary-bg)',
                  color:
                    loading || !input.trim() ? 'var(--text-muted)' : 'var(--btn-primary-text)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                  flexShrink: 0,
                  transition: 'background-color 0.15s ease',
                }}
              >
                <Send size={15} strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline keyframe animation untuk loading dots */}
      <style>{`
        @keyframes chat-dot-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </>
  );
};
