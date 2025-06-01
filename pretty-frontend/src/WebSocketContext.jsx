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
  const [userId, setUserId] = useState(null);
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

    console.log("Establishing WebSocket for userId:", userId);
    const token = localStorage.getItem("token");
    const socket = new WebSocket(
      `ws://localhost:3001/ws?token=${encodeURIComponent(token)}`
    );

    socketRef.current = socket;

    socket.onopen = () => {
      console.log("WebSocket opened");
      setIsWsConnected(true);
      setWs(socket);
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      setLastMessage(message);
    };

    socket.onerror = (err) => {
      console.error("WebSocket error:", err);
    };

    socket.onclose = (event) => {
      console.log(`WebSocket closed: ${event.code} ${event.reason}`);
      setIsWsConnected(false);
      setWs(null);
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
