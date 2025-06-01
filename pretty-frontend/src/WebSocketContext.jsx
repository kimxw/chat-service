import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { jwtDecode } from "jwt-decode";

const WebSocketContext = createContext();

export const WebSocketProvider = ({ children }) => {
  const [lastMessage, setLastMessage] = useState(null);
  const [userId, setUserId] = useState(null); // keep userId in state here
  const socketRef = useRef(null);
  const [ws, setWs] = useState(null);
  const [isWsConnected, setIsWsConnected] = useState(false);

  // Decode token once on mount to set userId
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        setUserId(decoded.userId || decoded.id);
      } catch (err) {
        console.error("Failed to decode token", err);
        setUserId(null);
      }
    }
  }, []);

  // Open WebSocket connection only when userId is known
  useEffect(() => {
    if (!userId) return;

    console.log(userId);
    console.log("trying to open websocket");

    const token = localStorage.getItem("token");
    socketRef.current = new WebSocket(
      `ws://localhost:3001/ws?token=${encodeURIComponent(token)}`,
    );

    socketRef.current.onopen = () => {
      console.log("WebSocket opened");
      setIsWsConnected(true);
    };

    socketRef.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      setLastMessage(message);
    };

    socketRef.current.onerror = (err) => {
      console.error("WebSocket error:", err);
    };

    socketRef.current.onclose = (event) => {
      console.log(`WebSocket closed: ${event.code} ${event.reason}`);
      setIsWsConnected(false);
    };

    return () => {
      socketRef.current?.close();
    };
  }, [userId]);

  const sendMessage = (msg) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(msg));
    } else {
      console.warn("WebSocket not connected");
    }
  };

  return (
    <WebSocketContext.Provider
      value={{ ws, lastMessage, sendMessage, userId, isWsConnected }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => useContext(WebSocketContext);

export { WebSocketContext };
