import React, { useState, useRef, useEffect } from "react";
import "./ChatInterface.css";
import { useLocation } from "react-router-dom";
import { useWebSocket } from "../WebSocketContext";

export default function ChatInterface() {
  const location = useLocation();
  const { currentUserId, conversationId } = location.state || {};
  //   console.log(`currentUserRole -> ${currentUserRole}`)
  //   console.log(`currentUserId -> ${currentUserId}`)
  //   console.log(`conversationId -> ${conversationId}`)

  const { lastMessage } = useWebSocket();

  useEffect(() => {
    if (!lastMessage) return;

    if (
      lastMessage.type === "NEW_MESSAGE" &&
      lastMessage.message.conversationId === conversationId
    ) {
      console.log("NEW_MESSAGE received via WebSocket:", lastMessage.message);
      setMessages((prev) => [...prev, lastMessage.message]);
    }
  }, [lastMessage, conversationId]);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch existing messages when the component mounts

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await fetch(
          `http://localhost:3001/conversations/${conversationId.toString()}/messages`,
        );
        if (!res.ok) throw new Error("Failed to fetch messages");
        const data = await res.json();
        setMessages(
          data.map((msg) => ({
            id: msg.id,
            sender: msg.sender,
            body: msg.body || "",
            createdAt: msg.createdAt,
            fileUrl: msg.fileUrl,
          })),
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
      const response = await fetch(
        `http://localhost:3001/conversations/${conversationId.toString()}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            senderId: currentUserId.toString(), // or currentUserId if string
            body: input.trim(),
            contentType: "TEXT",
          }),
        },
      );

      if (!response.ok) throw new Error("Failed to send message");

      const newMessage = await response.json();
      console.log(newMessage);
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
              <div className="sender-label">{msg.sender.username}</div>
              <div
                className={`chat-message ${isOwnMessage ? "right" : "left"}`}
              >
                {msg.body}
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
