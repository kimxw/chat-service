import React, { useState, useRef, useEffect } from "react";
import "./ChatInterface.css";
import { useLocation } from 'react-router-dom';

export default function ChatInterface() {
  const location = useLocation();
  const { currentUserRole, currentUserId, conversationId } = location.state || {};
  console.log(`currentUserRole -> ${currentUserRole}`)
  console.log(`currentUserId -> ${currentUserId}`)
  console.log(`conversationId -> ${conversationId}`)

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch existing messages when the component mounts
  // In your ChatInterface.jsx

    useEffect(() => {
    const fetchMessages = async () => {
        try {
        const res = await fetch(`http://localhost:3001/conversations/${conversationId.toString()}/messages`);
        if (!res.ok) throw new Error("Failed to fetch messages");
        const data = await res.json();
        setMessages(
            data.map((msg) => ({
            id: msg.id,
            sender: msg.sender,
            text: msg.body || "", // Handle optional body
            createdAt: msg.createdAt,
            fileUrl: msg.fileUrl, // if you want to handle file messages
            }))
        );
        } catch (err) {
        console.error(err);
        }
    };

    fetchMessages();
    }, [conversationId]);


    const handleSend = async () => {
        if (!input.trim()) return;

        try {
            const response = await fetch(`http://localhost:3001/conversations/${conversationId.toString()}/messages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                senderId: currentUserId.toString(), // or currentUserId if string
                body: input.trim(),
                contentType: "TEXT",
            }),
            });

            if (!response.ok) throw new Error("Failed to send message");

            const newMessage = await response.json();
            setMessages((prev) => [
            ...prev,
            {
                id: newMessage.id,
                sender: currentUserRole,
                text: newMessage.body || "",
                createdAt: newMessage.createdAt,
            },
            ]);
            setInput("");
        } catch (err) {
            console.error(err);
        }
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
        {messages.map((msg) => {
          const isOwnMessage = msg.sender.id === currentUserId;
          return (
            <div
              key={msg.id}
              className={`chat-message-container ${
                isOwnMessage ? "own-message" : "other-message"
              }`}
            >
              <div className="sender-label">
                {/* { console.log(msg.sender) } */}
                {msg.sender.username}
              </div>
              <div className={`chat-message ${isOwnMessage ? "right" : "left"}`}>
                {msg.text}
              </div>
              <div className="message-meta">
                <small>{new Date(msg.createdAt).toLocaleTimeString()}</small>
              </div>
            </div>
          );
        })}
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
