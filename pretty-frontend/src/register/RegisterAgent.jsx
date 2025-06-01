import React, { useState, useEffect } from "react";

export default function RegisterAgent() {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    businessId: "",
  });

  const [businesses, setBusinesses] = useState([]);

  useEffect(() => {
    const fetchBusinesses = async () => {
      try {
        const response = await fetch("http://localhost:3001/getAllBusinesses");
        const data = await response.json();
        if (data.success) {
          setBusinesses(data.businesses);
        } else {
          alert("Failed to fetch businesses");
        }
      } catch (error) {
        console.error("Error fetching businesses:", error);
      }
    };

    fetchBusinesses();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const resp = await fetch("http://localhost:3001/register-agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!resp.ok) {
      const err = await resp.json();
      alert("Failed to register agent: " + (err.error || resp.statusText));
      return;
    }

    alert("Agent registered successfully!");
    setForm({ username: "", email: "", password: "", businessId: "" });
  };

  return (
    <div className="split-page">
      <div className="split-left"></div>
      <div className="split-right">
        <h1 className="form-title">Register Agent</h1>
        <form onSubmit={handleSubmit} className="form-group">
          <input className="form-input" name="username" placeholder="Username" required value={form.username} onChange={handleChange} />
          <input className="form-input" type="email" name="email" placeholder="Email" required value={form.email} onChange={handleChange} />
          <input className="form-input" type="password" name="password" placeholder="Password" required value={form.password} onChange={handleChange} />
            <select
                className="form-input"
                name="businessId"
                required
                value={form.businessId}
                onChange={handleChange}
                style={{
                    marginRight: "10px",
                    fontSize: "0.9rem", // this sets the text size
                }}
            >
            <option value="" disabled>Select Business</option>
                {businesses.map((business) => (
                    <option key={business.id} value={business.id}>
                    {business.name}
                    </option>
                ))}
            </select>          
            <button type="submit" className="form-button">Register Agent</button>
        </form>
      </div>
    </div>
  );
}
