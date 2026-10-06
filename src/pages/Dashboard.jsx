import { useEffect, useState } from "react";
import {
  Recycle,
  Package,
  Star,
  User,
  Leaf,
  Truck,
  Coins,
  MapPin,
  Clock,
  ArrowRight,
  ChevronRight,
  Phone,
  Check,
  PlusCircle,
  X,
  ShoppingCart,
  Building2,
  Users,
  ShieldCheck,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import {
  advanceOrder,
  confirmCash,
  createAvailablePlastic,
  listCollection,
  placeOrder,
  getAdminStats,
  updatePricing,
  toggleUserStatus,
  saveUserProfile,
  getPricing,
  getInventory,
  getOrders,
  getPlasticListings
} from "../services/dataService";

const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

// ========================================================
// 1. CUSTOMER DASHBOARD (SCREEN 2)
// ========================================================
function CustomerDashboard({ onOpenModal, onOpenProfileModal }) {
  const { user, profile, refreshAuth } = useAuth();
  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [pricing, setPricing] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    if (!user) return;
    try {
      setError("");
      const [userItems, userOrders, priceList, invList] = await Promise.all([
        listCollection("availablePlastic", "customerId", user.uid),
        getOrders({ customerId: user.uid }),
        getPricing(),
        getInventory()
      ]);
      setItems(Array.isArray(userItems) ? userItems : []);
      setOrders(Array.isArray(userOrders) ? userOrders : []);
      setPricing(Array.isArray(priceList) ? priceList : []);
      setInventory(Array.isArray(invList) ? invList : []);
    } catch (err) {
      console.error("Failed to load customer dashboard data:", err);
      setError("Unable to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const activeOrders = orders.filter((o) => o.status !== "completed" && o.status !== "cancelled");
  const activeOrder = activeOrders[0] || null;
  const completedOrders = orders.filter((o) => o.status === "completed");
  const totalRecycledKg = completedOrders.reduce((sum, o) => sum + (Number(o.quantityKg) || 0), 0);

  // Stepper helper
  const getStepStatus = (stepName) => {
    if (!activeOrder) return "pending";
    const flow = [
      "placed",
      "driver_accepted",
      "arrived_customer",
      "collected",
      "delivering",
      "arrived_buyer",
      "payment_pending",
      "completed"
    ];
    const currentIdx = flow.indexOf(activeOrder.status);

    if (stepName === "requested") return currentIdx >= 0 ? "completed" : "pending";
    if (stepName === "accepted") return currentIdx >= 1 ? "completed" : "pending";
    if (stepName === "pickup") return currentIdx >= 3 ? "completed" : currentIdx >= 1 ? "active" : "pending";
    if (stepName === "delivered") return currentIdx >= 6 ? "completed" : "pending";
    return "pending";
  };

  // Build dynamic recent activity list from real customer listings and orders
  const recentActivities = [];
  items.forEach((item) => {
    recentActivities.push({
      id: `item-${item.id}`,
      icon: "recycle",
      title: `You made ${item.quantityKg} kg of Plastic (${item.plasticType}) available`,
      time: item.createdAt ? new Date(item.createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "Recently",
      statusText: item.status === "available" ? "Listed" : item.status === "ordered" ? "Ordered" : "Completed",
      statusClass: item.status === "available" ? "green" : "blue",
      timestamp: new Date(item.createdAt || 0).getTime()
    });
  });

  orders.forEach((ord) => {
    let title = `Order #${ord.id?.slice(-6)} placed for ${ord.quantityKg} kg ${ord.plasticType}`;
    let statusText = "In Progress";
    let statusClass = "blue";
    let icon = "package";

    if (ord.status === "driver_accepted") {
      title = `Order #${ord.id?.slice(-6)} accepted by driver ${ord.driverName || ""}`.trim();
      statusText = "Accepted";
      statusClass = "blue";
    } else if (ord.status === "arrived_customer") {
      title = `Driver arrived at pickup location for Order #${ord.id?.slice(-6)}`;
      statusText = "Pickup";
      statusClass = "yellow";
      icon = "truck";
    } else if (ord.status === "collected") {
      title = `Plastic collected for Order #${ord.id?.slice(-6)}`;
      statusText = "In Transit";
      statusClass = "blue";
      icon = "recycle";
    } else if (ord.status === "delivering" || ord.status === "arrived_buyer") {
      title = `Order #${ord.id?.slice(-6)} on the way to recycling facility`;
      statusText = "Delivering";
      statusClass = "purple";
      icon = "truck";
    } else if (ord.status === "completed") {
      title = `Order #${ord.id?.slice(-6)} completed · Eco Points credited`;
      statusText = "Completed";
      statusClass = "green";
      icon = "star";
    }

    recentActivities.push({
      id: `ord-${ord.id}`,
      icon,
      title,
      time: ord.updatedAt || ord.createdAt ? new Date(ord.updatedAt || ord.createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" }) : "Recently",
      statusText,
      statusClass,
      timestamp: new Date(ord.updatedAt || ord.createdAt || 0).getTime()
    });
  });

  // Sort by latest timestamp
  recentActivities.sort((a, b) => b.timestamp - a.timestamp);
  const displayActivities = recentActivities.slice(0, 5);

  // Standard plastic types mapping using real inventory & pricing from database
  const standardTypes = [
    { type: "PET", label: "PET Bottles", icon: "🧴" },
    { type: "HDPE", label: "HDPE", icon: "🛢️" },
    { type: "LDPE", label: "LDPE", icon: "🛍️" },
    { type: "PP", label: "PP", icon: "🥡" },
    { type: "Other", label: "Other", icon: "📦" }
  ];

  const getPlasticQty = (type) => {
    const inv = inventory.find((i) => i.plasticType === type);
    if (!inv) return 0;
    return inv.availableQuantityKg !== undefined ? inv.availableQuantityKg : inv.quantityKg || 0;
  };

  const getPlasticPrice = (type) => {
    const pr = pricing.find((p) => p.plasticType === type);
    return pr?.buyerPricePerKg || 12;
  };

  const customerName = profile?.name || (user?.email ? user.email.split("@")[0] : "Customer");
  const customerEmail = profile?.email || user?.email || "";
  const customerLocation = profile?.city
    ? `${profile.city}${profile.state ? ", " + profile.state : ", Tamil Nadu"}`
    : profile?.address || "Location not set";

  if (loading) {
    return (
      <div className="dashboard-page-content" style={{ padding: "60px 20px", textAlign: "center" }}>
        <div style={{ color: "#008F5A", fontSize: "1.2rem", fontWeight: 700, marginBottom: "8px" }}>
          Loading dashboard data...
        </div>
        <p style={{ color: "#6B7280", fontSize: "0.9rem" }}>Fetching your account metrics and active orders.</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page-content">
      {error && (
        <div className="auth-alert error" style={{ marginBottom: "20px" }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* TOP ROW: Welcome Banner + Profile Card + Eco Points */}
      <div className="dash-top-banner-row">
        {/* Welcome Banner */}
        <div className="welcome-eco-banner">
          <div className="banner-left-text">
            <h1>Welcome back, {customerName.split(" ")[0]}!</h1>
            <p>Together we can build a cleaner and greener future.</p>

            <div className="banner-pills-row">
              <div className="banner-pill-item">
                <div className="banner-pill-icon"><Leaf size={16} /></div>
                <span>Reduce Plastic Waste</span>
              </div>
              <div className="banner-pill-item">
                <div className="banner-pill-icon"><Recycle size={16} /></div>
                <span>Recycle For a Better Tomorrow</span>
              </div>
              <div className="banner-pill-item">
                <div className="banner-pill-icon"><Star size={16} /></div>
                <span>Earn Eco Points</span>
              </div>
            </div>
          </div>

          <div className="banner-right-illustration">
            <img src="/images/earth-globe.jpg" alt="Recycle Earth" />
          </div>
        </div>

        {/* Top Right Profile & Eco Points */}
        <div className="top-profile-points-group">
          <div className="user-quick-profile-card">
            <div>
              <div className="profile-card-top">
                <img src="/images/avatar.jpg" alt={customerName} />
                <div className="profile-info">
                  <h3>{customerName}</h3>
                  <span className="profile-role-pill">Customer</span>
                </div>
              </div>

              <div className="profile-card-details">
                <div>✉ {customerEmail}</div>
                <div>📍 {customerLocation}</div>
              </div>
            </div>

            <button type="button" className="btn-edit-profile-outlined" onClick={onOpenProfileModal}>
              Edit Profile
            </button>
          </div>

          <div className="eco-points-mini-stat-card">
            <div className="eco-points-card-top">
              <Leaf size={17} color="#008F5A" />
              <span>Eco Points</span>
            </div>

            <div className="eco-points-card-number">
              {profile?.ecoPoints ?? 0}
            </div>

            <div className="eco-points-link" onClick={onOpenModal} style={{ cursor: "pointer" }}>
              <span>Make Plastic Available</span>
              <ArrowRight size={14} />
            </div>
          </div>
        </div>
      </div>

      {/* SECOND ROW: 3 Stat Cards + Large Green CTA Card */}
      <div className="stat-cards-triplet-row">
        {/* Total Plastic Recycled */}
        <div className="single-stat-metric-card">
          <div className="stat-metric-header">
            <div className="stat-icon-circle green">
              <Recycle size={22} />
            </div>
            <span className="stat-metric-title">Total Plastic Recycled</span>
          </div>
          <div className="stat-metric-big-number">
            {totalRecycledKg} kg
          </div>
          <div className="stat-metric-trend">
            <TrendingUp size={14} /> {completedOrders.length} {completedOrders.length === 1 ? "completed pickup" : "completed pickups"}
          </div>
        </div>

        {/* Eco Points Earned */}
        <div className="single-stat-metric-card">
          <div className="stat-metric-header">
            <div className="stat-icon-circle yellow">
              <Star size={22} />
            </div>
            <span className="stat-metric-title">Eco Points Earned</span>
          </div>
          <div className="stat-metric-big-number">
            {profile?.ecoPoints ?? 0}
          </div>
          <div className="stat-metric-trend">
            <TrendingUp size={14} /> Lifetime points balance
          </div>
        </div>

        {/* Total Orders */}
        <div className="single-stat-metric-card">
          <div className="stat-metric-header">
            <div className="stat-icon-circle orange">
              <Package size={22} />
            </div>
            <span className="stat-metric-title">Total Orders</span>
          </div>
          <div className="stat-metric-big-number">
            {orders.length}
          </div>
          <div className="stat-metric-trend">
            <TrendingUp size={14} /> {activeOrders.length} {activeOrders.length === 1 ? "active order" : "active orders"}
          </div>
        </div>

        {/* Large Green CTA Card */}
        <div className="cta-make-plastic-card" onClick={onOpenModal}>
          <div className="cta-left-content">
            <div className="cta-icon-box">
              <Recycle size={28} />
            </div>
            <div className="cta-text-wrap">
              <h3>Make Plastic Available</h3>
              <p>Schedule a pickup for your plastic waste</p>
            </div>
          </div>
          <ArrowRight size={24} />
        </div>
      </div>

      {/* THIRD ROW: Left Column (Available Types + Recent Activity) vs Right Column (Current Tracking + Motivation/Quick Actions) */}
      <div className="dash-middle-split-row">
        {/* Left Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Available Plastic Types Horizontal Cards */}
          <div className="white-dash-card">
            <div className="card-header-bar">
              <h2>Available Plastic Types</h2>
              <span className="view-all-link" onClick={onOpenModal} style={{ cursor: "pointer" }}>
                Add Listing →
              </span>
            </div>

            <div className="plastic-types-horizontal-grid">
              {standardTypes.map((st) => {
                const qty = getPlasticQty(st.type);
                const price = getPlasticPrice(st.type);
                return (
                  <div className="plastic-type-chip-card" key={st.type}>
                    <div className="plastic-chip-icon">{st.icon}</div>
                    <div className="plastic-chip-title">{st.label}</div>
                    <div className="plastic-chip-qty">{qty} kg</div>
                    <div className="plastic-chip-price">₹{price}/kg</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Activity Card */}
          <div className="white-dash-card">
            <div className="card-header-bar">
              <h2>Recent Activity</h2>
            </div>

            <div className="activity-rows-list">
              {displayActivities.length > 0 ? (
                displayActivities.map((act) => (
                  <div className="activity-single-row" key={act.id}>
                    <div className="activity-row-left">
                      <div className={`activity-icon-bubble ${act.statusClass}`}>
                        {act.icon === "recycle" && <Recycle size={18} />}
                        {act.icon === "star" && <Star size={18} />}
                        {act.icon === "package" && <Package size={18} />}
                        {act.icon === "truck" && <Truck size={18} />}
                      </div>
                      <div className="activity-text-group">
                        <h4>{act.title}</h4>
                        <time>{act.time}</time>
                      </div>
                    </div>
                    <span className={`status-pill ${act.statusClass}`}>
                      {act.statusText}
                    </span>
                  </div>
                ))
              ) : (
                <div style={{ padding: "32px 16px", textAlign: "center", color: "#6B7280", fontSize: "0.9rem" }}>
                  No recent activity.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Tracking Card + Dual Bottom Cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Current Order / Pickup Tracking Card */}
          <div className="white-dash-card">
            <div className="card-header-bar">
              <h2>Current Order / Pickup Tracking</h2>
            </div>

            {activeOrder ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "#11281E" }}>
                    Order #{activeOrder.id?.slice(-6) || activeOrder._id?.slice(-6)} · {activeOrder.plasticType} ({activeOrder.quantityKg} kg)
                  </span>
                  <span className="status-pill yellow" style={{ textTransform: "capitalize" }}>
                    {activeOrder.status?.replace("_", " ")}
                  </span>
                </div>

                {/* Stepper */}
                <div className="tracking-stepper-wrap">
                  <div className="tracking-steps-line">
                    <div className="tracking-bar-connector">
                      <div
                        className="tracking-bar-progress"
                        style={{
                          width:
                            activeOrder.status === "completed"
                              ? "100%"
                              : activeOrder.status === "delivering" || activeOrder.status === "arrived_buyer"
                              ? "75%"
                              : activeOrder.status === "collected"
                              ? "50%"
                              : activeOrder.status === "driver_accepted"
                              ? "25%"
                              : "10%"
                        }}
                      />
                    </div>

                    <div className="tracking-step-node">
                      <div className={`step-circle ${getStepStatus("requested")}`}>
                        <Check size={14} />
                      </div>
                      <span className="step-node-label">Requested</span>
                    </div>

                    <div className="tracking-step-node">
                      <div className={`step-circle ${getStepStatus("accepted")}`}>
                        <Check size={14} />
                      </div>
                      <span className="step-node-label">Accepted</span>
                    </div>

                    <div className="tracking-step-node">
                      <div className={`step-circle ${getStepStatus("pickup")}`}>
                        <Check size={14} />
                      </div>
                      <span className="step-node-label">Pickup</span>
                    </div>

                    <div className="tracking-step-node">
                      <div className={`step-circle ${getStepStatus("delivered")}`}>
                        {getStepStatus("delivered") === "completed" && <Check size={14} />}
                      </div>
                      <span className="step-node-label">Delivered</span>
                    </div>
                  </div>
                </div>

                {/* Driver Box */}
                <div className="tracking-driver-meta-box">
                  <div className="tracking-driver-left">
                    <div className="driver-icon-pill">
                      <Truck size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1F2937" }}>
                        Driver: {activeOrder.driverName || "Driver assignment in progress"}
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "#6B7280" }}>
                        Contact: {activeOrder.driverPhone || "Will be shared upon assignment"}
                      </div>
                    </div>
                  </div>
                  {activeOrder.driverPhone && (
                    <a
                      href={`tel:${activeOrder.driverPhone}`}
                      style={{
                        width: "34px",
                        height: "34px",
                        borderRadius: "50%",
                        border: "1px solid #D1D5DB",
                        background: "#FFFFFF",
                        display: "grid",
                        placeItems: "center",
                        cursor: "pointer",
                        textDecoration: "none"
                      }}
                    >
                      <Phone size={15} color="#008F5A" />
                    </a>
                  )}
                </div>

                {/* Pickup Address Box */}
                <div className="tracking-pickup-address-box">
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div className="address-left-icon">
                      <MapPin size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#1F2937" }}>
                        Pickup Address
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "#6B7280" }}>
                        {activeOrder.pickupAddress || profile?.address || "Pickup address provided with order"}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ padding: "40px 16px", textAlign: "center", color: "#6B7280" }}>
                <div style={{ fontSize: "2rem", marginBottom: "8px" }}>📦</div>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#1F2937", marginBottom: "4px" }}>
                  No active pickups.
                </h3>
                <p style={{ fontSize: "0.82rem", color: "#6B7280", margin: "0 0 16px" }}>
                  Schedule plastic pickup anytime to start recycling and earn points.
                </p>
                <button
                  type="button"
                  className="auth-btn-primary"
                  style={{ width: "auto", display: "inline-flex", margin: "0 auto", padding: "8px 16px", fontSize: "0.82rem" }}
                  onClick={onOpenModal}
                >
                  Schedule Pickup
                </button>
              </div>
            )}
          </div>

          {/* Bottom Dual Grid: Motivation & Quick Actions */}
          <div className="dash-bottom-dual-grid">
            <div className="motivation-eco-card">
              <div>
                <div style={{ fontSize: "28px", marginBottom: "8px" }}>🌱</div>
                <h3>Your efforts count!</h3>
                <p>Every kg of plastic you recycle helps create a cleaner planet.</p>
              </div>
              <button type="button" className="btn-learn-more-solid" onClick={onOpenModal}>
                Make Plastic Available <ArrowRight size={14} />
              </button>
            </div>

            <div className="quick-actions-card">
              <h3>Quick Actions</h3>
              <div className="quick-actions-stack">
                <button type="button" className="btn-quick-action-item" onClick={onOpenModal}>
                  <Recycle size={16} color="#008F5A" />
                  <span>Make Plastic Available</span>
                </button>
                <button type="button" className="btn-quick-action-item" onClick={onOpenProfileModal}>
                  <User size={16} color="#008F5A" />
                  <span>Update Profile</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ========================================================
// 2. DRIVER DASHBOARD (NO MAP - CLEAN REARRANGED LAYOUT)
// ========================================================
function DriverDashboard({ onOpenProfileModal }) {
  const { user, profile, refreshAuth } = useAuth();
  const [orders, setOrders] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    if (!user) return;
    try {
      setError("");
      const list = await getOrders({ queue: "true" });
      setOrders(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Failed to load driver orders:", err);
      setError("Unable to load orders queue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleAdvance = async (order) => {
    setBusyId(order.id);
    setMsg("");
    try {
      if (order.status === "payment_pending" || order.status === "delivered") {
        const points = await confirmCash(order);
        setMsg(`Cash confirmed! Customer received ${points} Eco Points.`);
      } else {
        await advanceOrder(order);
        setMsg("Status updated successfully.");
      }
      refreshAuth();
      loadData();
    } catch (e) {
      alert(e.message || "Failed to update order");
    } finally {
      setBusyId(null);
    }
  };

  const getActionBtnText = (order) => {
    if (!order.driverId || order.status === "placed") return "Accept Pickup →";
    if (order.status === "driver_accepted") return "Arrived at Customer ›";
    if (order.status === "arrived_customer") return "Mark Collected ›";
    if (order.status === "collected") return "Start Delivery ›";
    if (order.status === "delivering") return "Mark Delivered ›";
    if (order.status === "payment_pending") return `Confirm Cash (${money(order.orderAmount)})`;
    return "Next Step ›";
  };

  const getStatusBadgeClass = (status) => {
    if (status === "driver_accepted" || status === "placed") return "status-pill green";
    if (status === "arrived_customer") return "status-pill yellow";
    if (status === "collected" || status === "delivering") return "status-pill blue";
    if (status === "payment_pending" || status === "delivered") return "status-pill purple";
    return "status-pill green";
  };

  const getStatusBadgeText = (status) => {
    if (status === "placed") return "Available";
    if (status === "driver_accepted") return "Pickup Accepted";
    if (status === "arrived_customer") return "At Customer";
    if (status === "collected") return "Collected";
    if (status === "delivering") return "In Transit";
    if (status === "payment_pending" || status === "delivered") return "Cash Pending";
    return "In Progress";
  };

  const activeDeliveries = orders.filter((o) => o.status !== "completed" && o.status !== "cancelled");
  const completedDeliveries = orders.filter((o) => o.status === "completed");

  const driverName = profile?.name || (user?.email ? user.email.split("@")[0] : "Driver");
  const driverPhone = profile?.phone || "Phone not set";
  const driverLocation = profile?.city
    ? `${profile.city}${profile.state ? ", " + profile.state : ", Tamil Nadu"}`
    : profile?.address || "Madurai, Tamil Nadu";

  // Real scheduled pickups from active assigned orders
  const scheduledPickups = activeDeliveries.filter(
    (o) => o.status === "placed" || o.status === "driver_accepted" || o.status === "arrived_customer"
  );

  // Dynamic activity events from real orders
  const driverActivities = orders.slice(0, 5).map((ord) => {
    let action = "Order status updated";
    if (ord.status === "driver_accepted") action = "Accepted order pickup";
    else if (ord.status === "arrived_customer") action = "Arrived at customer pickup";
    else if (ord.status === "collected") action = "Picked up plastic";
    else if (ord.status === "delivering") action = "En route to recycling buyer";
    else if (ord.status === "delivered" || ord.status === "payment_pending") action = "Delivered to buyer facility";
    else if (ord.status === "completed") action = "Cash confirmed & delivered";

    return {
      id: ord.id,
      orderCode: `#${ord.id?.slice(-6)}`,
      action,
      status: ord.status === "completed" ? "Completed" : "In Progress",
      statusClass: ord.status === "completed" ? "green" : "blue",
      time: ord.updatedAt || ord.createdAt ? new Date(ord.updatedAt || ord.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Today"
    };
  });

  if (loading) {
    return (
      <div className="dashboard-page-content" style={{ padding: "60px 20px", textAlign: "center" }}>
        <div style={{ color: "#008F5A", fontSize: "1.2rem", fontWeight: 700, marginBottom: "8px" }}>
          Loading driver orders...
        </div>
        <p style={{ color: "#6B7280", fontSize: "0.9rem" }}>Connecting to pickup and delivery dispatch queue.</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page-content">
      {error && (
        <div className="auth-alert error" style={{ marginBottom: "20px" }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {msg && (
        <div className="auth-alert success" style={{ marginBottom: "20px" }}>
          <Check size={18} />
          <span>{msg}</span>
        </div>
      )}

      {/* TOP ROW: Welcome Banner + Driver Profile */}
      <div className="dash-top-banner-row">
        {/* Driver Welcome Banner */}
        <div className="welcome-eco-banner">
          <div className="banner-left-text">
            <h1>Hello, {driverName}!</h1>
            <p>Keep going! You're helping make a greener planet.</p>

            <div className="banner-pills-row">
              <div className="banner-pill-item">
                <div className="banner-pill-icon"><Truck size={16} /></div>
                <span>Completed Trips <b>{completedDeliveries.length}</b></span>
              </div>
              <div className="banner-pill-item">
                <div className="banner-pill-icon"><Recycle size={16} /></div>
                <span>Total Earnings <b>{money(profile?.totalEarnings ?? 0)}</b></span>
              </div>
              <div className="banner-pill-item">
                <div className="banner-pill-icon"><Leaf size={16} /></div>
                <span>Eco Points <b>{profile?.ecoPoints ?? 0}</b></span>
              </div>
            </div>
          </div>

          <div className="banner-right-illustration">
            <img src="/images/recycle-truck.jpg" alt="Recycling Truck" />
          </div>
        </div>

        {/* Top Right Driver Profile Card */}
        <div className="user-quick-profile-card">
          <div>
            <div className="profile-card-top">
              <img src="/images/avatar.jpg" alt={driverName} />
              <div className="profile-info">
                <h3>{driverName}</h3>
                <span className="profile-role-pill">Driver</span>
              </div>
            </div>

            <div className="profile-card-details">
              <div>📞 {driverPhone}</div>
              <div>📍 {driverLocation}</div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#E8F5E9", color: "#15803D", padding: "4px 10px", borderRadius: "99px", fontSize: "0.8rem", fontWeight: 700 }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#15803D" }} />
              Online
            </div>

            <button type="button" className="btn-edit-profile-outlined" onClick={onOpenProfileModal} style={{ padding: "4px 10px", fontSize: "0.78rem" }}>
              Edit Profile
            </button>
          </div>
        </div>
      </div>

      {/* SECOND ROW: 4 Stat Cards */}
      <div className="driver-stat-quad-row">
        <div className="single-stat-metric-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="stat-icon-circle green"><Truck size={22} /></div>
            <ArrowRight size={16} color="#008F5A" />
          </div>
          <span className="stat-metric-title" style={{ marginTop: "10px" }}>Active Orders</span>
          <div className="stat-metric-big-number">{activeDeliveries.length}</div>
          <div style={{ fontSize: "0.78rem", color: "#6B7280" }}>
            {activeDeliveries.length > 0 ? "In queue and transit" : "No active orders"}
          </div>
        </div>

        <div className="single-stat-metric-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="stat-icon-circle blue"><MapPin size={22} /></div>
            <ArrowRight size={16} color="#0284C7" />
          </div>
          <span className="stat-metric-title" style={{ marginTop: "10px" }}>Completed Deliveries</span>
          <div className="stat-metric-big-number">{completedDeliveries.length}</div>
          <div style={{ fontSize: "0.78rem", color: "#0284C7", fontWeight: 600 }}>
            {completedDeliveries.length} trips completed
          </div>
        </div>

        <div className="single-stat-metric-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="stat-icon-circle yellow"><Coins size={22} /></div>
            <ArrowRight size={16} color="#D97706" />
          </div>
          <span className="stat-metric-title" style={{ marginTop: "10px" }}>Total Earnings</span>
          <div className="stat-metric-big-number">{money(profile?.totalEarnings ?? 0)}</div>
          <div style={{ fontSize: "0.78rem", color: "#D97706", fontWeight: 600 }}>
            ₹50 payout per completed order
          </div>
        </div>

        <div className="single-stat-metric-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="stat-icon-circle green"><Leaf size={22} /></div>
            <ArrowRight size={16} color="#008F5A" />
          </div>
          <span className="stat-metric-title" style={{ marginTop: "10px" }}>Eco Points</span>
          <div className="stat-metric-big-number">{profile?.ecoPoints ?? 0}</div>
          <div style={{ fontSize: "0.78rem", color: "#008F5A", fontWeight: 600 }}>Driver incentive points</div>
        </div>
      </div>

      {/* THIRD ROW: Clean Split: Assigned Orders (1.5fr) + Today's Pickup Schedule (1fr) - NO MAP */}
      <div className="driver-split-row">
        {/* Left: Assigned Orders */}
        <div className="white-dash-card">
          <div className="card-header-bar">
            <h2>Assigned Orders</h2>
            <span className="view-all-link" onClick={loadData} style={{ cursor: "pointer" }}>
              Refresh ⟳
            </span>
          </div>

          <div className="assigned-orders-wrap">
            {activeDeliveries.length > 0 ? (
              activeDeliveries.map((order, idx) => (
                <div className="assigned-order-item-card" key={order.id}>
                  <div className="order-item-left-block">
                    <div className="order-type-icon-box">
                      {idx % 2 === 0 ? "🧴" : "📦"}
                    </div>
                    <div className="order-text-meta">
                      <h3>#{order.id?.slice(-6)} · {order.plasticType} - {order.quantityKg} kg</h3>
                      <p>From: {order.customerName || "Customer"} ({order.pickupAddress || order.city || "Madurai"})</p>
                      <p>To: {order.buyerName || "Recycling Facility"} ({order.deliveryAddress || "Buyer facility"})</p>
                    </div>
                  </div>

                  <div className="order-item-middle-block">
                    <span className={getStatusBadgeClass(order.status)}>
                      {getStatusBadgeText(order.status)}
                    </span>
                    <div>📍 {order.city || "Madurai, Tamil Nadu"}</div>
                    <div style={{ fontWeight: 600, color: "#008F5A" }}>
                      Amount: {money(order.orderAmount)}
                    </div>
                  </div>

                  <div className="order-item-right-block">
                    <button
                      type="button"
                      className="auth-btn-primary"
                      style={{ padding: "8px 14px", fontSize: "0.82rem", margin: 0, width: "auto" }}
                      disabled={busyId === order.id}
                      onClick={() => handleAdvance(order)}
                    >
                      {busyId === order.id ? "Updating..." : getActionBtnText(order)}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: "36px 20px", textAlign: "center", color: "#6B7280" }}>
                <p style={{ fontWeight: 600, color: "#374151", marginBottom: "4px" }}>
                  No assigned orders in queue.
                </p>
                <span style={{ fontSize: "0.85rem" }}>
                  When buyers place orders for available plastic listings, pickup requests will appear here.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Today's Pickup Schedule */}
        <div className="white-dash-card">
          <div className="card-header-bar">
            <h2>Today's Pickup Schedule</h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {scheduledPickups.length > 0 ? (
              scheduledPickups.map((ord) => (
                <div className="schedule-item-row" key={ord.id}>
                  <span className="schedule-time">
                    {ord.availableTime || ord.pickupTime || "10:00 AM"}
                  </span>
                  <div className="schedule-desc">
                    <MapPin size={14} color="#008F5A" />
                    <span>
                      {ord.customerName || "Customer"} · {ord.pickupAddress || ord.city || "Pickup location"}
                    </span>
                  </div>
                  <ChevronRight size={16} color="#9CA3AF" />
                </div>
              ))
            ) : (
              <div style={{ padding: "36px 16px", textAlign: "center", color: "#6B7280" }}>
                <p style={{ fontWeight: 600, color: "#374151", marginBottom: "4px" }}>
                  No pickups scheduled for today.
                </p>
                <span style={{ fontSize: "0.82rem" }}>
                  Assigned pickups will display their scheduled time and customer address here.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FOURTH ROW: Clean Split: Recent Activity (1.5fr) + Quick Actions (1fr) */}
      <div className="driver-bottom-split-row">
        {/* Recent Activity Card */}
        <div className="white-dash-card">
          <div className="card-header-bar">
            <h2>Recent Activity</h2>
          </div>

          {driverActivities.length > 0 ? (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ color: "#6B7280", textAlign: "left", borderBottom: "1px solid #E5E7EB" }}>
                  <th style={{ padding: "8px 0" }}>Time</th>
                  <th>Order ID</th>
                  <th>Action</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {driverActivities.map((act) => (
                  <tr key={act.id} style={{ borderBottom: "1px solid #F3F4F6" }}>
                    <td style={{ padding: "10px 0" }}>{act.time}</td>
                    <td><b>{act.orderCode}</b></td>
                    <td>{act.action}</td>
                    <td>
                      <span className={`status-pill ${act.statusClass}`}>
                        {act.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: "32px 16px", textAlign: "center", color: "#6B7280", fontSize: "0.85rem" }}>
              No recent activity.
            </div>
          )}
        </div>

        {/* Quick Actions (2x2 Grid) */}
        <div className="white-dash-card">
          <div className="card-header-bar">
            <h2>Quick Actions</h2>
          </div>

          <div className="quick-actions-2x2-grid">
            <button type="button" className="btn-quick-2x2 primary" onClick={loadData}>
              <Truck size={20} />
              <span>Refresh Queue</span>
            </button>
            <button type="button" className="btn-quick-2x2" onClick={onOpenProfileModal}>
              <User size={20} color="#008F5A" />
              <span>Driver Profile</span>
            </button>
            <button type="button" className="btn-quick-2x2" onClick={() => alert(`Total Completed Trips: ${completedDeliveries.length}\nTotal Earnings: ${money(profile?.totalEarnings ?? 0)}`)}>
              <Coins size={20} color="#008F5A" />
              <span>Check Earnings</span>
            </button>
            <button type="button" className="btn-quick-2x2" onClick={() => alert(`Driver Eco Points: ${profile?.ecoPoints ?? 0}`)}>
              <Leaf size={20} color="#008F5A" />
              <span>Eco Points</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ========================================================
// 3. BUYER DASHBOARD
// ========================================================
function BuyerDashboard({ onOpenProfileModal }) {
  const { user, profile, refreshAuth } = useAuth();
  const [marketplace, setMarketplace] = useState([]);
  const [orders, setOrders] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    if (!user) return;
    try {
      setError("");
      const [m, o] = await Promise.all([
        getPlasticListings("available"),
        getOrders({ buyerId: user.uid })
      ]);
      setMarketplace(Array.isArray(m) ? m : []);
      setOrders(Array.isArray(o) ? o : []);
    } catch (err) {
      console.error("Failed to load buyer data:", err);
      setError("Unable to load marketplace data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleBuy = async (item) => {
    setBusyId(item.id);
    setMsg("");
    try {
      await placeOrder(item, null, profile?.address || "Buyer Recycling Facility");
      setMsg(`Order placed successfully for ${item.quantityKg} kg ${item.plasticType}! A driver will be assigned.`);
      refreshAuth();
      loadData();
    } catch (e) {
      alert(e.message || "Failed to place order");
    } finally {
      setBusyId(null);
    }
  };

  const totalSpent = orders
    .filter((o) => o.status === "completed" || o.status === "payment_pending")
    .reduce((acc, o) => acc + (Number(o.orderAmount) || 0), 0);
  const totalPurchasedKg = orders.reduce((acc, o) => acc + (Number(o.quantityKg) || 0), 0);
  const activeBuyerOrders = orders.filter((o) => o.status !== "completed" && o.status !== "cancelled");
  const buyerName = profile?.companyName || profile?.name || (user?.email ? user.email.split("@")[0] : "Buyer");

  if (loading) {
    return (
      <div className="dashboard-page-content" style={{ padding: "60px 20px", textAlign: "center" }}>
        <div style={{ color: "#008F5A", fontSize: "1.2rem", fontWeight: 700, marginBottom: "8px" }}>
          Loading marketplace...
        </div>
        <p style={{ color: "#6B7280", fontSize: "0.9rem" }}>Fetching live plastic listings from MongoDB.</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page-content">
      {error && (
        <div className="auth-alert error" style={{ marginBottom: "20px" }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="welcome-eco-banner">
        <div className="banner-left-text">
          <h1>Welcome, {buyerName}!</h1>
          <p>Purchase recyclable plastic directly from available customer listings.</p>
          <div className="banner-pills-row">
            <div className="banner-pill-item">
              <div className="banner-pill-icon"><Package size={16} /></div>
              <span>Verified Plastic Waste</span>
            </div>
            <div className="banner-pill-item">
              <div className="banner-pill-icon"><Truck size={16} /></div>
              <span>Driver Pickup & Delivery</span>
            </div>
            <div className="banner-pill-item">
              <div className="banner-pill-icon"><Coins size={16} /></div>
              <span>Cash on Delivery</span>
            </div>
          </div>
        </div>
        <div className="banner-right-illustration">
          <img src="/images/earth-globe.jpg" alt="Recycle" />
        </div>
      </div>

      {/* Stat Cards */}
      <div className="driver-stat-quad-row">
        <div className="single-stat-metric-card">
          <span className="stat-metric-title">Available Listings</span>
          <div className="stat-metric-big-number">{marketplace.length}</div>
        </div>
        <div className="single-stat-metric-card">
          <span className="stat-metric-title">My Orders</span>
          <div className="stat-metric-big-number">{orders.length}</div>
        </div>
        <div className="single-stat-metric-card">
          <span className="stat-metric-title">Amount Spent</span>
          <div className="stat-metric-big-number">{money(totalSpent)}</div>
        </div>
        <div className="single-stat-metric-card">
          <span className="stat-metric-title">Plastic Purchased</span>
          <div className="stat-metric-big-number">{totalPurchasedKg} kg</div>
        </div>
      </div>

      {msg && <div className="auth-alert success">{msg}</div>}

      {/* Marketplace Grid */}
      <div className="white-dash-card" style={{ marginBottom: "24px" }}>
        <div className="card-header-bar">
          <h2>Plastic Marketplace</h2>
          <span className="view-all-link" onClick={loadData} style={{ cursor: "pointer" }}>
            Refresh Marketplace ⟳
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
          {marketplace.length > 0 ? (
            marketplace.map((p) => (
              <div className="assigned-order-item-card" key={p.id} style={{ flexDirection: "column", alignItems: "flex-start", gap: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                  <span className="status-pill green">Available</span>
                  <span style={{ fontWeight: 700, color: "#008F5A" }}>₹{p.pricePerKg || 15} / kg</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div className="order-type-icon-box">🧴</div>
                  <div>
                    <h3 style={{ fontSize: "1.05rem" }}>{p.plasticType}</h3>
                    <p style={{ fontWeight: 700, fontSize: "1.1rem" }}>{p.quantityKg} kg</p>
                  </div>
                </div>

                <div style={{ fontSize: "0.82rem", color: "#6B7280", width: "100%" }}>
                  <div>📍 Location: {p.city || "Madurai"}</div>
                  <div>📅 Ready: {p.availableDate} at {p.availableTime}</div>
                  <div style={{ fontWeight: 700, color: "#111827", marginTop: "4px" }}>
                    Total Cash: {money(p.estimatedTotal || p.quantityKg * 15)}
                  </div>
                </div>

                <button
                  type="button"
                  className="auth-btn-primary"
                  style={{ width: "100%", margin: 0, padding: "10px" }}
                  disabled={busyId === p.id}
                  onClick={() => handleBuy(p)}
                >
                  <ShoppingCart size={16} />
                  <span>{busyId === p.id ? "Placing Order..." : "Place Order"}</span>
                </button>
              </div>
            ))
          ) : (
            <div style={{ padding: "36px 20px", textAlign: "center", color: "#6B7280", gridColumn: "1 / -1" }}>
              <p style={{ fontWeight: 600, color: "#374151", marginBottom: "4px" }}>
                No plastic is currently available.
              </p>
              <span style={{ fontSize: "0.85rem" }}>
                New listings created by recycling customers will show up here immediately.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Buyer Orders List */}
      <div className="white-dash-card">
        <div className="card-header-bar">
          <h2>My Purchases</h2>
        </div>

        {orders.length > 0 ? (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
            <thead>
              <tr style={{ color: "#6B7280", textAlign: "left", borderBottom: "1px solid #E5E7EB" }}>
                <th style={{ padding: "10px 0" }}>Order ID</th>
                <th>Plastic Type</th>
                <th>Quantity</th>
                <th>Customer Area</th>
                <th>Driver</th>
                <th>Price / kg</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((ord) => (
                <tr key={ord.id} style={{ borderBottom: "1px solid #F3F4F6" }}>
                  <td style={{ padding: "10px 0" }}><b>#{ord.id?.slice(-6)}</b></td>
                  <td>{ord.plasticType}</td>
                  <td>{ord.quantityKg} kg</td>
                  <td>{ord.city || "Madurai"}</td>
                  <td>{ord.driverName || "Assigning..."}</td>
                  <td>₹{ord.pricePerKg || 15}/kg</td>
                  <td><b>{money(ord.orderAmount)}</b></td>
                  <td>
                    <span className={`status-pill ${ord.status === "completed" ? "green" : ord.status === "payment_pending" ? "purple" : "blue"}`}>
                      {ord.status?.replace("_", " ")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: "32px 16px", textAlign: "center", color: "#6B7280", fontSize: "0.85rem" }}>
            No purchases yet.
          </div>
        )}
      </div>
    </div>
  );
}

// ========================================================
// 4. ADMIN DASHBOARD
// ========================================================
function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [pricing, setPricing] = useState([]);
  const [savingId, setSavingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    try {
      setError("");
      const [st, uList, prList] = await Promise.all([
        getAdminStats(),
        listCollection("users"),
        getPricing()
      ]);
      setStats(st);
      setUsers(Array.isArray(uList) ? uList : []);
      setPricing(Array.isArray(prList) ? prList : []);
    } catch (err) {
      console.error("Failed to load admin stats:", err);
      setError("Unable to load admin dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggle = async (userId, currentStatus) => {
    const nextStatus = currentStatus === "suspended" ? "active" : "suspended";
    await toggleUserStatus(userId, nextStatus);
    const updatedUsers = await listCollection("users");
    setUsers(Array.isArray(updatedUsers) ? updatedUsers : []);
  };

  const handleSavePrice = async (p) => {
    setSavingId(p.id);
    await updatePricing(p.id, p);
    setSavingId(null);
  };

  if (loading) {
    return (
      <div className="dashboard-page-content" style={{ padding: "60px 20px", textAlign: "center" }}>
        <div style={{ color: "#008F5A", fontSize: "1.2rem", fontWeight: 700, marginBottom: "8px" }}>
          Loading Admin Control Center...
        </div>
        <p style={{ color: "#6B7280", fontSize: "0.9rem" }}>Aggregating system statistics and database metrics.</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page-content">
      {error && (
        <div className="auth-alert error" style={{ marginBottom: "20px" }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="welcome-eco-banner">
        <div className="banner-left-text">
          <h1>Admin Control Center</h1>
          <p>System audit, pricing rates, users and platform recycling performance.</p>
        </div>
        <div className="banner-right-illustration">
          <img src="/images/earth-globe.jpg" alt="Admin" />
        </div>
      </div>

      <div className="driver-stat-quad-row">
        <div className="single-stat-metric-card">
          <span className="stat-metric-title">Total Users</span>
          <div className="stat-metric-big-number">{stats?.users?.total ?? users.length}</div>
          <div style={{ fontSize: "0.76rem", color: "#6B7280" }}>
            {stats?.users?.customers ?? 0} Customers · {stats?.users?.drivers ?? 0} Drivers · {stats?.users?.buyers ?? 0} Buyers
          </div>
        </div>
        <div className="single-stat-metric-card">
          <span className="stat-metric-title">Orders Processed</span>
          <div className="stat-metric-big-number">{stats?.orders?.total ?? 0}</div>
          <div style={{ fontSize: "0.76rem", color: "#6B7280" }}>
            {stats?.orders?.active ?? 0} Active · {stats?.orders?.completed ?? 0} Completed
          </div>
        </div>
        <div className="single-stat-metric-card">
          <span className="stat-metric-title">Cash Volume</span>
          <div className="stat-metric-big-number">{money(stats?.transactions?.totalAmount ?? 0)}</div>
          <div style={{ fontSize: "0.76rem", color: "#6B7280" }}>
            {stats?.transactions?.count ?? 0} Recorded Transactions
          </div>
        </div>
        <div className="single-stat-metric-card">
          <span className="stat-metric-title">Eco Points Issued</span>
          <div className="stat-metric-big-number">{stats?.ecoPoints ?? 0}</div>
          <div style={{ fontSize: "0.76rem", color: "#6B7280" }}>
            {stats?.orders?.recycledKg ?? 0} kg Plastic Recycled
          </div>
        </div>
      </div>

      <div className="white-dash-card" style={{ marginBottom: "24px" }}>
        <div className="card-header-bar">
          <h2>Pricing & Eco Points Rates</h2>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
          <thead>
            <tr style={{ background: "#F3F6F4", textAlign: "left" }}>
              <th style={{ padding: "10px" }}>Plastic</th>
              <th>Buyer Price (₹/kg)</th>
              <th>Eco Points/kg</th>
              <th>Driver Pay</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {pricing.map((p) => (
              <tr key={p.id} style={{ borderBottom: "1px solid #E5E7EB" }}>
                <td style={{ padding: "10px" }}><b>{p.plasticType}</b></td>
                <td>
                  <input
                    type="number"
                    style={{ width: "80px", padding: "6px" }}
                    value={p.buyerPricePerKg}
                    onChange={(e) => setPricing(pricing.map(item => item.id === p.id ? { ...item, buyerPricePerKg: e.target.value } : item))}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    style={{ width: "80px", padding: "6px" }}
                    value={p.customerEcoPointsPerKg}
                    onChange={(e) => setPricing(pricing.map(item => item.id === p.id ? { ...item, customerEcoPointsPerKg: e.target.value } : item))}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    style={{ width: "80px", padding: "6px" }}
                    value={p.driverPaymentPerOrder}
                    onChange={(e) => setPricing(pricing.map(item => item.id === p.id ? { ...item, driverPaymentPerOrder: e.target.value } : item))}
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="auth-btn-primary"
                    style={{ padding: "6px 12px", fontSize: "0.78rem", width: "auto", margin: 0 }}
                    onClick={() => handleSavePrice(p)}
                  >
                    {savingId === p.id ? "Saving..." : "Save"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="white-dash-card">
        <div className="card-header-bar">
          <h2>User Accounts ({users.length})</h2>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
          <thead>
            <tr style={{ background: "#F3F6F4", textAlign: "left" }}>
              <th style={{ padding: "10px" }}>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ borderBottom: "1px solid #E5E7EB" }}>
                <td style={{ padding: "10px" }}><b>{u.name || "User"}</b></td>
                <td>{u.email}</td>
                <td><span className="profile-role-pill">{u.role}</span></td>
                <td>
                  <span className={`status-pill ${u.status === "suspended" ? "gray" : "green"}`}>
                    {u.status || "active"}
                  </span>
                </td>
                <td>
                  {u.role !== "admin" && (
                    <button
                      type="button"
                      className="auth-btn-outlined"
                      style={{ padding: "4px 8px", fontSize: "0.75rem", width: "auto" }}
                      onClick={() => handleToggle(u.id, u.status || "active")}
                    >
                      {u.status === "suspended" ? "Reactivate" : "Suspend"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ========================================================
// 5. MAKE PLASTIC AVAILABLE MODAL
// ========================================================
function MakePlasticModal({ isOpen, onClose }) {
  const { user, profile, refreshAuth } = useAuth();
  const [f, setF] = useState({
    plasticType: "PET",
    quantityKg: 5,
    pickupAddress: profile?.address || "Madurai",
    city: profile?.city || "Madurai",
    pincode: profile?.pincode || "625001",
    availableDate: new Date().toISOString().split("T")[0],
    availableTime: "10:00",
    instructions: ""
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (profile) {
      setF((prev) => ({
        ...prev,
        pickupAddress: profile.address || prev.pickupAddress,
        city: profile.city || prev.city,
        pincode: profile.pincode || prev.pincode
      }));
    }
  }, [profile]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    setErr("");
    try {
      await createAvailablePlastic({
        ...f,
        quantityKg: Number(f.quantityKg)
      });
      setMsg("Plastic is now listed on Marketplace!");
      refreshAuth();
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (e) {
      setErr(e.message || "Failed to make plastic available");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay-backdrop">
      <div className="modal-content-card">
        <div className="modal-header-row">
          <h2>Make Plastic Available</h2>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={22} />
          </button>
        </div>

        {msg && <div className="auth-alert success">{msg}</div>}
        {err && <div className="auth-alert error">{err}</div>}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div className="form-two-col-grid">
            <label className="form-field-label">
              Plastic Type
              <select value={f.plasticType} onChange={(e) => setF({ ...f, plasticType: e.target.value })}>
                {["PET", "HDPE", "LDPE", "PP", "Other"].map((x) => (
                  <option key={x} value={x}>{x}</option>
                ))}
              </select>
            </label>

            <label className="form-field-label">
              Quantity (kg)
              <input
                required
                type="number"
                min="0.1"
                step="0.1"
                value={f.quantityKg}
                onChange={(e) => setF({ ...f, quantityKg: e.target.value })}
              />
            </label>

            <label className="form-field-label form-full-field">
              Pickup Address
              <input
                required
                value={f.pickupAddress}
                onChange={(e) => setF({ ...f, pickupAddress: e.target.value })}
              />
            </label>

            <label className="form-field-label">
              City
              <input
                required
                value={f.city}
                onChange={(e) => setF({ ...f, city: e.target.value })}
              />
            </label>

            <label className="form-field-label">
              Pincode
              <input
                required
                value={f.pincode}
                onChange={(e) => setF({ ...f, pincode: e.target.value })}
              />
            </label>

            <label className="form-field-label">
              Available Date
              <input
                required
                type="date"
                value={f.availableDate}
                onChange={(e) => setF({ ...f, availableDate: e.target.value })}
              />
            </label>

            <label className="form-field-label">
              Available Time
              <input
                required
                type="time"
                value={f.availableTime}
                onChange={(e) => setF({ ...f, availableTime: e.target.value })}
              />
            </label>

            <label className="form-field-label form-full-field">
              Additional Instructions (Optional)
              <input
                placeholder="e.g. Call before arrival"
                value={f.instructions}
                onChange={(e) => setF({ ...f, instructions: e.target.value })}
              />
            </label>
          </div>

          <button type="submit" className="auth-btn-primary" disabled={busy} style={{ marginTop: "10px" }}>
            <span>{busy ? "Listing Plastic..." : "Schedule Plastic Pickup"}</span>
            <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}

// ========================================================
// 6. EDIT PROFILE MODAL
// ========================================================
function EditProfileModal({ isOpen, onClose }) {
  const { user, profile, refreshAuth } = useAuth();
  const [f, setF] = useState({
    name: profile?.name || "",
    phone: profile?.phone || "",
    city: profile?.city || "",
    address: profile?.address || "",
    vehicleNumber: profile?.vehicleNumber || ""
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (profile) {
      setF({
        name: profile.name || "",
        phone: profile.phone || "",
        city: profile.city || "",
        address: profile.address || "",
        vehicleNumber: profile.vehicleNumber || ""
      });
    }
  }, [profile]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    setErr("");
    try {
      await saveUserProfile(f);
      setMsg("Profile updated successfully!");
      await refreshAuth();
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (e) {
      setErr(e.message || "Failed to update profile");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay-backdrop">
      <div className="modal-content-card">
        <div className="modal-header-row">
          <h2>Edit Profile</h2>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={22} />
          </button>
        </div>

        {msg && <div className="auth-alert success">{msg}</div>}
        {err && <div className="auth-alert error">{err}</div>}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div className="form-two-col-grid">
            <label className="form-field-label form-full-field">
              Full Name
              <input
                required
                value={f.name}
                onChange={(e) => setF({ ...f, name: e.target.value })}
              />
            </label>

            <label className="form-field-label">
              Phone Number
              <input
                required
                value={f.phone}
                onChange={(e) => setF({ ...f, phone: e.target.value })}
              />
            </label>

            <label className="form-field-label">
              City
              <input
                required
                value={f.city}
                onChange={(e) => setF({ ...f, city: e.target.value })}
              />
            </label>

            <label className="form-field-label form-full-field">
              Address
              <input
                value={f.address}
                onChange={(e) => setF({ ...f, address: e.target.value })}
              />
            </label>

            {profile?.role === "driver" && (
              <label className="form-field-label form-full-field">
                Vehicle Details / Plate
                <input
                  placeholder="e.g. TN 58 AB 1234"
                  value={f.vehicleNumber}
                  onChange={(e) => setF({ ...f, vehicleNumber: e.target.value })}
                />
              </label>
            )}
          </div>

          <button type="submit" className="auth-btn-primary" disabled={busy} style={{ marginTop: "10px" }}>
            <span>{busy ? "Saving..." : "Save Profile"}</span>
            <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}

// ========================================================
// 7. MAIN DASHBOARD CONTROLLER
// ========================================================
export default function Dashboard({ role = "customer" }) {
  const [makePlasticModalOpen, setMakePlasticModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");

  const handleTabChange = (key) => {
    setActiveTab(key);
    if (key === "make_plastic") {
      setMakePlasticModalOpen(true);
    } else if (key === "profile") {
      setProfileModalOpen(true);
    }
  };

  const renderDashboardContent = () => {
    if (role === "driver") {
      return <DriverDashboard onOpenProfileModal={() => setProfileModalOpen(true)} />;
    }
    if (role === "buyer") {
      return <BuyerDashboard onOpenProfileModal={() => setProfileModalOpen(true)} />;
    }
    if (role === "admin") {
      return <AdminDashboard />;
    }
    return (
      <CustomerDashboard
        onOpenModal={() => setMakePlasticModalOpen(true)}
        onOpenProfileModal={() => setProfileModalOpen(true)}
      />
    );
  };

  return (
    <Layout role={role} activeTab={activeTab} onTabChange={handleTabChange}>
      {renderDashboardContent()}
      <MakePlasticModal
        isOpen={makePlasticModalOpen}
        onClose={() => setMakePlasticModalOpen(false)}
      />
      <EditProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />
    </Layout>
  );
}
