import { useState } from "react";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Phone,
  Recycle,
  Leaf,
  Users,
  Globe,
  ArrowRight,
  UserPlus,
  Truck,
  Building2,
  ShieldCheck
} from "lucide-react";
import EcoPlasticLogo from "../components/EcoPlasticLogo";
import { useAuth } from "../context/AuthContext";
import { loginUser, registerUser, resetPassword } from "../services/authService";

export default function Auth() {
  const { refreshAuth } = useAuth();
  const [mode, setMode] = useState("login");
  const [selectedRole, setSelectedRole] = useState("customer");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [f, setF] = useState({
    name: "",
    email: "",
    password: "",
    phone: ""
  });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const handleRoleCardClick = (role) => {
    setSelectedRole(role);
    if (role === "admin") {
      setMode("login");
      setF((prev) => ({
        ...prev,
        email: "admin@ecoplastic.com",
        password: "admin123"
      }));
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    setErr("");
    try {
      if (mode === "login") {
        await loginUser(f.email, f.password);
      } else {
        await registerUser({
          ...f,
          role: selectedRole
        });
      }
      await refreshAuth();
    } catch (e) {
      setErr(e.message || "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    if (!f.email) {
      setErr("Please enter your email address first.");
      return;
    }
    setErr("");
    try {
      await resetPassword(f.email);
      setMsg("Password reset email sent.");
    } catch (e) {
      setErr(e.message || "Failed to reset password");
    }
  };

  return (
    <div className="auth-wrapper">
      {/* 1. TOP WHITE NAVBAR */}
      <header className="auth-navbar">
        <div className="auth-nav-left">
          <EcoPlasticLogo size={36} />
        </div>

        <nav className="auth-nav-center">
          <a href="#home" className="nav-link">Home</a>
          <a href="#about" className="nav-link">About</a>
          <a href="#how-it-works" className="nav-link">How It Works</a>
          <a href="#contact" className="nav-link">Contact</a>
        </nav>

        <div className="auth-nav-right">
          <span className="navbar-tagline">Recycle Today. Greener Tomorrow.</span>
        </div>
      </header>

      {/* 2. MAIN 55/45 SPLIT */}
      <main className="auth-main-container">
        {/* LEFT HERO */}
        <section className="auth-hero-pane">
          <div className="hero-content-overlay">
            <h1 className="hero-main-title">
              Turn Plastic Waste<br />
              <span className="green-accent-text">into a Cleaner Tomorrow</span>
            </h1>

            <p className="hero-subtext">
              EcoPlastic connects you with a cleaner, greener future by helping you collect,
              recycle and repurpose plastic waste.
            </p>

            <div className="hero-features-bar">
              <div className="feature-item">
                <div className="feature-circle">
                  <Recycle size={22} color="#008F5A" />
                </div>
                <span>Reduce<br />Plastic Waste</span>
              </div>

              <div className="feature-item">
                <div className="feature-circle">
                  <Leaf size={22} color="#008F5A" />
                </div>
                <span>Support<br />Recycling</span>
              </div>

              <div className="feature-item">
                <div className="feature-circle">
                  <Users size={22} color="#008F5A" />
                </div>
                <span>Earn<br />Eco Points</span>
              </div>

              <div className="feature-item">
                <div className="feature-circle">
                  <Globe size={22} color="#008F5A" />
                </div>
                <span>Build a<br />Greener Planet</span>
              </div>
            </div>
          </div>
        </section>

        {/* RIGHT LOGIN / REGISTER CARD */}
        <section className="auth-card-pane">
          <div className="auth-card-box">
            <div className="auth-card-header">
              <EcoPlasticLogo size={38} />
              <h2 className="auth-card-title">
                {mode === "login" ? "Welcome Back!" : "Join EcoPlastic"}
              </h2>
              <p className="auth-card-subtitle">
                {mode === "login"
                  ? "Login to your account to continue"
                  : "Create an account to start recycling & earning points"}
              </p>
            </div>

            {msg && <div className="auth-alert success">{msg}</div>}
            {err && <div className="auth-alert error">{err}</div>}

            <form onSubmit={submit} className="auth-form-body">
              {mode === "register" && (
                <>
                  <div className="auth-input-group">
                    <User size={18} className="input-icon" />
                    <input
                      required
                      type="text"
                      placeholder="Full Name"
                      value={f.name}
                      onChange={(e) => setF({ ...f, name: e.target.value })}
                    />
                  </div>

                  <div className="auth-input-group">
                    <Phone size={18} className="input-icon" />
                    <input
                      required
                      type="tel"
                      placeholder="Phone Number"
                      value={f.phone}
                      onChange={(e) => setF({ ...f, phone: e.target.value })}
                    />
                  </div>

                  <div className="auth-input-group">
                    <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#4b5563", paddingLeft: "10px" }}>
                      Role:
                    </span>
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      style={{ border: 0, outline: "none", background: "none", flex: 1, padding: "10px" }}
                    >
                      <option value="customer">Customer</option>
                      <option value="driver">Driver</option>
                      <option value="buyer">Buyer</option>
                    </select>
                  </div>
                </>
              )}

              <div className="auth-input-group">
                <Mail size={18} className="input-icon" />
                <input
                  required
                  type="email"
                  placeholder="Email Address"
                  value={f.email}
                  onChange={(e) => setF({ ...f, email: e.target.value })}
                />
              </div>

              <div className="auth-input-group">
                <Lock size={18} className="input-icon" />
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={f.password}
                  onChange={(e) => setF({ ...f, password: e.target.value })}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {mode === "login" && (
                <div className="auth-helpers-row">
                  <label className="remember-me-checkbox">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span>Remember me</span>
                  </label>

                  <button type="button" className="forgot-password-link" onClick={forgot}>
                    Forgot password?
                  </button>
                </div>
              )}

              <button type="submit" className="auth-btn-primary" disabled={busy}>
                <span>{busy ? "Please wait..." : mode === "login" ? "Login" : "Create Account"}</span>
                <ArrowRight size={18} />
              </button>
            </form>

            <div className="auth-divider">
              <span>or</span>
            </div>

            <div className="auth-switch-section">
              <p className="auth-switch-prompt">
                {mode === "login" ? "New to EcoPlastic?" : "Already have an account?"}
              </p>
              <button
                type="button"
                className="auth-btn-outlined"
                onClick={() => {
                  setMode(mode === "login" ? "register" : "login");
                  setErr("");
                  setMsg("");
                }}
              >
                {mode === "login" ? (
                  <>
                    <UserPlus size={18} /> Create an Account
                  </>
                ) : (
                  "Back to Login"
                )}
              </button>
            </div>

            {/* FOUR ROLE CARDS AT BOTTOM */}
            <div className="auth-roles-grid">
              <button
                type="button"
                className={`role-select-card ${selectedRole === "customer" ? "active" : ""}`}
                onClick={() => handleRoleCardClick("customer")}
              >
                <div className="role-card-icon">
                  <User size={18} />
                </div>
                <span>Customer</span>
              </button>

              <button
                type="button"
                className={`role-select-card ${selectedRole === "driver" ? "active" : ""}`}
                onClick={() => handleRoleCardClick("driver")}
              >
                <div className="role-card-icon">
                  <Truck size={18} />
                </div>
                <span>Driver</span>
              </button>

              <button
                type="button"
                className={`role-select-card ${selectedRole === "buyer" ? "active" : ""}`}
                onClick={() => handleRoleCardClick("buyer")}
              >
                <div className="role-card-icon">
                  <Building2 size={18} />
                </div>
                <span>Buyer</span>
              </button>

              <button
                type="button"
                className={`role-select-card ${selectedRole === "admin" ? "active" : ""}`}
                onClick={() => handleRoleCardClick("admin")}
              >
                <div className="role-card-icon">
                  <ShieldCheck size={18} />
                </div>
                <span>Admin</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* 3. FOOTER */}
      <footer className="auth-footer">
        <p>© 2025 EcoPlastic. All rights reserved.</p>
      </footer>
    </div>
  );
}
