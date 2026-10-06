import mongoose from "mongoose";

const availablePlasticSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  customerName: { type: String, default: "" },
  plasticType: { type: String, required: true, enum: ["PET", "HDPE", "LDPE", "PP", "Other"] },
  quantityKg: { type: Number, required: true, min: 0.1 },
  pickupAddress: { type: String, required: true },
  city: { type: String, required: true },
  pincode: { type: String, required: true },
  availableDate: { type: String, required: true },
  availableTime: { type: String, required: true },
  instructions: { type: String, default: "" },
  status: { type: String, enum: ["available", "ordered", "completed", "cancelled"], default: "available" },
  ecoPoints: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model("AvailablePlastic", availablePlasticSchema);
