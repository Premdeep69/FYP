import SessionRequest from "../models/sessionRequest.js";
import SessionSlot from "../models/sessionSlot.js";
import Session from "../models/session.js";
import Payment from "../models/payment.js";
import User from "../models/users.js";
import stripe from "../config/stripe.js";
import syncService from "../services/syncService.js";

// ── helpers ──────────────────────────────────────────────────────────────────
const calcEndTime = (startTime, durationMinutes) => {
  const [h, m] = startTime.split(":").map(Number);
  const total = h * 60 + m + durationMinutes;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

const populateRequest = (req) =>
  req.populate([
    { path: "userId",        select: "name email" },
    { path: "trainerId",     select: "name email trainerProfile" },
    { path: "createdSlotId" },
    { path: "createdBookingId" },
  ]);

// ── POST /api/session-requests  (user) ───────────────────────────────────────
export const createRequest = async (req, res) => {
  try {
    const { trainerId, sessionType, preferredDate, preferredTime, duration, mode, message } = req.body;

    if (!trainerId || !sessionType || !preferredDate || !preferredTime)
      return res.status(400).json({ message: "trainerId, sessionType, preferredDate and preferredTime are required" });

    const trainer = await User.findOne({ _id: trainerId, userType: "trainer", isActive: true });
    if (!trainer) return res.status(404).json({ message: "Trainer not found" });

    const request = await SessionRequest.create({
      userId: req.user._id,
      trainerId,
      sessionType,
      preferredDate: new Date(preferredDate),
      preferredTime,
      duration: duration || 60,
      mode: mode || "offline",
      message,
    });

    await populateRequest(request);
    syncService.emit("sessionRequest:created", { request });
    res.status(201).json({ message: "Session request sent successfully", request });
  } catch (err) {
    console.error("createRequest:", err);
    res.status(500).json({ message: err.message });
  }
};

// ── GET /api/session-requests/my  (user) ─────────────────────────────────────
export const getUserRequests = async (req, res) => {
  try {
    const requests = await SessionRequest.find({ userId: req.user._id })
      .populate("trainerId", "name email trainerProfile")
      .populate("createdBookingId", "status cancelledByRole refundPercentage cancellationReason cancelledAt")
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── GET /api/session-requests/trainer  (trainer) ─────────────────────────────
export const getTrainerRequests = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = { trainerId: req.user._id };
    if (status) filter.status = status;
    const requests = await SessionRequest.find(filter)
      .populate("userId", "name email profile")
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── PUT /api/session-requests/:id/accept  (trainer) ──────────────────────────
// Sets status → awaiting_payment, creates Stripe PaymentIntent, returns clientSecret
export const acceptRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { trainerNote, price } = req.body;
    const trainerId = req.user._id;

    const request = await SessionRequest.findOne({ _id: id, trainerId });
    if (!request) return res.status(404).json({ message: "Request not found" });
    if (request.status !== "pending") return res.status(400).json({ message: "Request already processed" });

    // Resolve price
    const trainer = await User.findById(trainerId);
    const stConfig = trainer.trainerProfile?.sessionTypes?.find(s => s.type === request.sessionType);
    const sessionPrice = Number(price) || stConfig?.price || trainer.trainerProfile?.hourlyRate || 50;

    // Payment deadline: 24 hours from now
    const paymentDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Create Stripe PaymentIntent (if Stripe is configured)
    let clientSecret = null;
    let paymentIntentId = null;
    let paymentRecord = null;

    const stripeConfigured = stripe &&
      process.env.STRIPE_SECRET_KEY &&
      !process.env.STRIPE_SECRET_KEY.includes("your_stripe");

    if (stripeConfigured) {
      // Get/create Stripe customer for user
      const userDoc = await User.findById(request.userId);
      if (!userDoc) throw new Error("User not found");
      let customer;
      if (userDoc.stripeCustomerId) {
        customer = await stripe.customers.retrieve(userDoc.stripeCustomerId);
      } else {
        customer = await stripe.customers.create({
          email: userDoc.email,
          name: userDoc.name,
          metadata: { userId: request.userId.toString() },
        });
        await User.findByIdAndUpdate(request.userId, { stripeCustomerId: customer.id });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(sessionPrice * 100),
        currency: "usd",
        customer: customer.id,
        metadata: {
          sessionRequestId: request._id.toString(),
          userId: request.userId.toString(),
          trainerId: trainerId.toString(),
          type: "session_request",
        },
        description: `Session request: ${request.sessionType} with ${trainer.name}`,
        automatic_payment_methods: { enabled: true },
      });

      clientSecret = paymentIntent.client_secret;
      paymentIntentId = paymentIntent.id;

      // Save payment record (pending)
      paymentRecord = await Payment.create({
        userId: request.userId,
        trainerId,
        stripePaymentIntentId: paymentIntent.id,
        stripeCustomerId: customer.id,
        amount: Math.round(sessionPrice * 100),
        paymentType: "session",
        description: `Session request: ${request.sessionType} with ${trainer.name}`,
        metadata: {
          sessionRequestId: request._id.toString(),
          sessionDate: request.preferredDate,
          sessionDuration: request.duration,
        },
      });
    }

    // Update request
    request.status = "awaiting_payment";
    request.agreedPrice = sessionPrice;
    request.trainerNote = trainerNote || "";
    request.paymentDeadline = paymentDeadline;
    if (paymentIntentId) request.stripePaymentIntentId = paymentIntentId;
    if (clientSecret) request.stripeClientSecret = clientSecret;
    if (paymentRecord) request.paymentId = paymentRecord._id;
    await request.save();

    await populateRequest(request);
    syncService.emit("sessionRequest:awaiting_payment", { request, clientSecret, sessionPrice });

    res.json({
      message: "Request accepted. User must complete payment within 24 hours.",
      request,
      payment: stripeConfigured ? {
        clientSecret,
        paymentIntentId,
        amount: sessionPrice,
      } : null,
      requiresPayment: stripeConfigured,
      paymentDeadline,
    });
  } catch (err) {
    console.error("acceptRequest:", err);
    res.status(500).json({ message: err.message });
  }
};

