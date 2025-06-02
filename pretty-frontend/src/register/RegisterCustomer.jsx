import React, { useState } from "react";
import { BACKEND_URL } from "../constants";

export default function RegisterCustomer() {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const resp = await fetch(`${BACKEND_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, role: "CUSTOMER" }),
    });

    const text = await resp.text();
    console.log("Response:", resp.status, resp.statusText, text);

    if (!resp.ok) {
      alert("Failed to register customer");
      return;
    }

    alert("Client registered successfully!");
    setForm({ username: "", email: "", password: "" });
  };

  return (
    <div className="split-page">
      <div className="split-left"></div>
      <div className="split-right">
        <h1 className="form-title">Register Client</h1>
        <form onSubmit={handleSubmit} className="form-group">
          <input className="form-input" name="username" placeholder="Username" required value={form.username} onChange={handleChange} />
          <input className="form-input" type="email" name="email" placeholder="Email" required value={form.email} onChange={handleChange} />
          <input className="form-input" type="password" name="password" placeholder="Password" required value={form.password} onChange={handleChange} />
          <button type="submit" className="form-button">Register Client</button>
        </form>
      </div>
    </div>
  );
}
