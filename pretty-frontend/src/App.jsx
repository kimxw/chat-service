import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./auth/Login";
import AgentDashboard from "./dashboards/AgentDashboard";
import CustomerDashboard from "./dashboards/CustomerDashboard";
import ChatInterface from "./chat/ChatInterface";

import "./dark-theme.css";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/agent" element={<AgentDashboard />} />
        <Route path="/customer" element={<CustomerDashboard />} />
        <Route path="/chatInterface" element={<ChatInterface />} />
        {/* add register routes here */}
      </Routes>
    </BrowserRouter>
  );
}
