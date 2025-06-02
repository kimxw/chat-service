import React, { useState, useRef, useEffect } from "react";
import "./ChatInterface.css";
import { useLocation } from "react-router-dom";
import { useWebSocket } from "../WebSocketContext";
import { BACKEND_URL } from "../constants";

export default function ChatInterface() {
  const location = useLocation();
  const { currentUserId, conversationId, currentRole, businessName } =
    location.state || {};
  //   console.log(`currentUserRole -> ${currentUserRole}`)
  //   console.log(`currentUserId -> ${currentUserId}`)
  //   console.log(`conversationId -> ${conversationId}`)

  const { lastMessage } = useWebSocket();

  const [onlineUsers, setOnlineUsers] = useState({}); // { userId: true/false }
  const [participants, setParticipants] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  const fetchOnlineUsers = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/presence/online-users`);
      if (!res.ok) throw new Error("Failed to fetch online users");
      const data = await res.json();
      console.log("Online users fetched:", data);
      setOnlineUsers(
        data.reduce((acc, user) => {
          acc[user.userId] = true;
          return acc;
        }, {}),
      );
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchOnlineUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markAsReadByCustomer = async (conversationId, messageId) => {
    try {
      const res = await fetch(
        `${BACKEND_URL}/conversations/${conversationId}/messages/${messageId}/read/customer`,
        {
          method: "PATCH",
        },
      );

      if (!res.ok) {
        throw new Error("Failed to mark message as read by customer");
      }

      const data = await res.json();
      return data;
    } catch (err) {
      console.error(err);
    }
  };

  const markAsReadByAgent = async (conversationId, messageId) => {
    try {
      const res = await fetch(
        `${BACKEND_URL}/conversations/${conversationId}/messages/${messageId}/read/agent`,
        {
          method: "PATCH",
        },
      );

      if (!res.ok) {
        throw new Error("Failed to mark message as read by agent");
      }

      const data = await res.json();
      return data;
    } catch (err) {
      console.error(err);
    }
  };

  async function markAllAsRead(conversationId, role) {
    try {
      const response = await fetch(
        `${BACKEND_URL}/conversations/${conversationId}/markAllAsRead/${role}`,
        {
          method: "PATCH",
        },
      );

      if (!response.ok) {
        console.error("Failed to mark messages as read");
        return;
      }

      const data = await response.json();
      console.log(`Marked ${data.count} messages as read for ${role}`);
    } catch (err) {
      console.error("Error calling markAllAsRead:", err);
    }
  }

  //fetch online users every 10 seconds

  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        const res = await fetch(
          `${BACKEND_URL}/conversations/${conversationId}/participants`,
        );
        if (!res.ok) throw new Error("Failed to fetch participants");
        const data = await res.json();
        console.log("Fetched participants:", data); // Optional: Debugging
        setParticipants(data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchParticipants();
  }, [conversationId]);

  useEffect(() => {
    if (!lastMessage) return;
    console.log(lastMessage);

    const processLastMessage = async () => {
      if (
        (lastMessage.type === "UPDATED_READ_STATUS_OF_AGENTS" &&
          currentRole === "CUSTOMER") ||
        (lastMessage.type === "UPDATED_READ_STATUS_OF_CUSTOMER" &&
          currentRole === "AGENT")
      ) {
        if (lastMessage.message.conversationId === conversationId) {
          const updatedMessage = lastMessage.message;
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === updatedMessage.id
                ? { ...msg, ...updatedMessage }
                : msg,
            ),
          );
        }
      }

      if (lastMessage.type === "PRESENCE_UPDATE") {
        setOnlineUsers((prev) => ({
          ...prev,
          [lastMessage.userId]: lastMessage.isOnline,
        }));
      }

      if (lastMessage.type === "PRESENCE_SNAPSHOT") {
        setOnlineUsers(lastMessage.usersOnline);
      }

      if (
        lastMessage.type === "TYPING" &&
        lastMessage.message.conversationId === conversationId
      ) {
        console.log("TYPING Message broadcasted received");
        const { username, isTyping, userId } = lastMessage.message;
        const typingUserId = String(userId);

        setTypingUsers((prev) => {
          if (isTyping) {
            if (!prev.find((u) => String(u.userId) === typingUserId)) {
              return [...prev, { userId: typingUserId, username }];
            }
          } else {
            return prev.filter((u) => String(u.userId) !== typingUserId);
          }
          return prev;
        });
      }

      if (
        lastMessage.type === "NEW_MESSAGE_BY_CUSTOMER" &&
        lastMessage.message.conversationId === conversationId &&
        currentRole === "AGENT"
      ) {
        await markAsReadByAgent(conversationId, lastMessage.message.id);
      } else if (
        lastMessage.type === "NEW_MESSAGE_BY_AGENT" &&
        lastMessage.message.conversationId === conversationId &&
        currentRole === "CUSTOMER"
      ) {
        await markAsReadByCustomer(conversationId, lastMessage.message.id);
      }

      if (
        (lastMessage.type === "NEW_MESSAGE_BY_CUSTOMER" ||
          lastMessage.type === "NEW_MESSAGE_BY_AGENT") &&
        lastMessage.message.conversationId === conversationId
      ) {
        setMessages((prev) => {
          const exists = prev.some((msg) => msg.id === lastMessage.message.id);
          if (exists) {
            return prev.map((msg) =>
              msg.id === lastMessage.message.id ? lastMessage.message : msg,
            );
          } else {
            return [...prev, lastMessage.message];
          }
        });
      }
    };

    processLastMessage();
  }, [lastMessage, conversationId, currentRole]);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await fetch(
          `${BACKEND_URL}/conversations/${conversationId.toString()}/messages`,
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
            readByCustomer: msg.readByCustomer,
            readByAgents: msg.readByAgents,
          })),
        );
      } catch (err) {
        console.error(err);
      }
    };

    markAllAsRead(conversationId, currentRole);
    fetchMessages();
  }, [conversationId, currentRole]);

  const handleSend = async () => {
    if (!input.trim()) return;

    try {
      const response = await fetch(
        `${BACKEND_URL}/conversations/${conversationId.toString()}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            senderId: currentUserId.toString(), // or currentUserId if string
            body: input.trim(),
            contentType: "TEXT",
            currentRole: currentRole,
          }),
        },
      );

      if (!response.ok) throw new Error("Failed to send message");

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

  const handleInputChange = (e) => {
    setInput(e.target.value);

    const currentUsername =
      participants.find((p) => String(p.userId) === String(currentUserId))?.user
        ?.username || "Unknown";

    const sendTypingStatus = async (isTyping) => {
      try {
        await fetch(
          `${BACKEND_URL}/conversations/${conversationId}/typing`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: currentUserId,
              username: currentUsername,
              isTyping,
            }),
          },
        );
      } catch (err) {
        console.error("Error sending typing status:", err);
      }
    };

    if (!isTyping) {
      setIsTyping(true);
      sendTypingStatus(true);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      sendTypingStatus(false);
    }, 1500);
  };

  const typingNames = typingUsers.map((u) =>
    String(u.userId) === String(currentUserId) ? "You" : u.username,
  );

  const verb =
    typingNames.length === 1
      ? typingNames[0] === "You"
        ? "are"
        : "is"
      : "are";

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="header-title">{businessName} Chat Support</div>
        <div className="participants-list">
          {participants.map((participant, index) => (
            <span
              key={participant.id}
              style={{
                display: "inline-flex",
                alignItems: "center",
                marginRight: 8,
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  backgroundColor: onlineUsers[participant.user.id]
                    ? "green"
                    : "red",
                  marginRight: 4,
                }}
              ></div>
              {participant.user?.username || "Unknown"} (
              {participant.role.toLowerCase()})
              {index < participants.length - 1 && <span>, </span>}
            </span>
          ))}
        </div>
      </div>

      <div className="chat-messages">
        {messages.map((msg) => {
          const isOwnMessage = msg.sender.id === currentUserId;
          const isUnread =
            currentRole === "CUSTOMER"
              ? !msg.readByAgents
              : !msg.readByCustomer;

          return (
            <div
              key={msg.id}
              className={`chat-message-container ${
                isOwnMessage ? "own-message" : "other-message"
              }`}
            >
              <div className="sender-label">
                {msg.sender.role === "AGENT"
                  ? `${businessName} • ${msg.sender.username}`
                  : msg.sender.username}
              </div>

              <div
                className={`chat-message ${isOwnMessage ? "right" : "left"}`}
              >
                <div className="message-body">{msg.body}</div>
                <div className="message-meta">
                  <small>
                    {new Date(msg.createdAt).toLocaleTimeString()}
                    <span
                      className={`status-tag ${isUnread ? "delivered" : "read"}`}
                    >
                      {isUnread ? " ✓ Delivered" : " ✓✓ Read"}
                    </span>
                  </small>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="typing-indicator">
        {typingUsers.length > 0 && (
          <small>
            {typingNames.join(", ")} {verb} typing...
          </small>
        )}
      </div>

      <div className="chat-input-container">
        <textarea
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Your message here"
          rows={2}
        />
        <button
          onClick={handleSend}
          aria-label="Send message"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          <img src="/send.svg" alt="Send" width={38} height={38} />
        </button>
      </div>
    </div>
  );
}
