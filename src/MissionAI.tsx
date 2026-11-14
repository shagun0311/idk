
import { useState } from 'react';
import './MissionAI.css';

type Message = {
  role: 'user' | 'model';
  text: string;
};

const suggestions = [
  'Help me choose a lunar landing site.',
  'Plan communication between my lander and Earth.',
  'Analyse my mission power requirements.',
  'Create a complete lunar landing timeline.',
  'What spacecraft systems will my mission need?',
  'Help me assess landing hazards.',
];

export default function MissionAI() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      text: 'Welcome to IDK Mission Control. I am MISSION AI, your lunar mission planning assistant. Tell me about your mission, and we can work through the details together.',
    },
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  async function sendMessage(text = input) {
    const question = text.trim();
    if (!question || loading) return;

    const updatedMessages: Message[] = [
      ...messages,
      { role: 'user', text: question },
    ];

    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: updatedMessages.map((message) => ({
            role: message.role,
            text: message.text,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'MISSION AI request failed.');
      }

      setMessages((previous) => [
        ...previous,
        { role: 'model', text: data.answer },
      ]);
    } catch (error) {
      setMessages((previous) => [
        ...previous,
        {
          role: 'model',
          text:
            error instanceof Error
              ? error.message
              : 'Unable to connect. Please try again.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mission-ai">
      <header className="ai-heading">
        <div>
          <span className="ai-eyebrow">
            IDK / INTELLIGENT MISSION SYSTEMS
          </span>
          <h1>MISSION AI</h1>
          <p>
            Your intelligent assistant for lunar exploration and mission
            planning.
          </p>
        </div>
        <div className="ai-status">
          <span />
          AI ASSISTANT
        </div>
      </header>

      <div className="ai-workspace">
        <aside className="ai-sidebar">
          <span className="ai-section-label">MISSION CAPABILITIES</span>

          {[
            ['⌖', 'Landing site analysis'],
            ['☼', 'Solar & power planning'],
            ['◎', 'Earth communications'],
            ['◷', 'Mission timelines'],
            ['⚠', 'Hazard assessment'],
            ['⇄', 'Site comparisons'],
            ['✦', 'Mission engineering'],
            ['▤', 'Reports & documentation'],
          ].map(([icon, title]) => (
            <div className="ai-capability" key={title}>
              <span>{icon}</span>
              {title}
            </div>
          ))}

          <div className="ai-sidebar-note">
            <strong>MISSION SUPPORT</strong>
            <p>
              Ask questions, explore options and develop your mission plan
              step by step.
            </p>
          </div>
        </aside>

        <section className="ai-chat">
          <div className="ai-chat-top">
            <div>
              <strong>Mission conversation</strong>
              <span>LUNAR EXPLORATION ASSISTANT</span>
            </div>
            <button
              onClick={() =>
                setMessages([
                  {
                    role: 'model',
                    text: 'Welcome back to IDK Mission Control. What would you like to investigate?',
                  },
                ])
              }
            >
              NEW CHAT +
            </button>
          </div>

          <div className="ai-messages">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`ai-message ${
                  message.role === 'user' ? 'user-message' : ''
                }`}
              >
                {message.role === 'model' && (
                  <div className="ai-avatar">AI</div>
                )}

                <div className="ai-bubble">
                  <span>
                    {message.role === 'user' ? 'YOU' : 'MISSION AI'}
                  </span>
                  <p>{message.text}</p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="ai-message">
                <div className="ai-avatar">AI</div>
                <div className="ai-bubble">
                  <span>MISSION AI</span>
                  <p className="ai-thinking">Analysing your request...</p>
                </div>
              </div>
            )}
          </div>

          <div className="ai-suggestions">
            <span>QUICK START</span>
            <div>
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  disabled={loading}
                  onClick={() => sendMessage(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          <form
            className="ai-input-area"
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage();
            }}
          >
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask anything about your lunar mission..."
              disabled={loading}
            />
            <button type="submit" disabled={loading || !input.trim()}>
              {loading ? '...' : 'SEND ↗'}
            </button>
          </form>

          <div className="ai-disclaimer">
            AI-generated mission support. Verify engineering calculations
            and mission data independently.
          </div>
        </section>
      </div>
    </div>
  );
}
