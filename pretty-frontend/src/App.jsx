import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./auth/Login";
import AgentDashboard from "./dashboards/AgentDashboard";
import CustomerDashboard from "./dashboards/CustomerDashboard";
import ChatInterface from "./chat/ChatInterface";
import RegisterAgent from "./register/RegisterAgent";
import RegisterBusiness from "./register/RegisterBusiness";
import RegisterCustomer from "./register/RegisterCustomer";

import "./dark-theme.css";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/agent" element={<AgentDashboard />} />
        <Route path="/customer" element={<CustomerDashboard />} />
        <Route path="/chatInterface" element={<ChatInterface />} />
        <Route path="/register-customer" element={<RegisterCustomer />} />
        <Route path="/register-agent" element={<RegisterAgent />} />
        <Route path="/register-business" element={<RegisterBusiness />} />
      </Routes>
    </BrowserRouter>
  );
}