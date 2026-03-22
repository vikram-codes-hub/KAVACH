import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Cpu, Bot } from 'lucide-react';

const INITIAL_MESSAGE = "I am Ira, the KAVACH System Assistant. How can I assist with your simulation parameters or provide details about Indian disaster management today?";

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([{ text: INITIAL_MESSAGE, sender: 'bot' }]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setMessages(prev => [...prev, { text: userMsg, sender: 'user' }]);
    setInput('');
    setIsTyping(true);

    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey) {
      setTimeout(() => {
        setIsTyping(false);
        setMessages(prev => [...prev, { text: "System Alert: To enable full AI responses, please configure your VITE_GROQ_API_KEY in the frontend .env file.", sender: 'bot' }]);
      }, 1000);
      return;
    }

    try {
      const historyContents = messages.slice(1).map(m => ({
        role: m.sender === 'bot' ? 'assistant' : 'user',
        content: m.text
      }));

      const payload = {
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: "You are Ira, the AI assistant for KAVACH (a Crisis Swarm Platform for disaster simulation in India). Your sole purpose is to provide information about KAVACH and Indian disaster management. If the user asks about anything unrelated to KAVACH or Indian disasters, politely refuse and state your specific purpose. Keep responses concise, professional, and directly relevant." },
          { role: "assistant", content: "Understood. I am Ira, the KAVACH System Assistant. I will only answer questions related to KAVACH and Indian disaster management." },
          ...historyContents,
          { role: "user", content: userMsg }
        ]
      };

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      const botResponse = data.choices?.[0]?.message?.content || "No response generated. Please try again.";
      setMessages(prev => [...prev, { text: botResponse, sender: 'bot' }]);
    } catch (err) {
      setMessages(prev => [...prev, { text: `Error: ${err.message}`, sender: 'bot' }]);
    } finally {
      setIsTyping(false);
    }
  };

  // ── Isolation wrapper — resets ALL inherited CSS from index.css ──
  // This makes the chatbot completely immune to global resets,
  // CSS variables, font overrides, background colors, etc.
  const isolationStyle = {
    all: 'revert',
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    fontSize: '16px',
    lineHeight: '1.5',
    color: 'white',
    boxSizing: 'border-box',
  };

  return (
    // The outer fragment renders at document root level.
    // The isolation div wraps EVERYTHING so index.css can't touch it.
    <div style={isolationStyle}>

      {/* Inject chatbot-specific styles — scoped, won't leak out */}
      <style>{`
        .kavach-chatbot *, .kavach-chatbot *::before, .kavach-chatbot *::after {
          box-sizing: border-box !important;
          font-family: 'Inter', 'Segoe UI', system-ui, sans-serif !important;
        }
        .kavach-chatbot {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 9999;
        }
        .kavach-chatbot > * {
          pointer-events: auto;
        }

        /* Chat window */
        .kc-window {
          position: fixed;
          bottom: 96px;
          right: 32px;
          width: 350px;
          z-index: 9999;
          transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
          transform-origin: bottom right;
        }
        .kc-window.open  { transform: scale(1); opacity: 1; pointer-events: auto; }
        .kc-window.closed { transform: scale(0.9) translateY(32px); opacity: 0; pointer-events: none; }

        .kc-box {
          background: rgba(10,15,30,0.97) !important;
          backdrop-filter: blur(20px);
          border: 1px solid rgba(249,115,22,0.3) !important;
          border-radius: 16px !important;
          box-shadow: 0 0 40px rgba(249,115,22,0.15) !important;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          height: 450px;
        }

        /* Header */
        .kc-header {
          background: linear-gradient(135deg, rgba(220,38,38,0.1), rgba(249,115,22,0.1)) !important;
          border-bottom: 1px solid rgba(249,115,22,0.2) !important;
          padding: 16px !important;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
        }
        .kc-avatar {
          width: 36px; height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(220,38,38,0.2), rgba(249,115,22,0.2)) !important;
          border: 1px solid rgba(249,115,22,0.4) !important;
          box-shadow: 0 0 15px rgba(249,115,22,0.3);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          position: relative;
        }
        .kc-ping {
          position: absolute; inset: 0;
          border-radius: 50%;
          border: 1px solid rgba(251,146,60,0.3);
          animation: kc-ping 1.5s ease-in-out infinite;
        }
        @keyframes kc-ping {
          0%,100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.2); opacity: 0; }
        }
        .kc-name {
          font-size: 14px !important;
          font-weight: 700 !important;
          color: white !important;
          display: flex; align-items: center; gap: 6px;
          margin: 0 !important;
        }
        .kc-online-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: #22c55e;
          display: inline-block;
          animation: kc-pulse-green 2s ease-in-out infinite;
          box-shadow: 0 0 8px rgba(34,197,94,0.6);
        }
        @keyframes kc-pulse-green {
          0%,100% { box-shadow: 0 0 5px rgba(34,197,94,0.5); }
          50% { box-shadow: 0 0 12px rgba(34,197,94,0.9); }
        }
        .kc-subtitle {
          font-size: 9px !important;
          color: rgba(251,146,60,0.8) !important;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          margin: 2px 0 0 0 !important;
        }
        .kc-close-btn {
          background: none !important;
          border: none !important;
          cursor: pointer;
          color: rgba(255,255,255,0.5) !important;
          padding: 4px !important;
          display: flex; align-items: center; justify-content: center;
          transition: color 0.2s;
        }
        .kc-close-btn:hover { color: white !important; }

        /* Messages area */
        .kc-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px !important;
          display: flex;
          flex-direction: column;
          gap: 16px;
          scrollbar-width: thin;
          scrollbar-color: rgba(249,115,22,0.2) transparent;
        }
        .kc-messages::-webkit-scrollbar { width: 3px; }
        .kc-messages::-webkit-scrollbar-track { background: transparent; }
        .kc-messages::-webkit-scrollbar-thumb { background: rgba(249,115,22,0.2); border-radius: 2px; }

        .kc-msg-row {
          display: flex;
          flex-direction: column;
          max-width: 85%;
        }
        .kc-msg-row.user { align-self: flex-end; align-items: flex-end; }
        .kc-msg-row.bot  { align-self: flex-start; align-items: flex-start; }

        .kc-msg-label {
          font-size: 9px !important;
          color: rgba(255,255,255,0.3) !important;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          margin: 0 0 4px 4px !important;
        }

        .kc-bubble {
          padding: 10px 14px !important;
          border-radius: 16px !important;
          font-size: 12px !important;
          line-height: 1.6 !important;
          margin: 0 !important;
        }
        .kc-bubble.user {
          background: linear-gradient(135deg, #dc2626, #f97316) !important;
          color: white !important;
          border-radius: 16px 16px 4px 16px !important;
        }
        .kc-bubble.bot {
          background: rgba(255,255,255,0.05) !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          color: rgba(255,255,255,0.9) !important;
          border-radius: 16px 16px 16px 4px !important;
        }

        /* Typing dots */
        .kc-typing-dot {
          width: 6px; height: 6px;
          background: rgba(249,115,22,0.5);
          border-radius: 50%;
          display: inline-block;
          animation: kc-bounce 1.2s ease-in-out infinite;
        }
        .kc-typing-dot:nth-child(2) { animation-delay: 0.15s; }
        .kc-typing-dot:nth-child(3) { animation-delay: 0.3s; }
        @keyframes kc-bounce {
          0%,80%,100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }

        /* Input area */
        .kc-input-area {
          padding: 12px !important;
          border-top: 1px solid rgba(255,255,255,0.08) !important;
          background: rgba(0,0,0,0.2) !important;
          flex-shrink: 0;
        }
        .kc-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .kc-input {
          width: 100% !important;
          background: rgba(255,255,255,0.05) !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          border-radius: 999px !important;
          padding: 10px 44px 10px 16px !important;
          font-size: 12px !important;
          color: white !important;
          font-family: 'Inter', sans-serif !important;
          outline: none !important;
          transition: border-color 0.2s;
          margin: 0 !important;
        }
        .kc-input::placeholder { color: rgba(255,255,255,0.3) !important; }
        .kc-input:focus { border-color: rgba(249,115,22,0.5) !important; }
        .kc-send-btn {
          position: absolute;
          right: 8px;
          background: none !important;
          border: none !important;
          cursor: pointer;
          padding: 6px !important;
          color: #f97316 !important;
          display: flex; align-items: center; justify-content: center;
          transition: color 0.2s;
        }
        .kc-send-btn:hover { color: #fb923c !important; }
        .kc-send-btn:disabled { color: rgba(255,255,255,0.2) !important; cursor: not-allowed; }

        /* FAB */
        .kc-fab {
          position: fixed;
          bottom: 24px;
          right: 32px;
          z-index: 9999;
          width: 56px; height: 56px;
          border-radius: 50% !important;
          border: none !important;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
        }
        .kc-fab.closed {
          background: linear-gradient(135deg, #dc2626, #f97316) !important;
          box-shadow: 0 0 20px rgba(249,115,22,0.4) !important;
          border: 1px solid rgba(251,146,60,0.3) !important;
        }
        .kc-fab.closed:hover {
          transform: scale(1.1);
          box-shadow: 0 0 30px rgba(249,115,22,0.6) !important;
        }
        .kc-fab.open {
          background: #27272a !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          box-shadow: 0 4px 20px rgba(0,0,0,0.4) !important;
          transform: rotate(90deg);
        }
        .kc-fab-badge {
          position: absolute;
          top: 2px; right: 2px;
          width: 14px; height: 14px;
          border-radius: 50%;
          background: #22c55e;
          border: 2px solid #05080f;
          animation: kc-pulse-green 2s ease-in-out infinite;
        }
      `}</style>

      <div className="kavach-chatbot">

        {/* ── Chat window ── */}
        <div className={`kc-window ${isOpen ? 'open' : 'closed'}`}>
          <div className="kc-box">

            {/* Header */}
            <div className="kc-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="kc-avatar">
                  <Cpu size={18} color="#fb923c" />
                  <div className="kc-ping" />
                </div>
                <div>
                  <p className="kc-name">
                    Ira
                    <span className="kc-online-dot" />
                  </p>
                  <p className="kc-subtitle">KAVACH Assistant</p>
                </div>
              </div>
              <button className="kc-close-btn" onClick={() => setIsOpen(false)}>
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div className="kc-messages">
              {messages.map((msg, i) => (
                <div key={i} className={`kc-msg-row ${msg.sender}`}>
                  <span className="kc-msg-label">
                    {msg.sender === 'user' ? 'You' : 'Agent'}
                  </span>
                  <div className={`kc-bubble ${msg.sender}`}>
                    {msg.text}
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="kc-msg-row bot">
                  <span className="kc-msg-label">Agent</span>
                  <div className="kc-bubble bot" style={{ display: 'flex', gap: 4, padding: '10px 14px' }}>
                    <span className="kc-typing-dot" />
                    <span className="kc-typing-dot" />
                    <span className="kc-typing-dot" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="kc-input-area">
              <div className="kc-input-wrap">
                <input
                  className="kc-input"
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder="Initialize interaction..."
                  autoComplete="off"
                />
                <button
                  className="kc-send-btn"
                  onClick={handleSend}
                  disabled={!input.trim()}
                >
                  <Send size={14} />
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* ── Floating Action Button ── */}
        <button
          className={`kc-fab ${isOpen ? 'open' : 'closed'}`}
          onClick={() => setIsOpen(v => !v)}
        >
          {isOpen
            ? <X size={24} color="white" />
            : <Bot size={26} color="white" />
          }
          {!isOpen && <span className="kc-fab-badge" />}
        </button>

      </div>
    </div>
  );
}