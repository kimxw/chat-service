import React, { useState, useRef, useEffect } from "react";
import "./ChatInterface.css";

export default function ChatInterface() {
  const [messages, setMessages] = useState([
    { id: 1, sender: "agent", text: "Hi! How can I help you today?" },
    { id: 2, sender: "user", text: "I have a question about my order." },
  ]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages((prev) => [
      ...prev,
      { id: prev.length + 1, sender: "user", text: input.trim() },
    ]);
    setInput("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">Chat Support</div>

      <div className="chat-messages">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`chat-message ${msg.sender === "user" ? "user" : "agent"}`}
          >
            {msg.text}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          rows={2}
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </div>
  );
}
