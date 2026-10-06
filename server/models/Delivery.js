import mongoose from "mongoose";

const deliverySchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  driverName: { type: String, default: "" },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  buyerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  pickupAddress: { type: String, required: true },
  deliveryAddress: { type: String, required: true },
  status: {
    type: String,
    enum: [
      "assigned",
      "driver_accepted",
      "collecting",
      "arrived_customer",
      "collected",
      "delivering",
      "arrived_buyer",
      "delivered",
      "payment_pending",
      "completed",
      "cancelled"
    ],
    default: "assigned"
  },
  acceptedAt: { type: Date, default: Date.now },
  arrivedCustomerAt: Date,
  collectedAt: Date,
  deliveringAt: Date,
  arrivedBuyerAt: Date,
  deliveredAt: Date,
  completedAt: Date
}, { timestamps: true });

export default mongoose.model("Delivery", deliverySchema);
