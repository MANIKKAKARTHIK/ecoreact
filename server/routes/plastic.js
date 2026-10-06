import express from "express";
import AvailablePlastic from "../models/AvailablePlastic.js";
import User from "../models/User.js";
import Pricing from "../models/Pricing.js";
import PlasticInventory from "../models/PlasticInventory.js";
import Notification from "../models/Notification.js";
import { auth, roles } from "../middleware/auth.js";

const router = express.Router();

const formatPlastic = (item, pricingMap = {}) => {
  const obj = item.toObject ? item.toObject() : item;
  const priceInfo = pricingMap[obj.plasticType] || { buyerPricePerKg: 15, customerEcoPointsPerKg: 8 };
  const pricePerKg = priceInfo.buyerPricePerKg || 15;
  const estimatedTotal = Math.round((Number(obj.quantityKg) || 0) * pricePerKg);
  const potentialEcoPoints = Math.round((Number(obj.quantityKg) || 0) * (priceInfo.customerEcoPointsPerKg || 8));

  return {
    ...obj,
    id: obj._id.toString(),
    pricePerKg,
    estimatedTotal,
    potentialEcoPoints
  };
};

// GET /api/plastic - List plastic listings
router.get("/", auth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.customerId) filter.customerId = req.query.customerId;
    if (req.query.plasticType) filter.plasticType = req.query.plasticType;

    const items = await AvailablePlastic.find(filter).sort({ createdAt: -1 });
    
    // Load active pricing map for calculated totals
    const pricings = await Pricing.find({ active: true });
    const pricingMap = {};
    pricings.forEach((p) => {
      pricingMap[p.plasticType] = p;
    });

    res.json(items.map((item) => formatPlastic(item, pricingMap)));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/plastic - Customer makes plastic available
router.post("/", auth, roles("customer"), async (req, res) => {
  try {
    const {
      plasticType,
      quantityKg,
      pickupAddress,
      city,
      pincode,
      availableDate,
      availableTime,
      instructions
    } = req.body;

    const validTypes = ["PET", "HDPE", "LDPE", "PP", "Other"];
    if (!validTypes.includes(plasticType)) {
      return res.status(400).json({ message: `Invalid plastic type. Must be one of: ${validTypes.join(", ")}` });
    }

    const qty = Number(quantityKg);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ message: "Quantity must be greater than 0 kg" });
    }

    if (!pickupAddress || !city || !pincode || !availableDate || !availableTime) {
      return res.status(400).json({ message: "Pickup address, city, pincode, date, and time are required." });
    }

    const customer = await User.findById(req.user.id);
    if (!customer) return res.status(404).json({ message: "Customer not found" });

    const newListing = await AvailablePlastic.create({
      customerId: customer._id,
      customerName: customer.name,
      plasticType,
      quantityKg: qty,
      pickupAddress: pickupAddress.trim(),
      city: city.trim(),
      pincode: pincode.trim(),
      availableDate,
      availableTime,
      instructions: (instructions || "").trim(),
      status: "available"
    });

    // Update customer metric
    await User.findByIdAndUpdate(customer._id, {
      $inc: { totalPlasticAvailable: qty }
    });

    // Update plastic inventory metric
    await PlasticInventory.findOneAndUpdate(
      { plasticType },
      { $inc: { availableQuantityKg: qty } },
      { upsert: true }
    );

    // Create confirmation notification
    await Notification.create({
      userId: customer._id,
      title: "Listing Created",
      message: `Your ${qty} kg of ${plasticType} is now available on the Marketplace for buyers.`,
      type: "listing_created"
    });

    res.status(201).json(formatPlastic(newListing));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
