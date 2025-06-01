import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { WebSocketProvider } from "./WebSocketContext";

const userId = localStorage.getItem("userId"); // Example, or use auth state

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <WebSocketProvider userId={userId}>
    <App />
  </WebSocketProvider>,
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
