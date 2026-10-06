import express from "express";
import Order from "../models/Order.js";
import AvailablePlastic from "../models/AvailablePlastic.js";
import Pricing from "../models/Pricing.js";
import Delivery from "../models/Delivery.js";
import Transaction from "../models/Transaction.js";
import EcoPoint from "../models/EcoPoint.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import PlasticInventory from "../models/PlasticInventory.js";
import { auth, roles } from "../middleware/auth.js";

const router = express.Router();

const formatOrder = (o) => ({
  ...o.toObject(),
  id: o._id.toString()
});

// GET /api/orders
router.get("/", auth, async (req, res) => {
  try {
    const query = {};
    if (req.query.buyerId) query.buyerId = req.query.buyerId;
    if (req.query.customerId) query.customerId = req.query.customerId;
    if (req.query.driverId) query.driverId = req.query.driverId;
    if (req.query.status) query.status = req.query.status;

    // If driver is querying and requests queue, include unassigned placed orders or orders assigned to this driver
    if (req.user.role === "driver" && req.query.queue === "true") {
      const orders = await Order.find({
        $or: [
          { status: "placed", driverId: null },
          { driverId: req.user.id, status: { $nin: ["completed", "cancelled"] } }
        ]
      }).sort({ createdAt: -1 });
      return res.json(orders.map(formatOrder));
    }

    // Role-based automatic scoping if not admin
    if (req.user.role === "customer") {
      query.customerId = req.user.id;
    } else if (req.user.role === "buyer") {
      query.buyerId = req.user.id;
    }

    const orders = await Order.find(query).sort({ createdAt: -1 });
    res.json(orders.map(formatOrder));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/orders - Buyer places order
router.post("/", auth, roles("buyer"), async (req, res) => {
  try {
    const { plasticId, deliveryAddress } = req.body;
    if (!plasticId) {
      return res.status(400).json({ message: "plasticId is required" });
    }

    // Atomic update to prevent race conditions / duplicate purchase
    const plastic = await AvailablePlastic.findOneAndUpdate(
      { _id: plasticId, status: "available" },
      { status: "ordered" },
      { new: true }
    );

    if (!plastic) {
      return res.status(400).json({ message: "Plastic listing is no longer available or already ordered." });
    }

    const buyer = await User.findById(req.user.id);
    const pricing = await Pricing.findOne({ plasticType: plastic.plasticType, active: true });
    const pricePerKg = pricing?.buyerPricePerKg || 15;
    const orderAmount = Math.round((Number(plastic.quantityKg) || 0) * pricePerKg);
    const resolvedDeliveryAddress = (deliveryAddress || buyer.address || "Buyer Facility").trim();

    const order = await Order.create({
      buyerId: buyer._id,
      buyerName: buyer.companyName || buyer.name,
      plasticId: plastic._id,
      customerId: plastic.customerId,
      customerName: plastic.customerName || "Customer",
      plasticType: plastic.plasticType,
      quantityKg: plastic.quantityKg,
      pricePerKg,
      orderAmount,
      pickupAddress: `${plastic.pickupAddress}, ${plastic.city} - ${plastic.pincode}`,
      deliveryAddress: resolvedDeliveryAddress,
      status: "placed"
    });

    // Update buyer stats & inventory
    await User.findByIdAndUpdate(buyer._id, { $inc: { totalOrders: 1 } });
    await PlasticInventory.findOneAndUpdate(
      { plasticType: plastic.plasticType },
      { $inc: { availableQuantityKg: -plastic.quantityKg } }
    );

    // Notifications
    await Notification.create({
      userId: plastic.customerId,
      title: "Plastic Listing Ordered",
      message: `Your listing of ${plastic.quantityKg} kg ${plastic.plasticType} has been ordered. A driver will be assigned soon.`,
      type: "order_placed",
      relatedOrderId: order._id
    });

    await Notification.create({
      userId: buyer._id,
      title: "Order Placed Successfully",
      message: `Order #${order._id.toString().slice(-6)} placed for ${plastic.quantityKg} kg ${plastic.plasticType}. Total amount: ₹${orderAmount}.`,
      type: "order_placed",
      relatedOrderId: order._id
    });

    res.status(201).json(formatOrder(order));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Driver workflow steps
const STATUS_FLOW = [
  "placed",
  "driver_accepted",
  "arrived_customer",
  "collected",
  "delivering",
  "arrived_buyer",
  "payment_pending"
];

// PATCH /api/orders/:id/advance - Driver accepts order and advances through steps
router.patch("/:id/advance", auth, roles("driver"), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const driver = await User.findById(req.user.id);

    // Case 1: Driver accepts unassigned order
    if (!order.driverId || order.status === "placed") {
      const claimed = await Order.findOneAndUpdate(
        { _id: order._id, $or: [{ status: "placed" }, { driverId: null }] },
        {
          driverId: driver._id,
          driverName: driver.name,
          status: "driver_accepted"
        },
        { new: true }
      );

      if (!claimed) {
        return res.status(400).json({ message: "Order was already accepted by another driver." });
      }

      await Delivery.findOneAndUpdate(
        { orderId: claimed._id },
        {
          orderId: claimed._id,
          driverId: driver._id,
          driverName: driver.name,
          customerId: claimed.customerId,
          buyerId: claimed.buyerId,
          pickupAddress: claimed.pickupAddress,
          deliveryAddress: claimed.deliveryAddress,
          status: "driver_accepted",
          acceptedAt: new Date()
        },
        { upsert: true, new: true }
      );

      // Notify customer and buyer
      await Notification.create([
        {
          userId: claimed.customerId,
          title: "Driver Assigned",
          message: `Driver ${driver.name} accepted your pickup and is on the way.`,
          type: "driver_accepted",
          relatedOrderId: claimed._id
        },
        {
          userId: claimed.buyerId,
          title: "Driver Assigned",
          message: `Driver ${driver.name} accepted your order and is heading for pickup.`,
          type: "driver_accepted",
          relatedOrderId: claimed._id
        }
      ]);

      return res.json(formatOrder(claimed));
    }

    // Case 2: Advance existing assigned order
    if (order.driverId.toString() !== req.user.id) {
      return res.status(403).json({ message: "This order is assigned to another driver." });
    }

    const currentIndex = STATUS_FLOW.indexOf(order.status);
    if (currentIndex === -1 || currentIndex >= STATUS_FLOW.length - 1) {
      return res.status(400).json({ message: `Cannot advance order in status: ${order.status}` });
    }

    let nextStatus = STATUS_FLOW[currentIndex + 1];
    // If delivering -> delivered, automatically proceed to payment_pending
    if (nextStatus === "delivered") {
      nextStatus = "payment_pending";
    }

    order.status = nextStatus;
    await order.save();

    // Update delivery record timestamps
    const deliveryUpdate = { status: nextStatus };
    const now = new Date();
    if (nextStatus === "arrived_customer") deliveryUpdate.arrivedCustomerAt = now;
    if (nextStatus === "collected") deliveryUpdate.collectedAt = now;
    if (nextStatus === "delivering") deliveryUpdate.deliveringAt = now;
    if (nextStatus === "arrived_buyer") deliveryUpdate.arrivedBuyerAt = now;
    if (nextStatus === "payment_pending" || nextStatus === "delivered") deliveryUpdate.deliveredAt = now;

    await Delivery.findOneAndUpdate({ orderId: order._id }, deliveryUpdate);

    // Notify at key stages
    if (nextStatus === "arrived_customer") {
      await Notification.create({
        userId: order.customerId,
        title: "Driver Arrived",
        message: `Driver ${driver.name} has arrived at your location for plastic pickup.`,
        relatedOrderId: order._id
      });
    } else if (nextStatus === "collected") {
      await Notification.create([
        {
          userId: order.customerId,
          title: "Plastic Collected",
          message: `Your plastic (${order.quantityKg} kg) was collected. Eco Points will be awarded once delivered and verified!`,
          relatedOrderId: order._id
        },
        {
          userId: order.buyerId,
          title: "Order Collected",
          message: `Plastic has been picked up from the customer and is now in transit.`,
          relatedOrderId: order._id
        }
      ]);
    } else if (nextStatus === "payment_pending") {
      await Notification.create([
        {
          userId: order.buyerId,
          title: "Order Delivered - Cash Payment Due",
          message: `Your order has arrived! Please pay ₹${order.orderAmount} cash to driver ${driver.name}.`,
          relatedOrderId: order._id
        },
        {
          userId: driver._id,
          title: "Collect Cash Payment",
          message: `Please collect ₹${order.orderAmount} in cash from the buyer and click 'Confirm Cash Received'.`,
          relatedOrderId: order._id
        }
      ]);
    }

    res.json(formatOrder(order));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/orders/:id/confirm-cash - Driver confirms cash received
router.patch("/:id/confirm-cash", auth, roles("driver"), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (!order.driverId || order.driverId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only the assigned driver can confirm payment." });
    }

    if (order.status !== "payment_pending" && order.status !== "delivered") {
      return res.status(400).json({ message: `Cannot confirm cash in current status: ${order.status}` });
    }

    // Prevent duplicate payment confirmation
    const existingTx = await Transaction.findOne({ orderId: order._id, status: "confirmed" });
    if (existingTx) {
      return res.status(400).json({ message: "Payment has already been confirmed for this order." });
    }

    const pricing = await Pricing.findOne({ plasticType: order.plasticType, active: true });
    const ecoPointsPerKg = pricing?.customerEcoPointsPerKg || 10;
    const pointsEarned = Math.round((Number(order.quantityKg) || 0) * ecoPointsPerKg);
    const driverEarnings = Number(pricing?.driverPaymentPerOrder) || 50;

    const now = new Date();

    // 1. Create Transaction record
    await Transaction.create({
      orderId: order._id,
      buyerId: order.buyerId,
      driverId: order.driverId,
      amount: order.orderAmount,
      paymentMethod: "cash",
      status: "confirmed",
      paidAt: now,
      confirmedAt: now
    });

    // 2. Award Eco Points once (protected by unique index on orderId)
    await EcoPoint.create({
      customerId: order.customerId,
      plasticId: order.plasticId,
      orderId: order._id,
      quantityKg: order.quantityKg,
      plasticType: order.plasticType,
      pointsEarned,
      reason: `Recycled ${order.quantityKg} kg of ${order.plasticType}`
    });

    // 3. Update Customer profile
    await User.findByIdAndUpdate(order.customerId, {
      $inc: { ecoPoints: pointsEarned, totalOrders: 1 }
    });

    // 4. Update Driver profile
    await User.findByIdAndUpdate(order.driverId, {
      $inc: { completedTrips: 1, totalTrips: 1, totalEarnings: driverEarnings }
    });

    // 5. Update Buyer profile
    await User.findByIdAndUpdate(order.buyerId, {
      $inc: { totalPlasticPurchased: order.quantityKg, totalAmountSpent: order.orderAmount }
    });

    // 6. Update AvailablePlastic
    await AvailablePlastic.findByIdAndUpdate(order.plasticId, {
      status: "completed",
      ecoPoints: pointsEarned
    });

    // 7. Update Delivery
    await Delivery.findOneAndUpdate(
      { orderId: order._id },
      { status: "completed", completedAt: now }
    );

    // 8. Update Inventory (total plastic recycled)
    await PlasticInventory.findOneAndUpdate(
      { plasticType: order.plasticType },
      { $inc: { quantityKg: order.quantityKg } }
    );

    // 9. Update Order
    order.status = "completed";
    await order.save();

    // 10. Notifications
    await Notification.create([
      {
        userId: order.customerId,
        title: "Eco Points Credited!",
        message: `Congratulations! Your plastic has been recycled. You earned ${pointsEarned} Eco Points.`,
        type: "eco_points_earned",
        relatedOrderId: order._id
      },
      {
        userId: order.buyerId,
        title: "Order Completed",
        message: `Order #${order._id.toString().slice(-6)} completed. Payment of ₹${order.orderAmount} confirmed. Thank you!`,
        type: "order_completed",
        relatedOrderId: order._id
      },
      {
        userId: order.driverId,
        title: "Delivery Completed",
        message: `Trip completed! ₹${driverEarnings} earnings credited for order #${order._id.toString().slice(-6)}.`,
        type: "delivery_completed",
        relatedOrderId: order._id
      }
    ]);

    res.json({
      order: formatOrder(order),
      pointsEarned,
      message: `Cash payment confirmed. Customer received ${pointsEarned} Eco Points.`
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
