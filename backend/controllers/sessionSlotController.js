import SessionSlot from "../models/sessionSlot.js";
import Session from "../models/session.js";
import User from "../models/users.js";
import syncService from "../services/syncService.js";

class SessionSlotController {
  // Create a new session slot
  createSlot = async (req, res) => {
    try {
      const trainerId = req.user._id;
      const {
        title,
        description,
        sessionType,
        mode,
        location,
        meetingType,
        meetingLink,
        meetingAccessControl,
        date,
        startTime,
        endTime,
        duration,
        price,
        maxParticipants,
        requirements,
        equipment,
        tags,
        cancellationPolicy,
        isRecurring,
        recurringPattern,
      } = req.body;

      // Validate trainer
      const trainer = await User.findOne({ _id: trainerId, userType: "trainer" });
      if (!trainer) {
        return res.status(404).json({ message: "Trainer not found" });
      }

      // Parse date properly to avoid timezone issues
      // If date is in YYYY-MM-DD format, create Date at midnight UTC
      let slotDate;
      if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Date string in YYYY-MM-DD format
        const [year, month, day] = date.split('-').map(Number);
        slotDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      } else {
        slotDate = new Date(date);
      }

      // Check for conflicts with existing slots
      const startOfDay = new Date(slotDate);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(slotDate);
      endOfDay.setUTCHours(23, 59, 59, 999);

      const conflictingSlot = await SessionSlot.findOne({
        trainerId,
        date: { $gte: startOfDay, $lte: endOfDay },
        status: { $in: ["available", "full"] },
        isActive: true,
        $or: [
          { startTime: { $lt: endTime }, endTime: { $gt: startTime } },
        ],
      });

      if (conflictingSlot) {
        return res.status(409).json({ 
          message: "Time slot conflicts with an existing session" 
        });
      }

      // Create slot
      const slot = await SessionSlot.create({
        trainerId,
        title,
        description,
        sessionType,
        mode,
        location,
        meetingType,
        meetingLink,
        meetingAccessControl,
        date: slotDate,
        startTime,
        endTime,
        duration,
        price,
        maxParticipants: maxParticipants || 1,
        requirements,
        equipment,
        tags,
        cancellationPolicy,
        isRecurring,
        recurringPattern,
      });

      await slot.populate("trainerId", "name email trainerProfile");

      res.status(201).json({
        message: "Session slot created successfully",
        slot,
      });

      // Emit sync event
      syncService.emit('slot:created', { slot });
    } catch (error) {
      console.error("Create slot error:", error);
      res.status(500).json({ message: error.message });
    }
  };

  // Get all slots (with filters)
  getAllSlots = async (req, res) => {
    try {
      const {
        trainerId,
        sessionType,
        mode,
        status,
        date,
        startDate,
        endDate,
        page = 1,
        limit = 20,
      } = req.query;

      let query = { isActive: true };

      if (trainerId) query.trainerId = trainerId;
      if (sessionType) query.sessionType = sessionType;
      if (mode) query.mode = mode;
      if (status) query.status = status;

      if (date) {
        // Parse date string properly to avoid timezone issues
        let requestedDate;
        if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [year, month, day] = date.split('-').map(Number);
          requestedDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
        } else {
          requestedDate = new Date(date);
        }
        
        const startOfDay = new Date(requestedDate);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(requestedDate);
        endOfDay.setUTCHours(23, 59, 59, 999);
        query.date = { $gte: startOfDay, $lte: endOfDay };
      } else if (startDate && endDate) {
        query.date = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      } else {
        // Default: only show future slots
        query.date = { $gte: new Date() };
      }

      const slots = await SessionSlot.find(query)
        .populate("trainerId", "name email trainerProfile")
        .sort({ date: 1, startTime: 1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

      const total = await SessionSlot.countDocuments(query);

      res.json({
        slots,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      });
    } catch (error) {
      console.error("Get slots error:", error);
      res.status(500).json({ message: error.message });
    }
  };

  // Get trainer's slots
  getTrainerSlots = async (req, res) => {
    try {
      const trainerId = req.user._id;
      const { status, date, page = 1, limit = 20 } = req.query;

      let query = { trainerId, isActive: true };

      if (status) query.status = status;

      if (date) {
        // Parse date string properly to avoid timezone issues
        let requestedDate;
        if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [year, month, day] = date.split('-').map(Number);
          requestedDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
        } else {
          requestedDate = new Date(date);
        }
        
        const startOfDay = new Date(requestedDate);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(requestedDate);
        endOfDay.setUTCHours(23, 59, 59, 999);
        query.date = { $gte: startOfDay, $lte: endOfDay };
      }

      const slots = await SessionSlot.find(query)
        .populate("bookedBy.userId", "name email")
        .sort({ date: 1, startTime: 1 })
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit));

      const total = await SessionSlot.countDocuments(query);

      res.json({
        slots,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      });
    } catch (error) {
      console.error("Get trainer slots error:", error);
      res.status(500).json({ message: error.message });
    }
  };

  // Get slot by ID
  getSlotById = async (req, res) => {
    try {
      const { slotId } = req.params;

      const slot = await SessionSlot.findById(slotId)
        .populate("trainerId", "name email trainerProfile")
        .populate("bookedBy.userId", "name email");

      if (!slot) {
        return res.status(404).json({ message: "Slot not found" });
      }

      res.json(slot);
    } catch (error) {
      console.error("Get slot error:", error);
      res.status(500).json({ message: error.message });
    }
  };

  // Update slot
  updateSlot = async (req, res) => {
    try {
      const { slotId } = req.params;
      const trainerId = req.user._id;
      const updates = req.body;

      const slot = await SessionSlot.findOne({ _id: slotId, trainerId });

      if (!slot) {
        return res.status(404).json({ message: "Slot not found" });
      }

      // Don't allow updates if slot has bookings
      if (slot.currentParticipants > 0 && (updates.date || updates.startTime || updates.endTime)) {
        return res.status(400).json({ 
          message: "Cannot change date/time for slots with existing bookings" 
        });
      }

      // Check for conflicts if date/time is being changed
      if (updates.date || updates.startTime || updates.endTime) {
        const slotDate = new Date(updates.date || slot.date);
        const startOfDay = new Date(slotDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(slotDate);
        endOfDay.setHours(23, 59, 59, 999);

        const conflictingSlot = await SessionSlot.findOne({
          _id: { $ne: slotId },
          trainerId,
          date: { $gte: startOfDay, $lte: endOfDay },
          status: { $in: ["available", "full"] },
          isActive: true,
          $or: [
            { 
              startTime: { $lt: updates.endTime || slot.endTime }, 
              endTime: { $gt: updates.startTime || slot.startTime } 
            },
          ],
        });

        if (conflictingSlot) {
          return res.status(409).json({ 
            message: "Time slot conflicts with an existing session" 
          });
        }
      }

      // Update slot
      Object.keys(updates).forEach((key) => {
        if (updates[key] !== undefined) {
          slot[key] = updates[key];
        }
      });

      await slot.save();
      await slot.populate("trainerId", "name email trainerProfile");

      res.json({
        message: "Slot updated successfully",
        slot,
      });

      // Emit sync event
      syncService.emit('slot:updated', { slotId, updates: req.body });
    } catch (error) {
      console.error("Update slot error:", error);
      res.status(500).json({ message: error.message });
    }
  };

  // Cancel slot
  cancelSlot = async (req, res) => {
    try {
      const { slotId } = req.params;
      const trainerId = req.user._id;
      const { reason, notifyParticipants = true } = req.body;

      const slot = await SessionSlot.findOne({ _id: slotId, trainerId });

      if (!slot) {
        return res.status(404).json({ message: "Slot not found" });
      }

      // Cancel all bookings for this slot
      if (slot.currentParticipants > 0) {
        const bookingIds = slot.bookedBy.map((b) => b.bookingId);
        
        await Session.updateMany(
          { _id: { $in: bookingIds } },
          {
            status: "cancelled",
            cancellationReason: reason || "Trainer cancelled the session slot",
            cancelledBy: trainerId,
            cancelledAt: new Date(),
          }
        );
      }

      slot.status = "cancelled";
      slot.isActive = false;
      await slot.save();

      res.json({
        message: "Slot cancelled successfully",
        affectedBookings: slot.currentParticipants,
      });

      // Emit sync event
      syncService.emit('slot:cancelled', { slotId, reason });
    } catch (error) {
      console.error("Cancel slot error:", error);
      res.status(500).json({ message: error.message });
    }
  };

  // Delete slot (soft delete)
  deleteSlot = async (req, res) => {
    try {
      const { slotId } = req.params;
      const trainerId = req.user._id;

      const slot = await SessionSlot.findOne({ _id: slotId, trainerId });

      if (!slot) {
        return res.status(404).json({ message: "Slot not found" });
      }

      // Don't allow deletion if slot has bookings
      if (slot.currentParticipants > 0) {
        return res.status(400).json({ 
          message: "Cannot delete slot with existing bookings. Cancel the slot instead." 
        });
      }

      slot.isActive = false;
      await slot.save();

      res.json({ message: "Slot deleted successfully" });
    } catch (error) {
      console.error("Delete slot error:", error);
      res.status(500).json({ message: error.message });
    }
  };

  // Book a slot
  bookSlot = async (req, res) => {
    try {
      const { slotId } = req.params;
      const userId = req.user._id;
      const { notes } = req.body;

      const slot = await SessionSlot.findById(slotId).populate("trainerId");

      if (!slot) {
        return res.status(404).json({ message: "Slot not found" });
      }

      if (!slot.hasAvailability()) {
        return res.status(400).json({ message: "Slot is full" });
      }

      if (slot.status !== "available") {
        return res.status(400).json({ message: "Slot is not available" });
      }

      if (!slot.isActive) {
        return res.status(400).json({ message: "Slot is no longer active" });
      }

      // Check if slot date is in the past
      const slotDateTime = new Date(slot.date);
      const [hours, minutes] = slot.startTime.split(':');
      slotDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      if (slotDateTime < new Date()) {
        return res.status(400).json({ message: "Cannot book a slot in the past" });
      }

      // Check if user already booked this slot
      const alreadyBooked = slot.bookedBy.some(
        (booking) => booking.userId.toString() === userId.toString()
      );

      if (alreadyBooked) {
        return res.status(400).json({ message: "You have already booked this slot" });
      }

      // Create booking with pending payment status
      const booking = await Session.create({
        trainerId: slot.trainerId._id,
        clientId: userId,
        sessionType: slot.sessionType,
        scheduledDate: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        duration: slot.duration,
        price: slot.price,
        status: "pending",
        paymentStatus: "pending",
        clientNotes: notes,
      });

      // Add participant to slot
      slot.bookedBy.push({
        userId,
        bookingId: booking._id,
        bookedAt: new Date(),
        hasAccess: true,
      });
      
      slot.currentParticipants += 1;
      
      if (slot.currentParticipants >= slot.maxParticipants) {
        slot.status = 'full';
      }
      
      await slot.save();

      await booking.populate([
        { path: "trainerId", select: "name email trainerProfile" },
        { path: "clientId", select: "name email" },
      ]);

      // Check if Stripe is configured and create payment intent
      const stripe = (await import('../config/stripe.js')).default;
      const Payment = (await import('../models/payment.js')).default;
      
      if (stripe && process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes('your_stripe')) {
        try {
          // Get or create Stripe customer
          const user = await User.findById(userId);
          let customer;
          
          if (user.stripeCustomerId) {
            customer = await stripe.customers.retrieve(user.stripeCustomerId);
          } else {
            customer = await stripe.customers.create({
              email: user.email,
              name: user.name,
              metadata: {
                userId: userId.toString(),
              },
            });
            
            await User.findByIdAndUpdate(userId, {
              stripeCustomerId: customer.id,
            });
          }

          // Create payment intent
          const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(slot.price * 100), // Convert to cents
            currency: 'usd',
            customer: customer.id,
            metadata: {
              userId: userId.toString(),
              sessionId: booking._id.toString(),
              trainerId: slot.trainerId._id.toString(),
              slotId: slot._id.toString(),
              type: 'session',
            },
            description: `${slot.title} with ${slot.trainerId.name}`,
            automatic_payment_methods: {
              enabled: true,
            },
          });

          // Save payment record
          const payment = await Payment.create({
            userId,
            trainerId: slot.trainerId._id,
            sessionId: booking._id,
            stripePaymentIntentId: paymentIntent.id,
            stripeCustomerId: customer.id,
            amount: Math.round(slot.price * 100),
            paymentType: 'session',
            description: `${slot.title} with ${slot.trainerId.name}`,
            metadata: {
              sessionDate: slot.date,
              sessionDuration: slot.duration,
              slotId: slot._id.toString(),
            },
          });

          // Update booking with payment ID
          booking.paymentId = payment._id;
          await booking.save();

          res.status(201).json({
            message: "Booking created successfully. Please complete payment to confirm.",
            booking,
            requiresPayment: true,
            payment: {
              clientSecret: paymentIntent.client_secret,
              paymentIntentId: paymentIntent.id,
              paymentId: payment._id,
              amount: slot.price,
            },
            slot: {
              _id: slot._id,
              currentParticipants: slot.currentParticipants,
              maxParticipants: slot.maxParticipants,
              status: slot.status,
            },
          });
        } catch (stripeError) {
          console.error('Stripe payment intent creation failed:', stripeError);
          // If Stripe fails, still return booking but without payment
          res.status(201).json({
            message: "Booking created successfully (payment system unavailable)",
            booking,
            requiresPayment: false,
            slot: {
              _id: slot._id,
              currentParticipants: slot.currentParticipants,
              maxParticipants: slot.maxParticipants,
              status: slot.status,
            },
          });
        }
      } else {
        // Stripe not configured
        res.status(201).json({
          message: "Booking created successfully (payment not configured)",
          booking,
          requiresPayment: false,
          slot: {
            _id: slot._id,
            currentParticipants: slot.currentParticipants,
            maxParticipants: slot.maxParticipants,
            status: slot.status,
          },
        });
      }

      // Emit sync event
      syncService.emit('booking:created', { booking });
    } catch (error) {
      console.error("Book slot error:", error);
      res.status(500).json({ message: error.message });
    }
  };

  // Get slot statistics
  getSlotStatistics = async (req, res) => {
    try {
      const trainerId = req.user._id;
      const { startDate, endDate } = req.query;

      let dateFilter = { trainerId, isActive: true };
      if (startDate && endDate) {
        dateFilter.date = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }

      const stats = await SessionSlot.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            totalRevenue: { 
              $sum: { $multiply: ["$price", "$currentParticipants"] } 
            },
            totalParticipants: { $sum: "$currentParticipants" },
          },
        },
      ]);

      const totalSlots = await SessionSlot.countDocuments({ trainerId, isActive: true });
      const availableSlots = await SessionSlot.countDocuments({
        trainerId,
        status: "available",
        date: { $gte: new Date() },
        isActive: true,
      });

      res.json({
        stats,
        totalSlots,
        availableSlots,
      });
    } catch (error) {
      console.error("Get slot statistics error:", error);
      res.status(500).json({ message: error.message });
    }
  };

  // Duplicate slot (for creating similar slots)
  duplicateSlot = async (req, res) => {
    try {
      const { slotId } = req.params;
      const trainerId = req.user._id;
      const { date, startTime, endTime } = req.body;

      const originalSlot = await SessionSlot.findOne({ _id: slotId, trainerId });

      if (!originalSlot) {
        return res.status(404).json({ message: "Slot not found" });
      }

      // Create new slot with same details but different date/time
      const newSlot = await SessionSlot.create({
        trainerId: originalSlot.trainerId,
        title: originalSlot.title,
        description: originalSlot.description,
        sessionType: originalSlot.sessionType,
        mode: originalSlot.mode,
        location: originalSlot.location,
        meetingType: originalSlot.meetingType,
        meetingLink: originalSlot.meetingLink,
        meetingAccessControl: originalSlot.meetingAccessControl,
        date: new Date(date),
        startTime: startTime || originalSlot.startTime,
        endTime: endTime || originalSlot.endTime,
        duration: originalSlot.duration,
        price: originalSlot.price,
        maxParticipants: originalSlot.maxParticipants,
        requirements: originalSlot.requirements,
        equipment: originalSlot.equipment,
        tags: originalSlot.tags,
        cancellationPolicy: originalSlot.cancellationPolicy,
      });

      await newSlot.populate("trainerId", "name email trainerProfile");

      res.status(201).json({
        message: "Slot duplicated successfully",
        slot: newSlot,
      });
    } catch (error) {
      console.error("Duplicate slot error:", error);
      res.status(500).json({ message: error.message });
    }
  };

  // Get meeting info for a slot (only for participants and trainer)
  getMeetingInfo = async (req, res) => {
    try {
      const { slotId } = req.params;
      const userId = req.user._id;

      const slot = await SessionSlot.findById(slotId);

      if (!slot) {
        return res.status(404).json({ message: "Slot not found" });
      }

      // Check if user is trainer or has booked the slot
      const isTrainer = slot.trainerId.toString() === userId.toString();
      const hasBooked = slot.bookedBy.some(
        (booking) => booking.userId.toString() === userId.toString() && booking.hasAccess
      );

      if (!isTrainer && !hasBooked) {
        return res.status(403).json({ 
          message: "You don't have access to this meeting" 
        });
      }

      // Check if meeting is available yet (based on early join settings)
      const now = new Date();
      const sessionDateTime = new Date(slot.date);
      const [hours, minutes] = slot.startTime.split(':');
      sessionDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const earlyJoinTime = new Date(sessionDateTime);
      if (slot.meetingAccessControl?.allowEarlyJoin) {
        earlyJoinTime.setMinutes(
          earlyJoinTime.getMinutes() - (slot.meetingAccessControl.earlyJoinMinutes || 10)
        );
      }

      if (now < earlyJoinTime) {
        return res.status(403).json({ 
          message: "Meeting is not available yet",
          availableAt: earlyJoinTime,
        });
      }

      const meetingInfo = slot.getMeetingInfo(userId);

      if (!meetingInfo) {
        return res.status(404).json({ message: "No meeting configured for this slot" });
      }

      res.json({
        meetingInfo,
        slotDetails: {
          title: slot.title,
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          duration: slot.duration,
        },
      });
    } catch (error) {
      console.error("Get meeting info error:", error);
      res.status(500).json({ message: error.message });
    }
  };

  // Generate new video call room for a slot
  regenerateVideoCallRoom = async (req, res) => {
    try {
      const { slotId } = req.params;
      const trainerId = req.user._id;

      const slot = await SessionSlot.findOne({ _id: slotId, trainerId });

      if (!slot) {
        return res.status(404).json({ message: "Slot not found" });
      }

      if (slot.meetingType !== 'builtin') {
        return res.status(400).json({ 
          message: "Can only regenerate room for built-in video calls" 
        });
      }

      const roomInfo = slot.generateVideoCallRoom();
      await slot.save();

      res.json({
        message: "Video call room regenerated successfully",
        roomInfo,
      });
    } catch (error) {
      console.error("Regenerate video call room error:", error);
      res.status(500).json({ message: error.message });
    }
  };
}

export default new SessionSlotController();
