import React, { useState } from "react";
import { BACKEND_URL } from "../constants";

export default function RegisterBusiness() {
  const [name, setName] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const resp = await fetch(`${BACKEND_URL}/register-business`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    if (!resp.ok) {
      const err = await resp.json();
      alert("Failed to register business: " + (err.error || resp.statusText));
      return;
    }

    alert("Business registered successfully!");
    setName("");
  };

  return (
    <div className="split-page">
      <div className="split-left"></div>
      <div className="split-right">
        <h1 className="form-title">Register Business</h1>
        <form onSubmit={handleSubmit} className="form-group">
          <input className="form-input" name="name" placeholder="Business Name" required value={name} onChange={(e) => setName(e.target.value)} />
          <button type="submit" className="form-button">Register Business</button>
        </form>
      </div>
    </div>
  );
}
