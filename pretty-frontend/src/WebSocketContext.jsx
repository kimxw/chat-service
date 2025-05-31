import React, { createContext, useContext, useState, useEffect } from 'react';

const WebSocketContext = createContext();

export const useWebSocket = () => useContext(WebSocketContext);

export const WebSocketProvider = ({ userId, children }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!userId) return; // wait for user login

    const ws = new WebSocket(`ws://localhost:3001/ws?userId=${userId}`);

    ws.onopen = () => {
      console.log('WebSocket connection established');
    };

    ws.onclose = (event) => {
      console.log('WebSocket connection closed:', event);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, [userId]);

  return (
    <WebSocketContext.Provider value={socket}>
      {children}
    </WebSocketContext.Provider>
  );
};