// ── POST /api/session-requests/:id/confirm-payment  (user) ───────────────────
// Called after Stripe payment succeeds — creates slot + booking
export const confirmRequestPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentIntentId } = req.body;
    const userId = req.user._id;

    const request = await SessionRequest.findOne({ _id: id, userId });
    if (!request) return res.status(404).json({ message: "Request not found" });

    // Idempotency: already confirmed — return existing data
    if (request.status === "confirmed" && request.createdBookingId) {
      await populateRequest(request);
      return res.json({
        message: "Session already confirmed",
        request,
        alreadyConfirmed: true,
      });
    }

    if (request.status !== "awaiting_payment")
      return res.status(400).json({ message: `Cannot confirm payment for a request with status: ${request.status}` });

    // Check payment deadline
    if (request.paymentDeadline && new Date() > request.paymentDeadline) {
      request.status = "expired";
      await request.save();
      return res.status(400).json({ message: "Payment deadline has passed. Request expired." });
    }

    // Verify with Stripe if configured
    const stripeConfigured = stripe &&
      process.env.STRIPE_SECRET_KEY &&
      !process.env.STRIPE_SECRET_KEY.includes("your_stripe");

    if (stripeConfigured && paymentIntentId) {
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (pi.status !== "succeeded") {
        if (pi.status === "canceled") {
          request.status = "payment_failed";
          await request.save();
          syncService.emit("sessionRequest:payment_failed", { request });
          return res.status(400).json({ message: "Payment was cancelled. Request marked as failed." });
        }
        return res.status(400).json({ message: `Payment not completed. Status: ${pi.status}` });
      }
      // Update payment record
      if (request.paymentId) {
        await Payment.findByIdAndUpdate(request.paymentId, { status: "succeeded" });
      }
    }

    // Create session slot
    const trainer = await User.findById(request.trainerId);
    const userDoc = await User.findById(userId);
    if (!userDoc) return res.status(404).json({ message: "User not found" });
    const endTime = calcEndTime(request.preferredTime, request.duration || 60);

    const slot = await SessionSlot.create({
      trainerId: request.trainerId,
      title: `Session with ${userDoc.name}`,
      sessionType: request.sessionType,
      mode: request.mode,
      location: (request.mode === "offline" || request.mode === "hybrid") ? (request.location || "To be confirmed by trainer") : undefined,
      date: request.preferredDate,
      startTime: request.preferredTime,
      endTime,
      duration: request.duration || 60,
      price: request.agreedPrice,
      maxParticipants: 1,
      currentParticipants: 1,
      status: "full",
      bookedBy: [{
        userId,
        bookedAt: new Date(),
        hasAccess: true,
      }],
    });

    // Create confirmed booking (Session)
    const booking = await Session.create({
      trainerId: request.trainerId,
      clientId: userId,
      sessionType: request.sessionType,
      scheduledDate: request.preferredDate,
      startTime: request.preferredTime,
      endTime,
      duration: request.duration || 60,
      price: request.agreedPrice,
      status: "confirmed",
      paymentStatus: stripeConfigured ? "paid" : "pending",
      paymentId: request.paymentId || undefined,
      clientNotes: request.message,
      slotId: slot._id,
    });

    // Link booking to slot
    slot.bookedBy[0].bookingId = booking._id;
    await slot.save();

    // Update request
    request.status = "confirmed";
    request.createdSlotId = slot._id;
    request.createdBookingId = booking._id;
    await request.save();

    await populateRequest(request);

    syncService.emit("sessionRequest:confirmed", { request, slot, booking });
    syncService.emit("slot:created", { slot });

    res.json({
      message: "Payment confirmed. Session booked successfully!",
      request,
      slot,
      booking,
    });
  } catch (err) {
    console.error("confirmRequestPayment:", err);
    res.status(500).json({ message: err.message });
  }
};

