import express from "express";
import Delivery from "../models/Delivery.js";
import Transaction from "../models/Transaction.js";
import EcoPoint from "../models/EcoPoint.js";
import Notification from "../models/Notification.js";
import Pricing from "../models/Pricing.js";
import PlasticInventory from "../models/PlasticInventory.js";
import User from "../models/User.js";
import Order from "../models/Order.js";
import AvailablePlastic from "../models/AvailablePlastic.js";
import { auth, roles } from "../middleware/auth.js";

const router = express.Router();

const formatItem = (item) => ({
  ...item.toObject(),
  id: item._id.toString()
});

// Notifications: user specific or filtered
router.get("/notifications", auth, async (req, res) => {
  try {
    const filter = { userId: req.user.id };
    const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(50);
    res.json(notifications.map(formatItem));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch("/notifications/:id/read", auth, async (req, res) => {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { read: true },
      { new: true }
    );
    if (!notif) return res.status(404).json({ message: "Notification not found" });
    res.json(formatItem(notif));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch("/notifications/read-all", auth, async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user.id, read: false }, { read: true });
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Deliveries
router.get("/deliveries", auth, async (req, res) => {
  try {
    const query = {};
    if (req.query.driverId) query.driverId = req.query.driverId;
    if (req.query.orderId) query.orderId = req.query.orderId;
    if (req.query.customerId) query.customerId = req.query.customerId;
    if (req.query.buyerId) query.buyerId = req.query.buyerId;

    const list = await Delivery.find(query).sort({ createdAt: -1 });
    res.json(list.map(formatItem));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Transactions
router.get("/transactions", auth, async (req, res) => {
  try {
    const query = {};
    if (req.query.buyerId) query.buyerId = req.query.buyerId;
    if (req.query.driverId) query.driverId = req.query.driverId;
    if (req.query.orderId) query.orderId = req.query.orderId;

    const list = await Transaction.find(query).sort({ createdAt: -1 });
    res.json(list.map(formatItem));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Eco Points
router.get("/eco-points", auth, async (req, res) => {
  try {
    const query = {};
    if (req.query.customerId) query.customerId = req.query.customerId;
    const list = await EcoPoint.find(query).sort({ createdAt: -1 });
    res.json(list.map(formatItem));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Pricing
router.get("/pricing", auth, async (req, res) => {
  try {
    const list = await Pricing.find().sort({ plasticType: 1 });
    res.json(list.map(formatItem));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/pricing/:id", auth, roles("admin"), async (req, res) => {
  try {
    const { customerEcoPointsPerKg, buyerPricePerKg, driverPaymentPerOrder, active } = req.body;
    const updated = await Pricing.findByIdAndUpdate(
      req.params.id,
      {
        ...(customerEcoPointsPerKg !== undefined && { customerEcoPointsPerKg: Number(customerEcoPointsPerKg) }),
        ...(buyerPricePerKg !== undefined && { buyerPricePerKg: Number(buyerPricePerKg) }),
        ...(driverPaymentPerOrder !== undefined && { driverPaymentPerOrder: Number(driverPaymentPerOrder) }),
        ...(active !== undefined && { active: Boolean(active) })
      },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: "Pricing record not found" });
    res.json(formatItem(updated));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Inventory
router.get("/inventory", auth, async (req, res) => {
  try {
    const list = await PlasticInventory.find().sort({ plasticType: 1 });
    res.json(list.map(formatItem));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin Stats
router.get("/admin/stats", auth, roles("admin"), async (req, res) => {
  try {
    const [
      totalUsers,
      customers,
      drivers,
      buyers,
      plasticListings,
      totalOrders,
      activeOrders,
      completedOrders,
      transactions,
      ecoPointsRecords
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "customer" }),
      User.countDocuments({ role: "driver" }),
      User.countDocuments({ role: "buyer" }),
      AvailablePlastic.countDocuments(),
      Order.countDocuments(),
      Order.countDocuments({ status: { $nin: ["completed", "cancelled"] } }),
      Order.countDocuments({ status: "completed" }),
      Transaction.find({ status: "confirmed" }),
      EcoPoint.find()
    ]);

    const totalCash = transactions.reduce((acc, t) => acc + (t.amount || 0), 0);
    const totalPointsIssued = ecoPointsRecords.reduce((acc, ep) => acc + (ep.pointsEarned || 0), 0);
    const totalPlasticRecycled = ecoPointsRecords.reduce((acc, ep) => acc + (ep.quantityKg || 0), 0);

    res.json({
      users: { total: totalUsers, customers, drivers, buyers },
      listings: plasticListings,
      orders: { total: totalOrders, active: activeOrders, completed: completedOrders },
      transactions: { total: transactions.length, totalAmount: totalCash },
      ecoPoints: totalPointsIssued,
      totalPlasticRecycled
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
