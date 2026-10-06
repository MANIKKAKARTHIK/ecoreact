import express from "express";
import User from "../models/User.js";
import { auth, roles } from "../middleware/auth.js";
import { safeProfile } from "./auth.js";

const router = express.Router();

// Admin: list all users
router.get("/", auth, roles("admin"), async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users.map(safeProfile));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update current user profile
router.put("/me", auth, async (req, res) => {
  try {
    const blockedFields = ["password", "email", "role", "_id", "ecoPoints", "completedTrips", "totalEarnings"];
    const updates = { ...req.body };
    blockedFields.forEach((field) => delete updates[field]);

    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(safeProfile(user));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: toggle user status (active / suspended)
router.patch("/:id/status", auth, roles("admin"), async (req, res) => {
  try {
    const { status } = req.body;
    if (!["active", "suspended"].includes(status)) {
      return res.status(400).json({ message: "Status must be active or suspended" });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(safeProfile(user));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
