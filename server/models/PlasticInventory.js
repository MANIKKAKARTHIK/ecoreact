import mongoose from "mongoose";

const plasticInventorySchema = new mongoose.Schema({
  plasticType: { type: String, required: true, unique: true },
  quantityKg: { type: Number, default: 0 },
  availableQuantityKg: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model("PlasticInventory", plasticInventorySchema);
