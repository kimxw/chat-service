import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";

function parseJwt(token) {
  const base64Url = token.split(".")[1];
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split("")
      .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
      .join(""),
  );
  return JSON.parse(jsonPayload);
}

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.removeItem("token");
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const resp = await fetch("http://localhost:3001/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!resp.ok) {
      alert("Login failed!");
      return;
    }

    const { token } = await resp.json();
    localStorage.setItem("token", token);
    const payload = parseJwt(token);

    if (payload.role === "AGENT") {
      navigate("/agent");
    } else if (payload.role === "CUSTOMER") {
      navigate("/customer");
    } else {
      alert("Unknown user role");
    }
  };

  return (
    <div className="split-page">
      <div className="split-left"></div>
      <div className="split-right">
        <div className="login-box">
          <h1 className="form-title">Welcome Back</h1>
          <form onSubmit={handleSubmit} className="form-group">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="login-input"
              autoComplete="username"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="login-input"
              autoComplete="current-password"
            />
            <button type="submit" className="form-button">Login</button>
          </form>
          <div className="register-group">
            <button onClick={() => navigate("/register-customer")}>Register Client</button>
            <button onClick={() => navigate("/register-agent")}>Register Agent</button>
            <button onClick={() => navigate("/register-business")}>Register Business</button>
          </div>
          </div>
        </div>
      </div>
  );
}
