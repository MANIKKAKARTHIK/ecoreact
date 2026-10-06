import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, default: "" },
  password: { type: String, required: true },
  role: { type: String, enum: ["customer", "driver", "buyer", "admin"], default: "customer" },
  address: { type: String, default: "" },
  city: { type: String, default: "" },
  pincode: { type: String, default: "" },
  status: { type: String, enum: ["active", "suspended", "inactive"], default: "active" },
  
  // Customer metrics
  ecoPoints: { type: Number, default: 0 },
  totalPlasticAvailable: { type: Number, default: 0 },
  totalOrders: { type: Number, default: 0 },

  // Driver metrics
  vehicleType: { type: String, default: "" },
  vehicleNumber: { type: String, default: "" },
  licenseNumber: { type: String, default: "" },
  availability: { type: Boolean, default: true },
  totalTrips: { type: Number, default: 0 },
  completedTrips: { type: Number, default: 0 },
  totalEarnings: { type: Number, default: 0 },
  rating: { type: Number, default: 5 },

  // Buyer metrics
  companyName: { type: String, default: "" },
  contactPerson: { type: String, default: "" },
  businessRegistrationNumber: { type: String, default: "" },
  totalPlasticPurchased: { type: Number, default: 0 },
  totalAmountSpent: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model("User", userSchema);
