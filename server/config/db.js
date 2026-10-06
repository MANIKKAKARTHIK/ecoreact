import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Pricing from "../models/Pricing.js";
import PlasticInventory from "../models/PlasticInventory.js";
import User from "../models/User.js";

const DEFAULT_PRICING = [
  { plasticType: "PET", customerEcoPointsPerKg: 10, buyerPricePerKg: 20, driverPaymentPerOrder: 50, active: true },
  { plasticType: "HDPE", customerEcoPointsPerKg: 8, buyerPricePerKg: 18, driverPaymentPerOrder: 50, active: true },
  { plasticType: "LDPE", customerEcoPointsPerKg: 6, buyerPricePerKg: 15, driverPaymentPerOrder: 50, active: true },
  { plasticType: "PP", customerEcoPointsPerKg: 7, buyerPricePerKg: 16, driverPaymentPerOrder: 50, active: true },
  { plasticType: "Other", customerEcoPointsPerKg: 5, buyerPricePerKg: 12, driverPaymentPerOrder: 50, active: true }
];

export async function connectDB() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("MongoDB connected");

  // Seed default pricing if none exist
  const pricingCount = await Pricing.countDocuments();
  if (pricingCount === 0) {
    await Pricing.insertMany(DEFAULT_PRICING);
    console.log("Default pricing seeded");
  }

  // Seed default inventory tracking records if none exist
  for (const item of DEFAULT_PRICING) {
    const exists = await PlasticInventory.findOne({ plasticType: item.plasticType });
    if (!exists) {
      await PlasticInventory.create({ plasticType: item.plasticType, quantityKg: 0, availableQuantityKg: 0 });
    }
  }

  // Seed default admin account if none exists
  const adminExists = await User.findOne({ role: "admin" });
  if (!adminExists) {
    const hashedPassword = await bcrypt.hash("admin123", 12);
    await User.create({
      name: "EcoPlastic Admin",
      email: "admin@ecoplastic.com",
      password: hashedPassword,
      role: "admin",
      phone: "9999999999",
      city: "Chennai"
    });
    console.log("Default admin account created: admin@ecoplastic.com");
  }
}
