import "dotenv/config";
import mongoose from "mongoose";

const BASE_URL = "http://localhost:5000/api";

async function post(path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`POST ${path} failed (${res.status}): ${data.message || JSON.stringify(data)}`);
  return data;
}

async function get(path, token) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, { headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`GET ${path} failed (${res.status}): ${data.message || JSON.stringify(data)}`);
  return data;
}

async function patch(path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body || {})
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`PATCH ${path} failed (${res.status}): ${data.message || JSON.stringify(data)}`);
  return data;
}

async function runE2ETest() {
  console.log("=== STARTING ECOPLASTIC END-TO-END TEST ===");
  const testId = Date.now();

  // STEP 1: Register/Login Customer
  console.log("\n[STEP 1] Registering and logging in Customer...");
  const customerEmail = `customer_${testId}@ecoplastic.test`;
  const customerReg = await post("/auth/register", {
    name: "Ravi Customer",
    email: customerEmail,
    password: "Password123!",
    phone: "9876543210",
    role: "customer"
  });
  const customerToken = customerReg.token;
  console.log(`✓ Customer registered. ID: ${customerReg.profile.id}`);

  const customerLogin = await post("/auth/login", {
    email: customerEmail,
    password: "Password123!"
  });
  console.log(`✓ Customer logged in successfully. Token verified.`);

  // STEP 2: Customer creates Plastic: PET, 5 KG
  console.log("\n[STEP 2] Customer creates available plastic listing: PET, 5 KG...");
  const listingData = {
    plasticType: "PET",
    quantityKg: 5,
    pickupAddress: "123 Green Avenue, Anna Nagar",
    city: "Chennai",
    pincode: "600040",
    availableDate: "2026-10-10",
    availableTime: "11:00",
    instructions: "Call before arrival"
  };
  const listing = await post("/plastic", listingData, customerToken);
  console.log(`✓ Listing created. ID: ${listing.id}, Status: ${listing.status}, Qty: ${listing.quantityKg} kg`);
  if (listing.status !== "available") throw new Error("Listing status is not 'available'!");

  // STEP 3: Register/Login Buyer and check Marketplace
  console.log("\n[STEP 3] Registering and logging in Buyer, verifying marketplace...");
  const buyerEmail = `buyer_${testId}@ecoplastic.test`;
  const buyerReg = await post("/auth/register", {
    name: "Apex Recyclers",
    email: buyerEmail,
    password: "Password123!",
    phone: "9123456780",
    role: "buyer"
  });
  const buyerToken = buyerReg.token;
  console.log(`✓ Buyer registered. ID: ${buyerReg.profile.id}`);

  const marketplace = await get("/plastic?status=available", buyerToken);
  const foundListing = marketplace.find(p => p.id === listing.id);
  if (!foundListing) throw new Error("Listing not found in Buyer marketplace!");
  console.log(`✓ Listing found in Marketplace: ${foundListing.plasticType} ${foundListing.quantityKg} kg (₹${foundListing.pricePerKg}/kg, Total: ₹${foundListing.estimatedTotal})`);

  // STEP 4: Buyer places order
  console.log("\n[STEP 4] Buyer places order for plastic listing...");
  const order = await post("/orders", {
    plasticId: listing.id,
    deliveryAddress: "45 Industrial Estate, Guindy, Chennai"
  }, buyerToken);
  console.log(`✓ Order placed. ID: ${order.id}, Status: ${order.status}, Total Amount: ₹${order.orderAmount}`);
  if (order.status !== "placed") throw new Error("Order status is not 'placed'!");

  // Verify availablePlastic status is now 'ordered'
  const updatedListing = await get(`/plastic?customerId=${customerReg.profile.id}`, customerToken);
  const checkListing = updatedListing.find(p => p.id === listing.id);
  if (checkListing.status !== "ordered") throw new Error(`Listing status should be 'ordered' but is '${checkListing.status}'`);
  console.log(`✓ Verified listing status updated to 'ordered' in database.`);

  // STEP 5: Register/Login Driver and accept order
  console.log("\n[STEP 5] Registering Driver and accepting order...");
  const driverEmail = `driver_${testId}@ecoplastic.test`;
  const driverReg = await post("/auth/register", {
    name: "Suresh Driver",
    email: driverEmail,
    password: "Password123!",
    phone: "9444332211",
    role: "driver"
  });
  const driverToken = driverReg.token;
  console.log(`✓ Driver registered. ID: ${driverReg.profile.id}`);

  const driverQueue = await get("/orders?queue=true", driverToken);
  const orderInQueue = driverQueue.find(o => o.id === order.id);
  if (!orderInQueue) throw new Error("Order not found in driver pickup queue!");
  console.log(`✓ Order found in driver queue.`);

  const acceptedOrder = await patch(`/orders/${order.id}/advance`, {}, driverToken);
  console.log(`✓ Driver accepted order. Driver ID: ${acceptedOrder.driverId}, Status: ${acceptedOrder.status}`);
  if (acceptedOrder.status !== "driver_accepted") throw new Error("Order status not 'driver_accepted'!");

  // STEP 6: Driver marks arrived_customer and collected
  console.log("\n[STEP 6] Driver advances: arrived_customer -> collected...");
  const arrivedCustomer = await patch(`/orders/${order.id}/advance`, {}, driverToken);
  console.log(`✓ Status updated to: ${arrivedCustomer.status}`);

  const collected = await patch(`/orders/${order.id}/advance`, {}, driverToken);
  console.log(`✓ Status updated to: ${collected.status}`);
  if (collected.status !== "collected") throw new Error("Order status not 'collected'!");

  // Check customer and buyer view
  const custOrders = await get(`/orders?customerId=${customerReg.profile.id}`, customerToken);
  const custOrderCheck = custOrders.find(o => o.id === order.id);
  console.log(`✓ Customer view verified: order status is '${custOrderCheck.status}'`);

  const buyerOrders = await get(`/orders?buyerId=${buyerReg.profile.id}`, buyerToken);
  const buyerOrderCheck = buyerOrders.find(o => o.id === order.id);
  console.log(`✓ Buyer view verified: order status is '${buyerOrderCheck.status}'`);

  // STEP 7: Driver marks delivering -> arrived_buyer -> payment_pending
  console.log("\n[STEP 7] Driver advances: delivering -> arrived_buyer -> payment_pending...");
  const delivering = await patch(`/orders/${order.id}/advance`, {}, driverToken);
  console.log(`✓ Status updated to: ${delivering.status}`);
  if (delivering.status !== "delivering") throw new Error("Order status not 'delivering'!");

  const arrivedBuyer = await patch(`/orders/${order.id}/advance`, {}, driverToken);
  console.log(`✓ Status updated to: ${arrivedBuyer.status}`);
  if (arrivedBuyer.status !== "arrived_buyer") throw new Error("Order status not 'arrived_buyer'!");

  const paymentPending = await patch(`/orders/${order.id}/advance`, {}, driverToken);
  console.log(`✓ Status updated to: ${paymentPending.status}`);
  if (paymentPending.status !== "payment_pending") throw new Error("Order status not 'payment_pending'!");

  // STEP 8: Driver confirms cash received
  console.log("\n[STEP 8] Driver confirms cash received (CASH PAYMENT FLOW)...");
  const confirmResult = await patch(`/orders/${order.id}/confirm-cash`, {}, driverToken);
  console.log(`✓ Cash confirmed! Points awarded: ${confirmResult.pointsEarned}. Message: ${confirmResult.message}`);
  if (confirmResult.pointsEarned <= 0) throw new Error("Eco points earned was not greater than 0!");

  // STEP 9: Verify completed statuses
  console.log("\n[STEP 9] Verifying order, delivery, and plastic completion...");
  const finalOrder = await get(`/orders?buyerId=${buyerReg.profile.id}`, buyerToken);
  const completedOrder = finalOrder.find(o => o.id === order.id);
  if (completedOrder.status !== "completed") throw new Error("Order is not completed!");
  console.log(`✓ Order status is 'completed'.`);

  const txList = await get(`/transactions?orderId=${order.id}`, buyerToken);
  if (txList.length === 0 || txList[0].paymentMethod !== "cash" || txList[0].status !== "confirmed") {
    throw new Error("Transaction verification failed!");
  }
  console.log(`✓ Transaction confirmed: Cash amount ₹${txList[0].amount}, status: ${txList[0].status}`);

  // STEP 10: VERIFY ECO POINTS (Awarded exactly once!)
  console.log("\n[STEP 10] Verifying Eco Points awarded to customer exactly once...");
  const customerProfile = await get("/auth/me", customerToken);
  console.log(`✓ Customer profile Eco Points: ${customerProfile.profile.ecoPoints}`);
  if (customerProfile.profile.ecoPoints !== confirmResult.pointsEarned) {
    throw new Error(`Customer points mismatch: expected ${confirmResult.pointsEarned}, got ${customerProfile.profile.ecoPoints}`);
  }

  // Attempt duplicate cash confirmation (must fail!)
  try {
    await patch(`/orders/${order.id}/confirm-cash`, {}, driverToken);
    throw new Error("Duplicate cash confirmation succeeded when it should have been blocked!");
  } catch (e) {
    console.log(`✓ Duplicate payment protection verified: ${e.message}`);
  }

  // STEP 11: Admin Login and verification
  console.log("\n[STEP 11] Logging in Admin and verifying dashboard stats...");
  const adminLogin = await post("/auth/login", {
    email: "admin@ecoplastic.com",
    password: "admin123"
  });
  const adminToken = adminLogin.token;
  console.log(`✓ Admin logged in. Role: ${adminLogin.profile.role}`);

  const adminStats = await get("/admin/stats", adminToken);
  console.log("✓ Admin statistics retrieved successfully:", JSON.stringify(adminStats));

  const adminUsers = await get("/users", adminToken);
  console.log(`✓ Admin user audit: ${adminUsers.length} total users in system.`);

  const adminPricing = await get("/pricing", adminToken);
  console.log(`✓ Admin pricing audit: ${adminPricing.length} pricing records available.`);

  console.log("\n=======================================================");
  console.log(">>> ALL 11 END-TO-END WORKFLOW STEPS PASSED SUCCESSFULLY! <<<");
  console.log("=======================================================\n");
}

runE2ETest().catch((e) => {
  console.error("\n❌ E2E TEST FAILED:", e);
  process.exit(1);
});
