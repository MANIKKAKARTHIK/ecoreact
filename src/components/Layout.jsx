import {
  Home,
  Recycle,
  Package,
  Star,
  User,
  Bell,
  LogOut,
  Menu,
  X,
  Search,
  ChevronDown,
  Leaf,
  Truck,
  Wallet,
  Users,
  Building2,
  ShieldCheck,
  CheckCheck
} from "lucide-react";
import { useState, useEffect } from "react";
import EcoPlasticLogo from "./EcoPlasticLogo";
import { useAuth } from "../context/AuthContext";
import { logoutUser } from "../services/authService";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from "../services/dataService";

export default function Layout({ children, role = "customer", activeTab = "dashboard", onTabChange }) {
  const { user, profile } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifs = async () => {
    try {
      const list = await getNotifications();
      if (Array.isArray(list)) {
        setNotifications(list);
        setUnreadCount(list.filter((n) => !n.read).length);
      }
    } catch {
      // Ignore network / offline
    }
  };

  useEffect(() => {
    fetchNotifs();
    const timer = setInterval(fetchNotifs, 15000);
    return () => clearInterval(timer);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkOne = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (e) {
      console.error(e);
    }
  };

  const notifBadge = unreadCount > 0 ? unreadCount : undefined;

  // Sidebar items definition per role matching screenshots dynamically
  const getSidebarItems = () => {
    if (role === "driver") {
      return [
        { key: "dashboard", label: "Dashboard", icon: <Home size={19} /> },
        { key: "orders", label: "My Orders", icon: <Package size={19} /> },
        { key: "pickup", label: "Pickup & Delivery", icon: <Truck size={19} /> },
        { key: "earnings", label: "Earnings", icon: <Wallet size={19} /> },
        { key: "notifications", label: "Notifications", icon: <Bell size={19} />, badge: notifBadge },
        { key: "profile", label: "Profile", icon: <User size={19} /> }
      ];
    }

    if (role === "buyer") {
      return [
        { key: "dashboard", label: "Dashboard", icon: <Home size={19} /> },
        { key: "marketplace", label: "Marketplace", icon: <Package size={19} /> },
        { key: "orders", label: "My Purchases", icon: <Building2 size={19} /> },
        { key: "notifications", label: "Notifications", icon: <Bell size={19} />, badge: notifBadge },
        { key: "profile", label: "Profile", icon: <User size={19} /> }
      ];
    }

    if (role === "admin") {
      return [
        { key: "dashboard", label: "Dashboard", icon: <Home size={19} /> },
        { key: "users", label: "Users", icon: <Users size={19} /> },
        { key: "orders", label: "Orders Audit", icon: <Package size={19} /> },
        { key: "pricing", label: "Pricing Controls", icon: <ShieldCheck size={19} /> },
        { key: "notifications", label: "Notifications", icon: <Bell size={19} />, badge: notifBadge }
      ];
    }

    // Default Customer menu matching Screen 2
    return [
      { key: "dashboard", label: "Dashboard", icon: <Home size={19} /> },
      { key: "make_plastic", label: "Make Plastic Available", icon: <Recycle size={19} /> },
      { key: "orders", label: "My Orders", icon: <Package size={19} /> },
      { key: "points", label: "Eco Points", icon: <Star size={19} /> },
      { key: "profile", label: "My Profile", icon: <User size={19} /> },
      { key: "notifications", label: "Notifications", icon: <Bell size={19} />, badge: notifBadge }
    ];
  };

  const navItems = getSidebarItems();

  const handleNavClick = (key) => {
    if (onTabChange) onTabChange(key);
    setMobileOpen(false);
  };

  const searchPlaceholder =
    role === "driver"
      ? "Search orders, locations, or customers..."
      : role === "buyer"
      ? "Search available plastic, locations..."
      : "Search for plastic types, orders...";

  const displayRole = role.charAt(0).toUpperCase() + role.slice(1);
  const displayName = profile?.name || (user?.email ? user.email.split("@")[0] : displayRole);

  return (
    <div className="app-container">
      {/* 1. FIXED DARK GREEN SIDEBAR */}
      <aside className={`app-sidebar ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-top">
          <div className="sidebar-logo-area">
            <EcoPlasticLogo light={true} size={34} />
          </div>

          <nav className="sidebar-nav-menu">
            {navItems.map((item) => {
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`sidebar-nav-item ${isActive ? "active" : ""}`}
                  onClick={() => handleNavClick(item.key)}
                >
                  <div className="sidebar-item-left">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>

                  {item.badge !== undefined && (
                    <span className={`sidebar-badge ${item.badgeColor === "green" ? "green" : ""}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            <button type="button" className="sidebar-nav-item" onClick={logoutUser}>
              <div className="sidebar-item-left">
                <LogOut size={19} />
                <span>Logout</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Sidebar Bottom Illustration */}
        <div className="sidebar-bottom">
          <div className="sidebar-illustration-circle">
            <img src="/images/earth-globe.jpg" alt="Eco Earth" />
          </div>
          <p className="sidebar-bottom-quote">
            {role === "driver" ? (
              <>Cleaner Environment<br />Brighter Future</>
            ) : (
              <>Small actions<br />make a big difference</>
            )}
          </p>
          <Leaf size={14} className="sidebar-small-leaf" />
        </div>
      </aside>

      {/* 2. APP MAIN BODY */}
      <div className="app-main-body">
        {/* Top Header */}
        <header className="app-top-header">
          <div className="header-left-group">
            <button
              type="button"
              className="hamburger-btn"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>

            <div className="header-search-bar">
              <Search size={17} color="#9CA3AF" />
              <input type="text" placeholder={searchPlaceholder} />
            </div>
          </div>

          <div className="header-right-group">
            {/* Notification Bell with Badge */}
            <div style={{ position: "relative" }}>
              <button
                type="button"
                className="header-notif-btn"
                onClick={() => {
                  setShowNotifs(!showNotifs);
                  if (!showNotifs) fetchNotifs();
                }}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="notif-bubble-badge">{unreadCount}</span>
                )}
              </button>

              {/* Notification Popover */}
              {showNotifs && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "44px",
                    width: "330px",
                    maxHeight: "380px",
                    overflowY: "auto",
                    background: "#FFFFFF",
                    border: "1px solid #E5EBE7",
                    borderRadius: "14px",
                    boxShadow: "0 14px 40px rgba(0, 40, 20, 0.12)",
                    zIndex: 100,
                    padding: "16px"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <b style={{ fontSize: "0.95rem" }}>Notifications</b>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        style={{ border: 0, background: "none", color: "#008F5A", fontSize: "0.8rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                      >
                        <CheckCheck size={14} /> Mark all read
                      </button>
                    )}
                  </div>

                  {notifications.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "16px", color: "#6C7D73", fontSize: "0.85rem" }}>
                      No notifications.
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => !n.read && handleMarkOne(n.id)}
                        style={{
                          padding: "10px 12px",
                          borderRadius: "10px",
                          marginBottom: "8px",
                          backgroundColor: n.read ? "#F9FAFB" : "#ECF9F1",
                          border: n.read ? "1px solid #F3F4F6" : "1px solid #D2EBD9",
                          cursor: n.read ? "default" : "pointer"
                        }}
                      >
                        <div style={{ fontWeight: 600, fontSize: "0.86rem", color: n.read ? "#374151" : "#0E3B27" }}>
                          {n.title}
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "#4B5563", marginTop: "3px" }}>
                          {n.message}
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "#9CA3AF", marginTop: "4px" }}>
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Profile Pill with Avatar, Name, Role, and Chevron */}
            <div style={{ position: "relative" }}>
              <div
                className="header-user-profile"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
              >
                <img src="/images/avatar.jpg" alt={displayName} className="header-avatar-img" />
                <div className="header-user-meta">
                  <span className="header-user-name">{displayName}</span>
                  <span className="header-user-role">{displayRole}</span>
                </div>
                <ChevronDown size={16} color="#6B7280" />
              </div>

              {showProfileMenu && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "50px",
                    width: "180px",
                    background: "#FFFFFF",
                    border: "1px solid #E5EBE7",
                    borderRadius: "10px",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
                    zIndex: 100,
                    padding: "6px"
                  }}
                >
                  <button
                    type="button"
                    onClick={logoutUser}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      border: 0,
                      background: "none",
                      color: "#DC2626",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      borderRadius: "6px"
                    }}
                  >
                    <LogOut size={16} /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main>{children}</main>
      </div>
    </div>
  );
}
