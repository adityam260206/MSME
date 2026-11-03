import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { 
  Bot, Sparkles, X, Send, Trash2, ArrowUpRight, 
  AlertCircle, CheckCircle, HelpCircle, Layers, RefreshCw
} from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export default function AICopilotDrawer() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copilotStatus, setCopilotStatus] = useState(null);
  const messagesEndRef = useRef(null);

  const role = user?.role?.toUpperCase() || 'STAFF';

  // Role-tailored starter prompt suggestions
  const suggestedPrompts = React.useMemo(() => {
    if (role === 'ADMIN' || role === 'OWNER') {
      return [
        "Summarize today's business performance",
        "Which products need urgent reordering?",
        "Show overdue customer balances",
        "How is this month's revenue vs expenses?",
        "Which products have high volume but low margins?"
      ];
    } else if (role === 'MANAGER') {
      return [
        "Which products are below safety stock?",
        "Show top-selling products this month",
        "Are there any unreceived purchase orders?",
        "Explain the dynamic ROP calculation formula"
      ];
    } else {
      return [
        "Which products are low or out of stock?",
        "How many sales were completed today?",
        "How do I process a POS customer invoice?",
        "Where can I find registered customers?"
      ];
    }
  }, [role]);

  // Fetch status on mount
  useEffect(() => {
    if (user) {
      api.get('/ai/status')
        .then(res => setCopilotStatus(res.data?.data))
        .catch(() => setCopilotStatus({ configured: false, model: 'openai/gpt-oss-120b', provider: 'Groq' }));
    }
  }, [user]);

  // Initial greeting
  useEffect(() => {
    if (messages.length === 0 && user) {
      setMessages([
        {
          id: 'welcome-1',
          role: 'assistant',
          content: `Hello **${user.full_name || user.username}**! I am your **MSME360 Business Copilot**.\n\nI analyze your live inventory, sales, purchases${['ADMIN', 'OWNER'].includes(role) ? ', and financial ledger' : ''} to provide grounded operational intelligence and application guidance.\n\nHow can I help your business today?`,
          source_modules: ['System'],
          references: [{ label: 'Dashboard', path: '/dashboard' }]
        }
      ]);
    }
  }, [user, messages.length, role]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (customText = null) => {
    const textToSend = customText || inputMessage;
    if (!textToSend.trim() || isLoading) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend.trim(),
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customText) setInputMessage('');
    setIsLoading(true);

    try {
      // Bounded history (last 6 turns)
      const historyContext = messages.slice(-6).map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      }));

      const res = await api.post('/ai/chat', {
        message: userMsg.content,
        history: historyContext
      });

      const data = res.data?.data;
      const botMsg = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: data?.reply || 'I processed your request, but received an empty response.',
        source_modules: data?.source_modules || [],
        references: data?.references || [],
        intent: data?.intent,
        execution_notes: data?.execution_notes
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      const errorMsg = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `**Request Error**: ${err?.response?.data?.message || err?.message || 'Could not connect to the AI copilot service.'}\n\nPlease check your server connection or try a different question.`,
        source_modules: ['Error'],
        references: []
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        content: `History cleared. I'm ready for your next question about your business operations.`,
        source_modules: ['System'],
        references: []
      }
    ]);
  };

  const handleNavigate = (path) => {
    navigate(path);
    if (window.innerWidth < 768) {
      setIsOpen(false);
    }
  };

  // The copilot is opened from the screen's title row, not from a button that
  // floats over the work.
  useEffect(() => {
    const open = () => setIsOpen((prev) => !prev);
    window.addEventListener('msme360:copilot', open);
    return () => window.removeEventListener('msme360:copilot', open);
  }, []);

  return (
    <>
      {/* Slide-out Drawer */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '84px',
            right: '24px',
            width: '420px',
            maxWidth: 'calc(100vw - 32px)',
            height: '620px',
            maxHeight: 'calc(100vh - 120px)',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: '0 20px 48px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1000,
            overflow: 'hidden',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 20px',
              backgroundColor: 'var(--bg-surface-hover)',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'rgba(108, 92, 231, 0.15)',
                  color: 'var(--color-brand)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Bot size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 'var(--text-base)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>MSME360 Copilot</span>
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: copilotStatus?.configured ? 'rgba(0, 200, 150, 0.15)' : 'rgba(255, 184, 0, 0.15)',
                      color: copilotStatus?.configured ? 'var(--color-success)' : 'var(--color-warning)',
                      fontWeight: 700,
                    }}
                  >
                    {copilotStatus?.configured ? 'GROQ AI' : 'GROUNDED DB'}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Grounded in live authorized tenant data ({role})
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                onClick={handleClearHistory}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: 'var(--radius-sm)',
                }}
                title="Clear Conversation"
              >
                <Trash2 size={16} />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: 'var(--radius-sm)',
                }}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div
            style={{
              flex: 1,
              padding: '16px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              fontSize: 'var(--text-sm)',
            }}
          >
            {messages.map(msg => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '88%',
                }}
              >
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-lg)',
                    backgroundColor: msg.role === 'user' ? 'var(--color-brand)' : 'var(--bg-surface-hover)',
                    color: msg.role === 'user' ? '#FFFFFF' : 'var(--text-primary)',
                    border: msg.role === 'user' ? 'none' : '1px solid var(--border-subtle)',
                    lineHeight: 1.5,
                  }}
                >
                  <ReactMarkdown
                    components={{
                      p: ({ node, ...props }) => <p style={{ margin: '0 0 8px 0', lastChild: { margin: 0 } }} {...props} />,
                      ul: ({ node, ...props }) => <ul style={{ margin: '4px 0 8px 16px', padding: 0 }} {...props} />,
                      li: ({ node, ...props }) => <li style={{ margin: '2px 0' }} {...props} />,
                      strong: ({ node, ...props }) => <strong style={{ fontWeight: 600 }} {...props} />,
                      h3: ({ node, ...props }) => <h3 style={{ fontSize: '13px', margin: '4px 0 6px 0', fontWeight: 700 }} {...props} />,
                      blockquote: ({ node, ...props }) => (
                        <blockquote style={{ margin: '6px 0', paddingLeft: '8px', borderLeft: '3px solid var(--border-strong)', color: 'var(--text-secondary)', fontSize: '12px' }} {...props} />
                      )
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>

                {/* Source module badges & Action navigation pills */}
                {msg.role === 'assistant' && (
                  <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                    {msg.source_modules && msg.source_modules.length > 0 && (
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Layers size={12} />
                        {msg.source_modules.join(', ')}
                      </span>
                    )}

                    {msg.references && msg.references.map((ref, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleNavigate(ref.path)}
                        style={{
                          fontSize: '11px',
                          padding: '3px 8px',
                          borderRadius: 'var(--radius-sm)',
                          backgroundColor: 'rgba(108, 92, 231, 0.1)',
                          color: 'var(--color-brand)',
                          border: '1px solid rgba(108, 92, 231, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          cursor: 'pointer',
                          fontWeight: 500,
                        }}
                      >
                        <span>{ref.label}</span>
                        <ArrowUpRight size={11} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div
                style={{
                  alignSelf: 'flex-start',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-lg)',
                  backgroundColor: 'var(--bg-surface-hover)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                }}
              >
                <RefreshCw size={14} className="animate-spin" />
                <span>Reconciling verified database records...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Starter Chips (Only shown if less than 3 messages) */}
          {messages.length <= 2 && (
            <div style={{ padding: '8px 16px', display: 'flex', flexWrap: 'wrap', gap: '6px', borderTop: '1px solid var(--border-subtle)' }}>
              {suggestedPrompts.slice(0, 3).map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(prompt)}
                  style={{
                    fontSize: '11px',
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--bg-surface-hover)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input Bar */}
          <div
            style={{
              padding: '12px 16px',
              borderTop: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
              display: 'flex',
              gap: '8px',
            }}
          >
            <input
              type="text"
              value={inputMessage}
              onChange={e => setInputMessage(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={`Ask about inventory, sales, ${['ADMIN', 'OWNER'].includes(role) ? 'finance, ' : ''}etc...`}
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-root)',
                color: 'var(--text-primary)',
                fontSize: 'var(--text-sm)',
                outline: 'none',
              }}
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={isLoading || !inputMessage.trim()}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: inputMessage.trim() ? 'var(--color-brand)' : 'var(--border-subtle)',
                color: '#FFFFFF',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: inputMessage.trim() ? 'pointer' : 'not-allowed',
                transition: 'background-color 0.2s',
              }}
              title="Send message"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