// ── PUT /api/session-requests/:id/reject  (trainer) ──────────────────────────
export const rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { trainerNote } = req.body;
    const trainerId = req.user._id;

    const request = await SessionRequest.findOne({ _id: id, trainerId });
    if (!request) return res.status(404).json({ message: "Request not found" });
    if (!["pending", "awaiting_payment"].includes(request.status))
      return res.status(400).json({ message: "Request already processed" });

    // Cancel Stripe PaymentIntent if exists
    const stripeConfigured = stripe &&
      process.env.STRIPE_SECRET_KEY &&
      !process.env.STRIPE_SECRET_KEY.includes("your_stripe");

    if (stripeConfigured && request.stripePaymentIntentId) {
      try {
        await stripe.paymentIntents.cancel(request.stripePaymentIntentId);
      } catch (e) {
        console.warn("Could not cancel PaymentIntent:", e.message);
      }
    }

    request.status = "rejected";
    request.trainerNote = trainerNote || "";
    await request.save();

    await populateRequest(request);
    syncService.emit("sessionRequest:rejected", { request });

    res.json({ message: "Request rejected", request });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── POST /api/session-requests/expire-overdue  (internal / cron) ─────────────
export const expireOverdueRequests = async (req, res) => {
  try {
    const result = await SessionRequest.updateMany(
      { status: "awaiting_payment", paymentDeadline: { $lt: new Date() } },
      { status: "expired" }
    );
    res.json({ message: "Expired overdue requests", count: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── GET /api/session-requests/:id/payment-intent  (user) ─────────────────────
// Returns a fresh clientSecret for the payment intent on this request
export const getRequestPaymentIntent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const request = await SessionRequest.findOne({ _id: id, userId });
    if (!request) return res.status(404).json({ message: "Request not found" });
    if (request.status !== "awaiting_payment") {
      // If already confirmed, tell the frontend gracefully
      if (request.status === "confirmed") {
        return res.status(400).json({
          message: "This session has already been confirmed.",
          alreadyConfirmed: true,
        });
      }
      return res.status(400).json({ message: `Request status is ${request.status}, not awaiting_payment` });
    }

    // Check deadline
    if (request.paymentDeadline && new Date() > request.paymentDeadline) {
      request.status = "expired";
      await request.save();
      return res.status(400).json({ message: "Payment deadline has passed. Request expired." });
    }

    const stripeConfigured = stripe &&
      process.env.STRIPE_SECRET_KEY &&
      !process.env.STRIPE_SECRET_KEY.includes("your_stripe");

    if (!stripeConfigured) {
      // Stripe not configured — return stored clientSecret (dev mode)
      return res.json({
        clientSecret: request.stripeClientSecret,
        paymentIntentId: request.stripePaymentIntentId,
        amount: request.agreedPrice,
        requiresPayment: false,
      });
    }

    // If we already have a PaymentIntent, retrieve it to get a fresh clientSecret
    if (request.stripePaymentIntentId) {
      const pi = await stripe.paymentIntents.retrieve(request.stripePaymentIntentId);

      // If already succeeded, the request should have been confirmed
      if (pi.status === "succeeded") {
        return res.status(400).json({ message: "Payment already completed." });
      }

      // If canceled, create a new one
      if (pi.status !== "canceled") {
        return res.json({
          clientSecret: pi.client_secret,
          paymentIntentId: pi.id,
          amount: request.agreedPrice,
          requiresPayment: true,
        });
      }
    }

    // Create a fresh PaymentIntent
    const trainer = await User.findById(request.trainerId);
    const userDoc = await User.findById(userId);

    let customer;
    if (userDoc.stripeCustomerId) {
      customer = await stripe.customers.retrieve(userDoc.stripeCustomerId);
    } else {
      customer = await stripe.customers.create({
        email: userDoc.email,
        name: userDoc.name,
        metadata: { userId: userId.toString() },
      });
      await User.findByIdAndUpdate(userId, { stripeCustomerId: customer.id });
    }

    const pi = await stripe.paymentIntents.create({
      amount: Math.round(request.agreedPrice * 100),
      currency: "usd",
      customer: customer.id,
      metadata: {
        sessionRequestId: request._id.toString(),
        userId: userId.toString(),
        trainerId: request.trainerId.toString(),
        type: "session_request",
      },
      description: `Session request: ${request.sessionType} with ${trainer?.name || "trainer"}`,
      automatic_payment_methods: { enabled: true },
    });

    // Update request with new PaymentIntent
    request.stripePaymentIntentId = pi.id;
    request.stripeClientSecret = pi.client_secret;
    await request.save();

    res.json({
      clientSecret: pi.client_secret,
      paymentIntentId: pi.id,
      amount: request.agreedPrice,
      requiresPayment: true,
    });
  } catch (err) {
    console.error("getRequestPaymentIntent:", err);
    res.status(500).json({ message: err.message });
  }
};

// ── POST /api/session-requests/:id/sync-payment  (user) ──────────────────────
// Checks Stripe for a succeeded payment and auto-confirms the request if paid
export const syncRequestPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const request = await SessionRequest.findOne({ _id: id, userId });
    if (!request) return res.status(404).json({ message: "Request not found" });

    // Idempotency: already confirmed with a booking — return early
    if (request.status === "confirmed" && request.createdBookingId) {
      return res.json({ message: "Already confirmed", status: "confirmed", request });
    }

    if (request.status !== "awaiting_payment") {
      return res.json({ message: `Status is ${request.status}`, status: request.status, request });
    }

    // Check Stripe
    const stripeConfigured = stripe &&
      process.env.STRIPE_SECRET_KEY &&
      !process.env.STRIPE_SECRET_KEY.includes("your_stripe");

    if (!stripeConfigured || !request.stripePaymentIntentId) {
      return res.json({ message: "Stripe not configured or no payment intent", status: request.status });
    }

    const pi = await stripe.paymentIntents.retrieve(request.stripePaymentIntentId);

    if (pi.status !== "succeeded") {
      return res.json({ message: `Payment status: ${pi.status}`, status: request.status });
    }

    // Payment succeeded — run the full confirmation flow
    const trainer = await User.findById(request.trainerId);
    const userDoc = await User.findById(userId);
    const endTime = calcEndTime(request.preferredTime, request.duration || 60);

    const slot = await SessionSlot.create({
      trainerId: request.trainerId,
      title: `Session with ${userDoc.name}`,
      sessionType: request.sessionType,
      mode: request.mode,
      location: (request.mode === "offline" || request.mode === "hybrid") ? (request.location || "To be confirmed by trainer") : undefined,
      date: request.preferredDate,
      startTime: request.preferredTime,
      endTime,
      duration: request.duration || 60,
      price: request.agreedPrice,
      maxParticipants: 1,
      currentParticipants: 1,
      status: "full",
      bookedBy: [{ userId, bookedAt: new Date(), hasAccess: true }],
    });

    const booking = await Session.create({
      trainerId: request.trainerId,
      clientId: userId,
      sessionType: request.sessionType,
      scheduledDate: request.preferredDate,
      startTime: request.preferredTime,
      endTime,
      duration: request.duration || 60,
      price: request.agreedPrice,
      status: "confirmed",
      paymentStatus: "paid",
      paymentId: request.paymentId || undefined,
      clientNotes: request.message,
      slotId: slot._id,
    });

    slot.bookedBy[0].bookingId = booking._id;
    await slot.save();

    // Update payment record
    if (request.paymentId) {
      await Payment.findByIdAndUpdate(request.paymentId, { status: "succeeded" });
    }

    request.status = "confirmed";
    request.createdSlotId = slot._id;
    request.createdBookingId = booking._id;
    await request.save();

    await request.populate([
      { path: "userId", select: "name email" },
      { path: "trainerId", select: "name email trainerProfile" },
      { path: "createdSlotId" },
      { path: "createdBookingId" },
    ]);

    syncService.emit("sessionRequest:confirmed", { request, slot, booking });

    res.json({ message: "Payment confirmed and session created", status: "confirmed", request });
  } catch (err) {
    console.error("syncRequestPayment:", err);
    res.status(500).json({ message: err.message });
  }
};
