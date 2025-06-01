import React, { useState, useEffect, useContext } from "react";
import { useNavigate, Outlet } from "react-router-dom";
import { WebSocketContext } from "../WebSocketContext";

export default function AgentDashboard() {
  const [userInfo, setUserInfo] = useState({
    id: -1,
    username: "Loading...",
    role: "Loading...",
    business: "Loading...",
  });
  const [conversations, setConversations] = useState([]);
  const { sendMessage, lastMessage, userId, isWsConnected } =
    useContext(WebSocketContext); // Get the WebSocket tools

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  async function deleteChatForAllUsers(conversationId) {
    try {
      const resp = await fetch("http://localhost:3001/deleteChatForAll", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ conversationId }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        console.error("Error deleting chat:", data.message);
        alert("Failed to delete chat: " + data.message);
        return;
      }

      console.log("Chat deleted successfully:", data.message);
      alert("Chat deleted successfully!");
    } catch (error) {
      console.error("Error:", error);
      alert("An error occurred while deleting the chat.");
    }
  }

  useEffect(() => {
    if (!token) {
      alert("JWT token is required.");
      return;
    }

    async function fetchUserDetails() {
      try {
        const resp = await fetch("http://localhost:3001/getUserDetails", {
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
          const data = await resp.json();
          alert(`Error: ${data.message || data.error || resp.statusText}`);
        }
      } catch (err) {
        console.error("Error loading user details:", err);
      }
    }

    async function fetchConversations() {
      try {
        const resp = await fetch("http://localhost:3001/getAgentChats", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (Array.isArray(data.userAsParticipantList)) {
            setConversations(data.userAsParticipantList);
          } else {
            console.error("Unexpected response:", data);
            setConversations([]);
          }
        }
      } catch (err) {
        console.error("Error loading conversations:", err);
      }
    }

    fetchUserDetails();
    fetchConversations();
  }, [token]); // Runs once on mount or token change

  useEffect(() => {
    // React to WebSocket lastMessage updates
    if (lastMessage?.type === "REFRESH_CHATS") {
      async function refreshConversations() {
        try {
          const resp = await fetch("http://localhost:3001/getAgentChats", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (resp.ok) {
            const data = await resp.json();
            if (Array.isArray(data.userAsParticipantList)) {
              setConversations(data.userAsParticipantList);
            } else {
              console.error("Unexpected response:", data);
              setConversations([]);
            }
          }
        } catch (err) {
          console.error("Error refreshing conversations:", err);
        }
      }
      refreshConversations();
    }
  }, [lastMessage, token]);

  return (
    <div style={{ fontFamily: "Arial, sans-serif" }}>
      <Outlet />
      <header className="top-banner">
        <div className="app-name">
          <h1>ServiceHub</h1>
        </div>
        <div className="user-info">
          <img src="/avatar.png" alt="User Avatar" className="user-avatar" />
          <span className="user-name">
            {userInfo.username || "Loading..."} • Agent at{" "}
            {userInfo.business || "Loading..."}
          </span>
        </div>
      </header>

      <div className="page-content">
        <h2>Conversations</h2>

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
                      currentRole: "AGENT",
                      businessName: conversation.business.name,
                    },
                  });
                }}
                style={{ cursor: "pointer" }}
              >
                <div className="conversation-type-badge">
                  {conversation.type}
                </div>

                <p>Conversation Id: {conversation.id}</p>
                <p className="business-name">{conversation.business.name}</p>
                <p>
                  <strong>Created At:</strong>{" "}
                  {new Date(conversation.createdAt).toLocaleString()}
                </p>

                <button
                  className="delete-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteChatForAllUsers(conversation.id.toString());
                  }}
                >
                  <img
                    src="/trashcan.png"
                    alt="Delete"
                    className="delete-icon"
                  />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
