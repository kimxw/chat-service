export const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:3001";
export const WEBSOCKET_URL = BACKEND_URL.replace(/^http/, "ws");
