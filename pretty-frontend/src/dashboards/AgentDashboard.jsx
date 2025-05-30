import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';



export default function AgentDashboard() {
  const [userInfo, setUserInfo] = useState({ username: 'Loading...', role: 'Loading...', business: 'Loading...' });
  const [conversations, setConversations] = useState([]);
  const socket = useRef(null);
  const navigate = useNavigate();

  const token = localStorage.getItem('token') || prompt('Please enter your JWT token:');
    async function deleteChatForAllUsers(conversationId) {
        try {
            const resp = await fetch('http://localhost:3001/deleteChatForAll', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`, // Replace with your actual token logic
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
    const token = localStorage.getItem('token') || prompt('Please enter your JWT token:');
    if (!token) {
      alert('JWT token is required.');
      // You may want to redirect here or handle auth failure
      return;
    }

    async function fetchUserDetails() {
      try {
        const resp = await fetch('http://localhost:3001/getUserDetails', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await resp.json();
        if (resp.ok) {
          setUserInfo({ username: data.username, role: data.role, business: data.businessName });
        } else {
          alert(`Error: ${data.message || data.error || resp.statusText}`);
        }
      } catch (err) {
        console.error('Error loading user details:', err);
      }
    }

    async function fetchConversations() {
      try {
        const resp = await fetch('http://localhost:3001/getAgentChats', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await resp.json();
        if (Array.isArray(data.userAsParticipantList)) {
          setConversations(data.userAsParticipantList);
        } else {
          console.error('Unexpected response:', data);
          setConversations([]);
        }
      } catch (err) {
        console.error('Error loading conversations:', err);
      }
    }

    fetchUserDetails();
    fetchConversations();

    // Setup WebSocket connection
    socket.current = new WebSocket(`ws://localhost:3001/ws?token=${encodeURIComponent(token)}`);

    socket.current.onopen = () => {
      console.log('WebSocket connection opened');
    };

    socket.current.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'REFRESH_CHATS') {
        fetchConversations();
      }
    };

    socket.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    socket.current.onclose = (event) => {
      console.log(`WebSocket closed: code=${event.code}, reason=${event.reason}`);
    };

    // Clean up WebSocket on unmount
    return () => {
      if (socket.current) {
        socket.current.close();
      }
    };
  }, []);

return (
  <div style={{ fontFamily: 'Arial, sans-serif' }}>
    <header className="top-banner">
      <div className="app-name"><h1>ServiceHub</h1></div>
      <div className="user-info">
          <img src="/avatar.png" alt="User Avatar" className="user-avatar" />
          <span className="user-name">{userInfo.username ||'Loading...'} • Agent at {userInfo.business || 'Loading...'}</span>
      </div>
    </header>

    <div className="page-content">
      <h2>Conversations</h2>

      <div id="results">
        {conversations.length === 0 ? (
          <p>No conversations yet. Click above to create one.</p>
        ) : (
          
            conversations.map(({ conversation, role }) => (
                <div key={conversation.id} className="conversation-card" onClick={((() => navigate('/chatInterface')))} style={{ cursor: 'pointer' }}>
                <div className="conversation-type-badge">
                    {conversation.type}
                </div>

                <p>Conversation Id: {conversation.id}</p>
                <p className="business-name">{conversation.business.name}</p>
                <p><strong>Created At:</strong> {new Date(conversation.createdAt).toLocaleString()}</p>

                <button
                    className="delete-button"
                    onClick={() => deleteChatForAllUsers(conversation.id.toString())}
                >
                    <img src="/trashcan.png" alt="Delete" className="delete-icon" />
                </button>
                </div>
            ))
            
        )}
      </div>
    </div>
  </div>
);

}
