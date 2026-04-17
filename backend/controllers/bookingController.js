import Session from "../models/session.js";
import User from "../models/users.js";
import Payment from "../models/payment.js";
import stripe from "../config/stripe.js";
import syncService from "../services/syncService.js";

class BookingController {
  // Get all trainers with their profiles
  getAllTrainers = async (req, res) => {
    try {
      const { specialization, minRating, maxPrice, search } = req.query;

      let query = { userType: "trainer", isActive: true };

      // Apply filters
      if (specialization) {
        query["trainerProfile.specializations"] = specialization;
      }

      if (minRating) {
        query["trainerProfile.rating.average"] = { $gte: parseFloat(minRating) };
      }

      if (maxPrice) {
        query["trainerProfile.hourlyRate"] = { $lte: parseFloat(maxPrice) };
      }

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: "i" } },
          { "trainerProfile.specializations": { $regex: search, $options: "i" } },
        ];
      }

      const trainers = await User.find(query)
        .select("name email trainerProfile createdAt")
        .sort({ "trainerProfile.rating.average": -1 });

      res.json(trainers);
    } catch (error) {
      console.error("Get trainers error:", error);
      res.status(500).json({ message: error.message });
    }
  };

  // Get trainer details by ID
  getTrainerById = async (req, res) => {
    try {
      const { trainerId } = req.params;

      const trainer = await User.findOne({
        _id: trainerId,
        userType: "trainer",
        isActive: true,
      }).select("name email trainerProfile createdAt");

      if (!trainer) {
        return res.status(404).json({ message: "Trainer not found" });
      }

      // Get trainer's completed sessions count and recent reviews
      const completedSessions = await Session.countDocuments({
        trainerId,
        status: "completed",
      });

      const recentReviews = await Session.find({
        trainerId,
        status: "completed",
        "feedback.rating": { $exists: true, $gt: 0 },
      })
        .populate("clientId", "name")
        .select("feedback clientId createdAt")
        .sort({ "feedback.createdAt": -1 })
        .limit(10);

      res.json({
        trainer,
        completedSessions,
        recentReviews,
      });
    } catch (error) {
      console.error("Get trainer error:", error);
      res.status(500).json({ message: error.message });
    }
  };

  // Get available time slots for a trainer
  getAvailableSlots = async (req, res) => {
    try {
      const { trainerId } = req.params;
      const { date, duration = 60 } = req.query;

      if (!date) {
        return res.status(400).json({ message: "Date is required" });
      }

      const trainer = await User.findById(trainerId);
      if (!trainer || trainer.userType !== "trainer") {
        return res.status(404).json({ message: "Trainer not found" });
      }

      const requestedDate = new Date(date);
      const dayName = requestedDate.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();

      // Get trainer's availability for the day
      const dayAvailability = trainer.trainerProfile.availability.find(
        (avail) => avail.day === dayName && avail.isAvailable
      );

      if (!dayAvailability) {
        return res.json({ availableSlots: [] });
      }

      // Get existing bookings for the date
      const startOfDay = new Date(requestedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(requestedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const existingBookings = await Session.find({
        trainerId,
        scheduledDate: { $gte: startOfDay, $lte: endOfDay },
        status: { $in: ["pending", "confirmed"] },
      }).select("startTime endTime");

      // Check blocked slots
      const blockedSlots = trainer.trainerProfile.blockedSlots.filter(
        (slot) => new Date(slot.date).toDateString() === requestedDate.toDateString()
      );

      // Generate available time slots
      const slots = this.generateTimeSlots(
        dayAvailability.startTime,
        dayAvailability.endTime,
        parseInt(duration),
        existingBookings,
        blockedSlots
      );

      res.json({ availableSlots: slots });
    } catch (error) {
      console.error("Get available slots error:", error);
      res.status(500).json({ message: error.message });
    }
  };

  // Helper function to generate time slots
  generateTimeSlots = (startTime, endTime, duration, existingBookings, blockedSlots) => {
    const slots = [];
    const [startHour, startMinute] = startTime.split(":").map(Number);
    const [endHour, endMinute] = endTime.split(":").map(Number);

    let currentMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    while (currentMinutes + duration <= endMinutes) {
      const slotStartTime = this.minutesToTime(currentMinutes);
      const slotEndTime = this.minutesToTime(currentMinutes + duration);

      // Check if slot conflicts with existing bookings
      const hasConflict = existingBookings.some((booking) => {
        return this.timeSlotsOverlap(slotStartTime, slotEndTime, booking.startTime, booking.endTime);
      });

      // Check if slot is blocked
      const isBlocked = blockedSlots.some((blocked) => {
        return this.timeSlotsOverlap(slotStartTime, slotEndTime, blocked.startTime, blocked.endTime);
      });

      if (!hasConflict && !isBlocked) {
        slots.push({
          startTime: slotStartTime,
          endTime: slotEndTime,
          available: true,
        });
      }

      currentMinutes += 30; // 30-minute intervals
    }

    return slots;
  };

  minutesToTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
  };

  timeSlotsOverlap = (start1, end1, start2, end2) => {
    return start1 < end2 && end1 > start2;
  };

  // Create a booking with payment intent
  createBooking = async (req, res) => {
    try {
      const clientId = req.user._id;

      // Only users (not trainers/admins) can create bookings
      if (req.user.userType !== 'user') {
        return res.status(403).json({ message: "Only users can book sessions" });
      }

      const { trainerId, sessionType, scheduledDate, startTime, duration, notes } = req.body;

      // Validate trainer
      const trainer = await User.findOne({ _id: trainerId, userType: "trainer" });
      if (!trainer) {
        return res.status(404).json({ message: "Trainer not found" });
      }

      // Calculate end time
      const [hours, minutes] = startTime.split(":").map(Number);
      const totalMinutes = hours * 60 + minutes + parseInt(duration);
      const endTime = this.minutesToTime(totalMinutes);

      // Check if slot is still available
      const date = new Date(scheduledDate);
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Atomic conflict check + insert: use findOneAndUpdate with upsert on a
      // lock document to prevent race conditions between concurrent requests
      const conflictingBooking = await Session.findOne({
        trainerId,
        scheduledDate: { $gte: startOfDay, $lte: endOfDay },
        status: { $in: ["pending", "confirmed"] },
        $or: [
          { startTime: { $lt: endTime }, endTime: { $gt: startTime } },
        ],
      });

      if (conflictingBooking) {
        return res.status(409).json({ message: "Time slot is no longer available" });
      }

      // Get pricing
      const sessionTypeConfig = trainer.trainerProfile.sessionTypes.find(
        (st) => st.type === sessionType
      );
      const price = sessionTypeConfig ? sessionTypeConfig.price : trainer.trainerProfile.hourlyRate;

      // Create booking with pending payment status
      const booking = await Session.create({
        trainerId,
        clientId,
        sessionType,
        scheduledDate: date,
        startTime,
        endTime,
        duration: parseInt(duration),
        price,
        status: "pending",
        paymentStatus: "pending",
        clientNotes: notes,
      });

      // Validate Stripe configuration
      if (!stripe || !process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('your_stripe')) {
        // If Stripe is not configured, just return the booking
        await booking.populate([
          { path: "trainerId", select: "name email trainerProfile" },
          { path: "clientId", select: "name email" },
        ]);

        return res.status(201).json({
          message: "Booking created successfully (payment not configured)",
          booking,
          requiresPayment: false,
        });
      }

      // Get or create Stripe customer
      const user = await User.findById(clientId);
      let customer;
      
      if (user.stripeCustomerId) {
        customer = await stripe.customers.retrieve(user.stripeCustomerId);
      } else {
        customer = await stripe.customers.create({
          email: user.email,
          name: user.name,
          metadata: {
            userId: clientId.toString(),
          },
        });
        
        await User.findByIdAndUpdate(clientId, {
          stripeCustomerId: customer.id,
        });
      }

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(price * 100), // Convert to cents
        currency: 'usd',
        customer: customer.id,
        metadata: {
          userId: clientId.toString(),
          sessionId: booking._id.toString(),
          trainerId: trainerId.toString(),
          type: 'session',
        },
        description: `Training session with ${trainer.name}`,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      // Save payment record
      const payment = await Payment.create({
        userId: clientId,
        trainerId,
        sessionId: booking._id,
        stripePaymentIntentId: paymentIntent.id,
        stripeCustomerId: customer.id,
        amount: Math.round(price * 100),
        paymentType: 'session',
        description: `Training session with ${trainer.name}`,
        metadata: {
          sessionDate: date,
          sessionDuration: parseInt(duration),
        },
      });

      // Update booking with payment ID
      booking.paymentId = payment._id;
      await booking.save();

      await booking.populate([
        { path: "trainerId", select: "name email trainerProfile" },
        { path: "clientId", select: "name email" },
      ]);

      res.status(201).json({
        message: "Booking created successfully. Please complete payment to confirm.",
        booking,
        requiresPayment: true,
        payment: {
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          paymentId: payment._id,
          amount: price,
        },
      });

      // Emit sync event
      syncService.emit('booking:created', { booking });
    } catch (error) {
      console.error("Create booking error:", error);
      res.status(500).json({ message: error.message });
    }
  };

  // Get user's bookings
  getUserBookings = async (req, res) => {
    try {
      const userId = req.user._id;
      const { status, page = 1, limit = 10 } = req.query;

      let query = { clientId: userId };
      if (status) {
        query.status = status;
      }

      const bookings = await Session.find(query)
        .populate("trainerId", "name email trainerProfile")
        .populate("slotId", "_id")
        .sort({ scheduledDate: -1, startTime: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

      const total = await Session.countDocuments(query);

      res.json({
        bookings,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      });
    } catch (error) {
      console.error("Get user bookings error:", error);
      res.status(500).json({ message: error.message });
    }
  };

  // Get trainer's bookings
  getTrainerBookings = async (req, res) => {
    try {
      const trainerId = req.user._id;
      const { status, date, page = 1, limit = 10 } = req.query;

      let query = { trainerId };
      if (status) {
        query.status = status;
      }

      if (date) {
        const requestedDate = new Date(date);
        const startOfDay = new Date(requestedDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(requestedDate);
        endOfDay.setHours(23, 59, 59, 999);
        query.scheduledDate = { $gte: startOfDay, $lte: endOfDay };
      }

      const bookings = await Session.find(query)
        .populate("clientId", "name email profile")
        .sort({ scheduledDate: -1, startTime: -1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

      const total = await Session.countDocuments(query);

      res.json({
        bookings,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      });
    } catch (error) {
      console.error("Get trainer bookings error:", error);
      res.status(500).json({ message: error.message });
    }
  };

  // Update booking status (confirm, complete, cancel)
  updateBookingStatus = async (req, res) => {
    try {
      const { bookingId } = req.params;
      const { status, reason, trainerNotes } = req.body;
      const userId = req.user._id;

      const booking = await Session.findById(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Check authorization
      const isTrainer = booking.trainerId.toString() === userId.toString();
      const isClient = booking.clientId.toString() === userId.toString();

      if (!isTrainer && !isClient) {
        return res.status(403).json({ message: "Not authorized" });
      }

      // Validate status transitions
      const validTransitions = {
        pending: ["confirmed", "cancelled"],
        confirmed: ["completed", "cancelled", "no-show"],
        completed: [],
        cancelled: [],
        "no-show": [],
      };

      if (!validTransitions[booking.status].includes(status)) {
        return res.status(400).json({ message: "Invalid status transition" });
      }

      // Update booking
      booking.status = status;
      if (trainerNotes) booking.trainerNotes = trainerNotes;

      if (status === "cancelled") {
        booking.cancellationReason = reason;
        booking.cancelledBy = userId;
        booking.cancelledAt = new Date();
      }

      if (status === "completed") {
        // Update trainer stats
        await User.findByIdAndUpdate(booking.trainerId, {
          $inc: {
            "trainerProfile.completedSessions": 1,
            "trainerProfile.totalSessions": 1,
          },
        });
      }

      await booking.save();
      await booking.populate([
        { path: "trainerId", select: "name email trainerProfile" },
        { path: "clientId", select: "name email" },
      ]);

      res.json({
        message: "Booking updated successfully",
        booking,
      });
    } catch (error) {
      console.error("Update booking status error:", error);
      res.status(500).json({ message: error.message });
    }
  };

  // Add feedback to completed session
  addFeedback = async (req, res) => {
    try {
      const { bookingId } = req.params;
      const { rating, comment } = req.body;
      const userId = req.user._id;

      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Rating must be between 1 and 5" });
      }

      const booking = await Session.findById(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Only the client can add feedback
      if (booking.clientId.toString() !== userId.toString()) {
        return res.status(403).json({ message: "Not authorized" });
      }

      if (booking.status !== "completed") {
        return res.status(400).json({ message: "Can only rate completed sessions" });
      }

      if (booking.feedback?.rating) {
        return res.status(400).json({ message: "You have already reviewed this session" });
      }

      // Save feedback on the booking
      booking.feedback = { rating, comment: comment?.trim() || "", createdAt: new Date() };
      await booking.save();

      // Recompute trainer rating from ALL rated completed sessions
      const ratedSessions = await Session.find({
        trainerId: booking.trainerId,
        status: "completed",
        "feedback.rating": { $exists: true, $gt: 0 },
      }).select("feedback.rating");

      const totalCount = ratedSessions.length;
      const totalSum = ratedSessions.reduce((s, sess) => s + (sess.feedback?.rating || 0), 0);
      const newAverage = totalCount > 0
        ? Math.round((totalSum / totalCount) * 10) / 10
        : 0;

      await User.findByIdAndUpdate(booking.trainerId, {
        "trainerProfile.rating.average": newAverage,
        "trainerProfile.rating.count": totalCount,
      });

      await booking.populate([
        { path: "trainerId", select: "name email trainerProfile" },
        { path: "clientId", select: "name email" },
      ]);

      res.json({
        message: "Feedback added successfully",
        booking,
        trainerRating: { average: newAverage, count: totalCount },
      });
    } catch (error) {
      console.error("Add feedback error:", error);
      res.status(500).json({ message: error.message });
    }
  };

  // Update trainer availability
  updateAvailability = async (req, res) => {
    try {
      console.log('=== Update Availability Request ===');
      console.log('User ID:', req.user?._id);
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      
      const trainerId = req.user._id;
      const { availability } = req.body;

      if (!availability) {
        console.error('No availability data provided');
        return res.status(400).json({ message: "Availability data is required" });
      }

      console.log('Finding trainer:', trainerId);
      const trainer = await User.findById(trainerId);
      
      if (!trainer) {
        console.error('Trainer not found:', trainerId);
        return res.status(404).json({ message: "Trainer not found" });
      }
      
      if (trainer.userType !== "trainer") {
        console.error('User is not a trainer:', trainer.userType);
        return res.status(403).json({ message: "User is not a trainer" });
      }

      console.log('Current availability:', trainer.trainerProfile?.availability);
      console.log('New availability:', availability);
      
      trainer.trainerProfile.availability = availability;
      
      console.log('Saving trainer...');
      await trainer.save();
      console.log('Trainer saved successfully');

      // Emit sync event (wrapped in try-catch to prevent errors)
      try {
        console.log('Emitting sync event...');
        syncService.emit('trainer:profile:updated', {
          trainerId,
          updates: { availability }
        });
        console.log('Sync event emitted');
      } catch (syncError) {
        console.error('Sync event error:', syncError);
        // Continue even if sync fails
      }

      console.log('Sending success response');
      res.json({
        message: "Availability updated successfully",
        availability: trainer.trainerProfile.availability,
      });
    } catch (error) {
      console.error("Update availability error:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({ 
        message: error.message,
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  };

  // Add blocked slot
  addBlockedSlot = async (req, res) => {
    try {
      const trainerId = req.user._id;
      const { date, startTime, endTime, reason } = req.body;

      const trainer = await User.findById(trainerId);
      if (!trainer || trainer.userType !== "trainer") {
        return res.status(404).json({ message: "Trainer not found" });
      }

      trainer.trainerProfile.blockedSlots.push({
        date: new Date(date),
        startTime,
        endTime,
        reason,
      });
      await trainer.save();

      res.json({
        message: "Blocked slot added successfully",
        blockedSlots: trainer.trainerProfile.blockedSlots,
      });
    } catch (error) {
      console.error("Add blocked slot error:", error);
      res.status(500).json({ message: error.message });
    }
  };

  // Update trainer pricing
  updatePricing = async (req, res) => {
    try {
      const trainerId = req.user._id;
      const { sessionTypes, hourlyRate } = req.body;

      const trainer = await User.findById(trainerId);
      if (!trainer || trainer.userType !== "trainer") {
        return res.status(404).json({ message: "Trainer not found" });
      }

      if (sessionTypes) {
        trainer.trainerProfile.sessionTypes = sessionTypes;
      }
      if (hourlyRate !== undefined) {
        trainer.trainerProfile.hourlyRate = hourlyRate;
      }

      await trainer.save();

      // Emit sync event (wrapped in try-catch to prevent errors)
      try {
        syncService.emit('trainer:profile:updated', {
          trainerId,
          updates: { sessionTypes, hourlyRate }
        });
      } catch (syncError) {
        console.error('Sync event error:', syncError);
        // Continue even if sync fails
      }

      res.json({
        message: "Pricing updated successfully",
        sessionTypes: trainer.trainerProfile.sessionTypes,
        hourlyRate: trainer.trainerProfile.hourlyRate,
      });
    } catch (error) {
      console.error("Update pricing error:", error);
      res.status(500).json({ message: error.message });
    }
  };

  // Get payment intent client secret for a pending booking
  getBookingPaymentIntent = async (req, res) => {
    try {
      const { bookingId } = req.params;
      const userId = req.user._id;

      const booking = await Session.findOne({ _id: bookingId, clientId: userId });
      if (!booking) return res.status(404).json({ message: "Booking not found" });

      if (booking.paymentStatus === 'paid') {
        return res.status(400).json({ message: "Booking already paid" });
      }

      // Find the payment record
      const payment = await Payment.findOne({
        sessionId: bookingId,
        userId,
        status: 'pending',
      });

      if (!payment) return res.status(404).json({ message: "Payment record not found" });

      // If we have a stored clientSecret, return it
      if (payment.stripeClientSecret) {
        return res.json({
          clientSecret: payment.stripeClientSecret,
          amount: payment.amount / 100,
          paymentIntentId: payment.stripePaymentIntentId,
        });
      }

      // Otherwise retrieve from Stripe
      const stripeConfigured = stripe &&
        process.env.STRIPE_SECRET_KEY &&
        !process.env.STRIPE_SECRET_KEY.includes('your_stripe');

      if (!stripeConfigured) {
        return res.status(503).json({ message: "Payment system not configured" });
      }

      const pi = await stripe.paymentIntents.retrieve(payment.stripePaymentIntentId);
      if (pi.status === 'succeeded') {
        return res.status(400).json({ message: "Payment already completed" });
      }

      res.json({
        clientSecret: pi.client_secret,
        amount: payment.amount / 100,
        paymentIntentId: pi.id,
      });
    } catch (error) {
      console.error("getBookingPaymentIntent error:", error);
      res.status(500).json({ message: error.message });
    }
  };

  // Get booking statistics for trainer
  getBookingStats = async (req, res) => {
    try {
      const trainerId = req.user._id;
      const { startDate, endDate } = req.query;

      let dateFilter = { trainerId };
      if (startDate && endDate) {
        dateFilter.scheduledDate = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }

      const stats = await Session.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            totalRevenue: { $sum: "$price" },
          },
        },
      ]);

      const totalBookings = await Session.countDocuments({ trainerId });
      const upcomingBookings = await Session.countDocuments({
        trainerId,
        status: { $in: ["pending", "confirmed"] },
        scheduledDate: { $gte: new Date() },
      });

      res.json({
        stats,
        totalBookings,
        upcomingBookings,
      });
    } catch (error) {
      console.error("Get booking stats error:", error);
      res.status(500).json({ message: error.message });
    }
  };

  // Confirm booking payment
  confirmBookingPayment = async (req, res) => {
    try {
      const { bookingId } = req.params;
      const { paymentIntentId } = req.body;
      const userId = req.user._id;

      const booking = await Session.findById(bookingId);
      if (!booking) return res.status(404).json({ message: "Booking not found" });

      if (booking.clientId.toString() !== userId.toString()) {
        return res.status(403).json({ message: "Not authorized" });
      }

      // Idempotency: if already confirmed, return success immediately
      if (booking.status === "confirmed" && booking.paymentStatus === "paid") {
        await booking.populate([
          { path: "trainerId", select: "name email trainerProfile" },
          { path: "clientId", select: "name email" },
        ]);
        return res.json({ message: "Booking already confirmed", booking, invoiceNumber: null });
      }

      // Verify with Stripe if configured
      const stripeConfigured = stripe &&
        process.env.STRIPE_SECRET_KEY &&
        !process.env.STRIPE_SECRET_KEY.includes('your_stripe');

      if (stripeConfigured && paymentIntentId) {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status === 'canceled') {
          booking.status = "cancelled";
          booking.paymentStatus = "failed";
          booking.cancellationReason = "Payment was canceled";
          booking.cancelledBy = userId;
          booking.cancelledAt = new Date();
          await booking.save();
          await Payment.findOneAndUpdate(
            { stripePaymentIntentId: paymentIntentId },
            { status: 'canceled' }
          );
          syncService.emit('booking:cancelled', { bookingId });
          return res.status(400).json({ message: "Payment was canceled. Booking has been cancelled.", booking });
        }

        if (paymentIntent.status !== 'succeeded') {
          return res.status(400).json({
            message: `Payment not completed. Status: ${paymentIntent.status}. Please try again.`,
            status: paymentIntent.status,
          });
        }
      }

      // Confirm booking
      booking.status = "confirmed";
      booking.paymentStatus = "paid";
      await booking.save();

      // Update payment record
      const paymentRecord = await Payment.findOneAndUpdate(
        { stripePaymentIntentId: paymentIntentId },
        { status: 'succeeded' },
        { new: true }
      ).populate('userId', 'name email').populate('trainerId', 'name');

      await booking.populate([
        { path: "trainerId", select: "name email trainerProfile" },
        { path: "clientId", select: "name email" },
      ]);

      // Auto-generate invoice
      let invoiceNumber = null;
      if (paymentRecord && stripeConfigured) {
        try {
          const { generatePaymentReceipt } = await import('../services/invoiceService.js');
          const invoice = await generatePaymentReceipt(paymentRecord);
          invoiceNumber = invoice.filename.replace('invoice-', '').replace('.pdf', '');
          await Payment.findByIdAndUpdate(paymentRecord._id, {
            invoiceUrl: invoice.url,
            invoiceNumber,
            invoiceGeneratedAt: new Date(),
          });
        } catch (invoiceErr) {
          console.error('Invoice generation error (non-fatal):', invoiceErr.message);
        }
      }

      // Notify trainer via socket
      syncService.emit('booking:confirmed', {
        bookingId,
        trainerId: booking.trainerId._id || booking.trainerId,
        clientName: booking.clientId.name,
        sessionDate: booking.scheduledDate,
        sessionType: booking.sessionType,
      });

      res.json({
        message: "Payment confirmed. Booking is now confirmed!",
        booking,
        invoiceNumber,
      });
    } catch (error) {
      console.error("Confirm booking payment error:", error);
      res.status(500).json({ message: error.message });
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Cancel booking — called by USER (client). 70% refund if paid.
  // ─────────────────────────────────────────────────────────────────────────
  cancelBookingWithRefund = async (req, res) => {
    try {
      const { bookingId } = req.params;
      const { reason } = req.body;
      const userId = req.user._id;

      const booking = await Session.findById(bookingId)
        .populate('paymentId')
        .populate('trainerId', 'name email')
        .populate('clientId', 'name email');

      if (!booking) return res.status(404).json({ message: "Booking not found" });

      // Only the client can use this endpoint
      if (booking.clientId._id.toString() !== userId.toString()) {
        return res.status(403).json({ message: "Not authorized" });
      }

      if (!['pending', 'confirmed'].includes(booking.status)) {
        return res.status(400).json({ message: "Cannot cancel this booking" });
      }

      const REFUND_PCT = 70; // user cancellation = 70% refund
      let refundedAmountCents = 0;
      let stripeRefundId = null;
      let refundProcessed = false;

      // ── Process Stripe refund ──────────────────────────────────────────────
      if (booking.paymentStatus === 'paid' && booking.paymentId && stripe) {
        const payment = await Payment.findById(booking.paymentId);

        if (payment && payment.stripePaymentIntentId) {
          refundedAmountCents = Math.round(payment.amount * REFUND_PCT / 100);

          try {
            const refund = await stripe.refunds.create({
              payment_intent: payment.stripePaymentIntentId,
              amount: refundedAmountCents,
              reason: 'requested_by_customer',
              metadata: {
                bookingId: bookingId.toString(),
                cancelledBy: userId.toString(),
                cancelledByRole: 'user',
                refundPercentage: String(REFUND_PCT),
                reason: reason || 'Cancelled by user',
              },
            });

            stripeRefundId = refund.id;
            refundProcessed = true;

            await Payment.findByIdAndUpdate(payment._id, {
              status: 'refunded',
              refundId: refund.id,
              refundAmount: refundedAmountCents,
              refundPercentage: REFUND_PCT,
              refundedAt: new Date(),
              refundReason: reason || 'Cancelled by user',
            });

            booking.paymentStatus = 'refunded';
          } catch (refundError) {
            console.error('Stripe refund error (user cancel):', refundError.message);
            // Continue with cancellation even if Stripe fails
          }
        }
      }

      // ── Update booking ─────────────────────────────────────────────────────
      booking.status = 'cancelled';
      booking.cancellationReason = reason || 'Cancelled by user';
      booking.cancelledBy = userId;
      booking.cancelledByRole = 'user';
      booking.cancelledAt = new Date();
      booking.refundPercentage = refundProcessed ? REFUND_PCT : 0;
      await booking.save();

      // ── Notify both parties ────────────────────────────────────────────────
      const refundAmountDollars = (refundedAmountCents / 100).toFixed(2);
      const originalAmountDollars = (booking.price).toFixed(2);
      const retainedDollars = (booking.price - refundedAmountCents / 100).toFixed(2);

      syncService.emit('booking:cancelled', {
        bookingId,
        cancelledByRole: 'user',
        clientName: booking.clientId.name,
        trainerName: booking.trainerId.name,
        refundProcessed,
        refundPercentage: REFUND_PCT,
        refundAmount: refundAmountDollars,
      });

      // Socket notification to trainer
      const trainerId = booking.trainerId._id?.toString() || booking.trainerId.toString();
      syncService.emit('booking:cancelled_notify_trainer', {
        trainerId,
        message: refundProcessed
          ? `${booking.clientId.name} cancelled their booking. A 70% refund ($${refundAmountDollars}) was issued; you retain $${retainedDollars}.`
          : `${booking.clientId.name} cancelled their booking.`,
      });

      res.json({
        message: refundProcessed
          ? `Booking cancelled. A 70% refund of $${refundAmountDollars} has been processed. A 30% cancellation fee of $${retainedDollars} was retained.`
          : 'Booking cancelled successfully.',
        booking,
        refund: refundProcessed ? {
          processed: true,
          percentage: REFUND_PCT,
          refundAmount: refundAmountDollars,
          cancellationFee: retainedDollars,
          stripeRefundId,
        } : { processed: false },
      });
    } catch (error) {
      console.error('Cancel booking (user) error:', error);
      res.status(500).json({ message: error.message });
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Cancel booking — called by TRAINER. 100% full refund if paid.
  // ─────────────────────────────────────────────────────────────────────────
  cancelBookingAsTrainer = async (req, res) => {
    try {
      const { bookingId } = req.params;
      const { reason } = req.body;
      const userId = req.user._id;

      const booking = await Session.findById(bookingId)
        .populate('paymentId')
        .populate('trainerId', 'name email')
        .populate('clientId', 'name email');

      if (!booking) return res.status(404).json({ message: "Booking not found" });

      // Only the trainer of this booking can use this endpoint
      if (booking.trainerId._id.toString() !== userId.toString()) {
        return res.status(403).json({ message: "Not authorized" });
      }

      if (!['pending', 'confirmed'].includes(booking.status)) {
        return res.status(400).json({ message: "Cannot cancel this booking" });
      }

      const REFUND_PCT = 100; // trainer cancellation = full refund
      let refundedAmountCents = 0;
      let stripeRefundId = null;
      let refundProcessed = false;

      // ── Process Stripe full refund ─────────────────────────────────────────
      if (booking.paymentStatus === 'paid' && booking.paymentId && stripe) {
        const payment = await Payment.findById(booking.paymentId);

        if (payment && payment.stripePaymentIntentId) {
          refundedAmountCents = payment.amount; // 100%

          try {
            const refund = await stripe.refunds.create({
              payment_intent: payment.stripePaymentIntentId,
              // no `amount` = full refund
              reason: 'requested_by_customer',
              metadata: {
                bookingId: bookingId.toString(),
                cancelledBy: userId.toString(),
                cancelledByRole: 'trainer',
                refundPercentage: '100',
                reason: reason || 'Cancelled by trainer',
              },
            });

            stripeRefundId = refund.id;
            refundProcessed = true;

            await Payment.findByIdAndUpdate(payment._id, {
              status: 'refunded',
              refundId: refund.id,
              refundAmount: refundedAmountCents,
              refundPercentage: REFUND_PCT,
              refundedAt: new Date(),
              refundReason: reason || 'Cancelled by trainer',
            });

            booking.paymentStatus = 'refunded';
          } catch (refundError) {
            console.error('Stripe refund error (trainer cancel):', refundError.message);
          }
        }
      }

      // ── Update booking ─────────────────────────────────────────────────────
      booking.status = 'cancelled';
      booking.cancellationReason = reason || 'Cancelled by trainer';
      booking.cancelledBy = userId;
      booking.cancelledByRole = 'trainer';
      booking.cancelledAt = new Date();
      booking.refundPercentage = refundProcessed ? REFUND_PCT : 0;
      await booking.save();

      // ── Notify both parties ────────────────────────────────────────────────
      const refundAmountDollars = (refundedAmountCents / 100).toFixed(2);

      syncService.emit('booking:cancelled', {
        bookingId,
        cancelledByRole: 'trainer',
        clientName: booking.clientId.name,
        trainerName: booking.trainerId.name,
        refundProcessed,
        refundPercentage: REFUND_PCT,
        refundAmount: refundAmountDollars,
      });

      // Socket notification to client
      const clientId = booking.clientId._id?.toString() || booking.clientId.toString();
      syncService.emit('booking:cancelled_notify_client', {
        clientId,
        message: refundProcessed
          ? `Your trainer ${booking.trainerId.name} cancelled your session. A full refund of $${refundAmountDollars} has been issued.`
          : `Your trainer ${booking.trainerId.name} cancelled your session.`,
      });

      res.json({
        message: refundProcessed
          ? `Booking cancelled. A full 100% refund of $${refundAmountDollars} has been processed for the client.`
          : 'Booking cancelled successfully.',
        booking,
        refund: refundProcessed ? {
          processed: true,
          percentage: REFUND_PCT,
          refundAmount: refundAmountDollars,
          stripeRefundId,
        } : { processed: false },
      });
    } catch (error) {
      console.error('Cancel booking (trainer) error:', error);
      res.status(500).json({ message: error.message });
    }
  };
}

export default new BookingController();
