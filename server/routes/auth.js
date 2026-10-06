import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

export const safeProfile = (u) => ({
  id: u._id.toString(),
  uid: u._id.toString(),
  name: u.name,
  email: u.email,
  phone: u.phone || "",
  role: u.role,
  status: u.status || "active",
  address: u.address || "",
  city: u.city || "",
  pincode: u.pincode || "",
  ecoPoints: u.ecoPoints || 0,
  totalPlasticAvailable: u.totalPlasticAvailable || 0,
  totalOrders: u.totalOrders || 0,
  vehicleType: u.vehicleType || "",
  vehicleNumber: u.vehicleNumber || "",
  licenseNumber: u.licenseNumber || "",
  availability: u.availability ?? true,
  totalTrips: u.totalTrips || 0,
  completedTrips: u.completedTrips || 0,
  totalEarnings: u.totalEarnings || 0,
  companyName: u.companyName || "",
  contactPerson: u.contactPerson || "",
  businessRegistrationNumber: u.businessRegistrationNumber || "",
  totalPlasticPurchased: u.totalPlasticPurchased || 0,
  totalAmountSpent: u.totalAmountSpent || 0
});

const createToken = (u) =>
  jwt.sign({ id: u._id.toString(), role: u.role, name: u.name }, process.env.JWT_SECRET, {
    expiresIn: "7d"
  });

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }
    const cleanRole = (role || "customer").toLowerCase().trim();
    if (cleanRole === "admin") {
      return res.status(403).json({ message: "Admin accounts cannot be registered publicly." });
    }
    if (!["customer", "driver", "buyer"].includes(cleanRole)) {
      return res.status(400).json({ message: "Invalid user role specified." });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: "Email is already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      phone: phone || "",
      role: cleanRole
    });

    res.status(201).json({
      token: createToken(user),
      profile: safeProfile(user)
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    if (user.status === "suspended") {
      return res.status(403).json({ message: "Account is suspended. Please contact support." });
    }

    res.json({
      token: createToken(user),
      profile: safeProfile(user)
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Login failed" });
  }
});

router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ profile: safeProfile(user) });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to fetch user" });
  }
});

export default router;
