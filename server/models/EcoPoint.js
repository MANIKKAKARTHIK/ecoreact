import mongoose from "mongoose";

const ecoPointSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  plasticId: { type: mongoose.Schema.Types.ObjectId, ref: "AvailablePlastic" },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, unique: true },
  quantityKg: { type: Number, required: true },
  plasticType: { type: String, required: true },
  pointsEarned: { type: Number, required: true },
  reason: { type: String, default: "Plastic recycling completed" }
}, { timestamps: true });

export default mongoose.model("EcoPoint", ecoPointSchema);
