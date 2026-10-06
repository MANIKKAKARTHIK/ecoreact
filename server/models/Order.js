import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  buyerName: { type: String, default: "" },
  plasticId: { type: mongoose.Schema.Types.ObjectId, ref: "AvailablePlastic", required: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  customerName: { type: String, default: "" },
  plasticType: { type: String, required: true },
  quantityKg: { type: Number, required: true },
  pricePerKg: { type: Number, default: 0 },
  orderAmount: { type: Number, default: 0 },
  pickupAddress: { type: String, required: true },
  deliveryAddress: { type: String, required: true },
  status: {
    type: String,
    enum: [
      "placed",
      "driver_assigned",
      "driver_accepted",
      "collecting",
      "arrived_customer",
      "collected",
      "delivering",
      "arrived_buyer",
      "delivered",
      "payment_pending",
      "payment_completed",
      "completed",
      "cancelled"
    ],
    default: "placed"
  },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  driverName: { type: String, default: "" }
}, { timestamps: true });

export default mongoose.model("Order", orderSchema);
