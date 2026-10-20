import { useState, useRef, useEffect } from 'react';
import { aiApi } from '../../api/ai.api';
import './ChatWidget.css';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm AI HelpBot for SpendSense. How can I help you manage your finances today?" }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [isOpen, messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMessage = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    
    try {
      // Send message history to our backend (which forwards it to Groq)
      const response = await aiApi.chat(newMessages);
      const aiResponse = response.data.data.message;
      setMessages([...newMessages, aiResponse]);
    } catch (error) {
      console.error('Failed to get AI response:', error);
      setMessages([...newMessages, { role: 'assistant', content: 'Oops! Something went wrong connecting to my brain. Please try again later.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Simple parser to render markdown bullet points
  const renderMessageContent = (content) => {
    if (content.includes('- ') || content.includes('* ') || content.includes('1. ')) {
      const lines = content.split('\n').filter(l => l.trim());
      // Render as list if mostly list items
      if (lines.length > 0) {
        return (
          <ul>
            {lines.map((line, i) => {
              const cleanLine = line.replace(/^([-*]|\d+\.)\s+/, '').replace(/\*\*/g, '');
              return <li key={i}>{cleanLine}</li>;
            })}
          </ul>
        );
      }
    }
    return content;
  };

  return (
    <div className="chat-widget-container">
      {isOpen && (
        <div className="chat-panel">
          <div className="chat-header">
            <h3 className="chat-header-title">
              ✨ AI HelpBot
            </h3>
            <button className="chat-header-close" onClick={() => setIsOpen(false)} aria-label="Close chat">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          
          <div className="chat-messages">
            {messages.map((msg, index) => (
              <div key={index} className={`chat-message ${msg.role}`}>
                {msg.role === 'assistant' ? renderMessageContent(msg.content) : msg.content}
              </div>
            ))}
            {isLoading && (
              <div className="chat-typing">
                Thinking at LPU speeds...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <div className="chat-input-container">
            <input
              type="text"
              className="chat-input"
              placeholder="Ask anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />
            <button 
              className="chat-send-btn" 
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </div>
      )}
      
      {!isOpen && (
        <button className="chat-fab" onClick={() => setIsOpen(true)} aria-label="Open AI HelpBot">
          ✨
        </button>
      )}
    </div>
  );
}
