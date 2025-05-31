import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

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
    <div style={styles.container}>
      <h1 style={styles.title}>Login</h1>
      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          name="username"
          placeholder="Username"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={styles.input}
          autoComplete="username"
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
          autoComplete="current-password"
        />
        <button type="submit" style={styles.loginButton}>
          Login
        </button>
      </form>

      <div style={styles.registerContainer}>
        <button
          onClick={() => navigate("/register-client")}
          style={styles.registerButton}
        >
          Register Client
        </button>
        <button
          onClick={() => navigate("/register-agent")}
          style={styles.registerButton}
        >
          Register Agent
        </button>
        <button
          onClick={() => navigate("/register-business")}
          style={styles.registerButton}
        >
          Register Business
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 400,
    margin: "5rem auto",
    padding: "2rem",
    borderRadius: 12,
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    backgroundColor: "#fff",
  },
  title: {
    textAlign: "center",
    marginBottom: "1.5rem",
    color: "#222",
  },
  form: {
    display: "flex",
    flexDirection: "column",
  },
  input: {
    padding: "0.75rem 1rem",
    marginBottom: "1rem",
    fontSize: 16,
    borderRadius: 8,
    border: "1.5px solid #ddd",
    outline: "none",
    transition: "border-color 0.3s",
  },
  loginButton: {
    padding: "0.75rem",
    fontSize: 18,
    borderRadius: 8,
    border: "none",
    backgroundColor: "#007bff",
    color: "#fff",
    cursor: "pointer",
    fontWeight: "bold",
    transition: "background-color 0.3s",
  },
  registerContainer: {
    marginTop: "2rem",
    display: "flex",
    justifyContent: "space-between",
  },
  registerButton: {
    flex: 1,
    margin: "0 0.3rem",
    padding: "0.5rem 1rem",
    fontSize: 14,
    borderRadius: 8,
    border: "1.5px solid #007bff",
    backgroundColor: "white",
    color: "#007bff",
    cursor: "pointer",
    transition: "background-color 0.3s, color 0.3s",
  },
};
