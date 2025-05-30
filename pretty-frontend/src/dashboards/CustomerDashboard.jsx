import React, { useState, useEffect, useRef } from 'react';
import '../App.css';


export default function CustomerDashboard() {
  const [userInfo, setUserInfo] = useState({ username: '', role: '', business: '' });
  const [conversations, setConversations] = useState([]);
  const [businessId, setBusinessId] = useState('');
  const socket = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('JWT token required');
      // TODO: Redirect to login or handle as needed
      return;
    }

    async function fetchUserDetails() {
      const resp = await fetch('http://localhost:3001/getUserDetails', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        const data = await resp.json();
        setUserInfo({ username: data.username, role: data.role, business: data.businessName });
      } else {
        alert('Failed to load user details');
      }
    }

    async function fetchConversations() {
      const resp = await fetch('http://localhost:3001/getClientChats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        const data = await resp.json();
        setConversations(data.userAsParticipantList || []);
      }
    }

    fetchUserDetails();
    fetchConversations();

    // Setup WebSocket
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

    return () => {
      socket.current?.close();
    };
  }, []);

  async function handleCreateConversation(e) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
      alert('JWT token required');
      return;
    }
    if (!businessId.trim()) {
      alert('Please enter a Business ID.');
      return;
    }

    try {
      const resp = await fetch('http://localhost:3001/createClientChat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ businessId: businessId.trim() }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        alert(`Error: ${data.message || data.error || resp.statusText}`);
        return;
      }
      // Add new conversation to list
      setConversations((prev) => [...prev, data.newParticipantEntry]);
      setBusinessId('');
    } catch (err) {
      console.error('Error creating conversation:', err);
      alert('Error creating conversation.');
    }
  }

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', margin: '2rem' }}>
      <header className="top-banner">
        <div className="app-name"><h1>ServiceHub</h1></div>
        <div className="user-info">
            <img src="/avatar.png" alt="User Avatar" className="user-avatar" />
            <span className="user-name">{userInfo.username || 'Loading...'}</span>
        </div>
      </header>
      <div className="page-content">
      <h2>Conversations</h2>
      
      <form id="create-convo-form" onSubmit={handleCreateConversation}>
        <input
          type="text"
          placeholder="Enter Business ID"
          value={businessId}
          onChange={(e) => setBusinessId(e.target.value)}
        />
        <button type="submit">
          Create Conversation
        </button>
      </form>

        <div id="results">
                {conversations.length === 0 ? (
                <p>No conversations yet. Click above to create one.</p>
                ) : (
                conversations.map(({ conversation, role }) => (
                <div key={conversation.id} className="conversation-card">
                    <div className="conversation-type-badge">
                        {conversation.type}
                    </div>
                <p>Conversation Id: {conversation.id}</p>
                <p style={{ fontSize: '30px', fontWeight: 'bold', paddingBottom:'1px' }}>{conversation.business.name}</p>
                <p><strong>Created At:</strong> {new Date(conversation.createdAt).toLocaleString()}</p>
                </div>
            ))
                )}
            </div>
      </div>
    </div>
  );
}
