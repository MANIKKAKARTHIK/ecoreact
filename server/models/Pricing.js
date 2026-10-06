import mongoose from "mongoose";

const pricingSchema = new mongoose.Schema({
  plasticType: { type: String, required: true, unique: true },
  customerEcoPointsPerKg: { type: Number, default: 5 },
  buyerPricePerKg: { type: Number, default: 10 },
  driverPaymentPerOrder: { type: Number, default: 40 },
  active: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model("Pricing", pricingSchema);
