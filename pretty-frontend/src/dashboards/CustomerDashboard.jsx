import React, { useState, useEffect } from "react";
import "../App.css";
import { useNavigate } from "react-router-dom";
import { useWebSocket } from "../WebSocketContext"; // Import the context hook
import { BACKEND_URL } from "../constants";

export default function CustomerDashboard() {
  const [userInfo, setUserInfo] = useState({
    id: -1,
    username: "",
    role: "",
    business: "",
  });
  const [conversations, setConversations] = useState([]);
  const [businessId, setBusinessId] = useState("");
  const [businesses, setBusinesses] = useState([]);
  const [conversationType, setConversationType] = useState("");
  const conversationOptions = [
    { value: "DIRECT", label: "Direct" },
    { value: "SUPPORT_ROOM", label: "Support Room" },
    { value: "COMMUNITY", label: "Community" },
  ];

  const conversationTypeLabels = {
    DIRECT: "Direct",
    SUPPORT_ROOM: "Support Room",
    COMMUNITY: "Community",
  };

  const conversationTypeClasses = {
    DIRECT: "direct",
    SUPPORT_ROOM: "support-room",
    COMMUNITY: "community",
  };

  const { lastMessage, isWsConnected } = useWebSocket(); // Get WebSocket tools from context
  const navigate = useNavigate();

  // Helper to fetch conversations
  async function fetchConversations() {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const resp = await fetch(`${BACKEND_URL}/getClientChats`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (resp.ok) {
        const data = await resp.json();
        setConversations(data.userAsParticipantList || []);
      } else {
        console.error("Failed to fetch conversations:", resp.statusText);
      }
    } catch (err) {
      console.error("Error fetching conversations:", err);
    }
  }

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("JWT token required");
      return;
    }

    async function fetchUserDetails() {
      try {
        const resp = await fetch(`${BACKEND_URL}/getUserDetails`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (resp.ok) {
          const data = await resp.json();
          setUserInfo({
            id: data.id,
            username: data.username,
            role: data.role,
            business: data.businessName,
          });
        } else {
          alert("Failed to load user details");
        }
      } catch (err) {
        console.error("Error fetching user details:", err);
        alert("Failed to load user details");
      }
    }

    fetchUserDetails();
    fetchConversations();
  }, []);

  // Listen for REFRESH_CHATS via WebSocket
  useEffect(() => {
    if (lastMessage && lastMessage.type === "REFRESH_CHATS") {
      console.log("Received REFRESH_CHATS message");
      fetchConversations();
    }
  }, [lastMessage]);

  async function handleCreateConversation(e) {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) {
      alert("JWT token required");
      return;
    }
    if (!businessId.trim()) {
      alert("Please enter a Business ID.");
      return;
    }

    try {
      const resp = await fetch(`${BACKEND_URL}/createClientChat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          businessId: businessId.trim(),
          conversationType: conversationType,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        alert(`Error: ${data.message || data.error || resp.statusText}`);
        return;
      }
      // Add new conversation to list
      setConversations((prev) => [...prev, data.newParticipantEntry]);
      setBusinessId("");
    } catch (err) {
      console.error("Error creating conversation:", err);
      alert("Error creating conversation.");
    }
  }

  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/getAllBusinesses`);

        const data = await response.json();
        console.log(data);
        if (data.success) {
          setBusinesses(data.businesses);
        }
      } catch (error) {
        console.error("Error fetching businesses:", error);
      }
    };

    fetchBusinesses();
  }, []);

  return (
    <div style={{ fontFamily: "Arial, sans-serif", margin: "2rem" }}>
      <header className="top-banner">
        <div className="app-name">
          <h1>ServiceHub</h1>
        </div>
        <div className="user-info">
          <img src="/avatar.png" alt="User Avatar" className="user-avatar" />
          <span className="user-name">{userInfo.username || "Loading..."}</span>
        </div>
      </header>

      <div className="page-content">
        <h2>Conversations</h2>
        <div style={{ paddingBottom: "10px" }}>
          <form id="create-convo-form" onSubmit={handleCreateConversation}>
            <select
              value={businessId}
              onChange={(e) => setBusinessId(e.target.value)}
              required
              style={{ marginRight: "10px" }}
            >
              <option value="" disabled>
                Select a business
              </option>
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name}
                </option>
              ))}
            </select>

            <select
              value={conversationType}
              onChange={(e) => setConversationType(e.target.value)}
              required
              style={{ marginRight: "10px" }}
            >
              <option value="" disabled>
                Conversation Type
              </option>
              {conversationOptions.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>

            <button type="submit">Create Conversation</button>
          </form>
        </div>

        <div id="results">
          {conversations.length === 0 ? (
            <p>No conversations yet. Click above to create one.</p>
          ) : (
            conversations.map(({ conversation, role }) => (
              <div
                key={conversation.id}
                className="conversation-card"
                onClick={() => {
                  if (!isWsConnected) {
                    alert(
                      "Waiting for server connection. Please reload the page.",
                    );
                    window.location.reload();
                    return;
                  }
                  navigate("/chatInterface", {
                    state: {
                      currentUserId: userInfo.id,
                      conversationId: conversation.id,
                      currentRole: "CUSTOMER",
                      businessName: conversation.business.name,
                    },
                  });
                }}
                style={{ cursor: "pointer" }}
              >
                <div
                  className={`conversation-type-badge ${conversationTypeClasses[conversation.type]}`}
                >
                  {conversationTypeLabels[conversation.type] ||
                    conversation.type}
                </div>
                <p>Conversation Id: {conversation.id}</p>
                <p
                  style={{
                    fontSize: "30px",
                    fontWeight: "bold",
                    paddingBottom: "1px",
                  }}
                >
                  {conversation.business.name}
                </p>
                <p>
                  <strong>Created At:</strong>{" "}
                  {new Date(conversation.createdAt).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
