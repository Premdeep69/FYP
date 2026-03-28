import SessionSlot from "../models/sessionSlot.js";
import Session from "../models/session.js";
import User from "../models/users.js";

/**
 * Middleware to sync trainer profile changes with session slots
 * This ensures that any changes to trainer profile automatically update related session slots
 */
export const syncTrainerProfileChanges = async (req, res, next) => {
  try {
    const trainerId = req.user._id;
    const updates = req.body;

    // Store original data for comparison
    req.originalTrainerData = await User.findById(trainerId).select('trainerProfile');

    // Continue to the route handler
    next();
  } catch (error) {
    console.error('Sync middleware error:', error);
    next(error);
  }
};

/**
 * Post-processing middleware to update session slots after trainer profile changes
 */
export const postSyncTrainerProfile = async (req, res, originalJson) => {
  try {
    const trainerId = req.user._id;
    const updates = req.body;

    // Update future session slots if pricing changed
    if (updates.sessionTypes || updates.hourlyRate) {
      const futureSlots = await SessionSlot.find({
        trainerId,
        date: { $gte: new Date() },
        status: { $in: ['available', 'full'] },
        isActive: true,
      });

      for (const slot of futureSlots) {
        // Update pricing based on session type
        if (updates.sessionTypes) {
          const sessionTypeConfig = updates.sessionTypes.find(
            st => st.type === slot.sessionType
          );
          if (sessionTypeConfig && sessionTypeConfig.price) {
            slot.price = sessionTypeConfig.price;
            await slot.save();
          }
        } else if (updates.hourlyRate) {
          // Update hourly rate if no specific session type pricing
          slot.price = updates.hourlyRate;
          await slot.save();
        }
      }

      console.log(`✓ Synced pricing for ${futureSlots.length} future session slots`);
    }

    // Update availability-based slots if availability changed
    if (updates.availability) {
      // This is handled by the booking system checking real-time availability
      console.log('✓ Availability updated - booking system will reflect changes');
    }

    return originalJson;
  } catch (error) {
    console.error('Post-sync error:', error);
    return originalJson;
  }
};

/**
 * Middleware to sync session slot changes with bookings
 */
export const syncSessionSlotChanges = async (req, res, next) => {
  try {
    const { slotId } = req.params;
    
    if (slotId) {
      // Store original slot data for comparison
      req.originalSlotData = await SessionSlot.findById(slotId);
    }

    next();
  } catch (error) {
    console.error('Slot sync middleware error:', error);
    next(error);
  }
};

/**
 * Post-processing middleware to update bookings after slot changes
 */
export const postSyncSessionSlot = async (req, res, originalJson) => {
  try {
    const { slotId } = req.params;
    const updates = req.body;

    if (!slotId || !req.originalSlotData) {
      return originalJson;
    }

    const slot = await SessionSlot.findById(slotId);
    
    if (!slot) {
      return originalJson;
    }

    // If slot was cancelled, update all related bookings
    if (updates.status === 'cancelled' || !slot.isActive) {
      const bookingIds = slot.bookedBy.map(b => b.bookingId);
      
      await Session.updateMany(
        { _id: { $in: bookingIds }, status: { $in: ['pending', 'confirmed'] } },
        {
          status: 'cancelled',
          cancellationReason: 'Session slot was cancelled by trainer',
          cancelledAt: new Date(),
        }
      );

      console.log(`✓ Cancelled ${bookingIds.length} bookings due to slot cancellation`);
    }

    // If time or date changed, notify affected bookings
    if (updates.date || updates.startTime || updates.endTime) {
      const bookingIds = slot.bookedBy.map(b => b.bookingId);
      
      await Session.updateMany(
        { _id: { $in: bookingIds } },
        {
          scheduledDate: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          // Add a flag to indicate schedule change
          $set: { 'metadata.scheduleChanged': true }
        }
      );

      console.log(`✓ Updated schedule for ${bookingIds.length} bookings`);
    }

    return originalJson;
  } catch (error) {
    console.error('Post-sync slot error:', error);
    return originalJson;
  }
};

/**
 * Middleware to sync booking changes with session slots
 */
export const syncBookingChanges = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    
    if (bookingId) {
      // Store original booking data
      req.originalBookingData = await Session.findById(bookingId);
    }

    next();
  } catch (error) {
    console.error('Booking sync middleware error:', error);
    next(error);
  }
};

/**
 * Post-processing middleware to update slots after booking changes
 */
export const postSyncBooking = async (req, res, originalJson) => {
  try {
    const { bookingId } = req.params;
    const updates = req.body;

    if (!bookingId || !req.originalBookingData) {
      return originalJson;
    }

    const booking = await Session.findById(bookingId);
    
    if (!booking) {
      return originalJson;
    }

    // If booking was cancelled, update slot availability
    if (updates.status === 'cancelled' && req.originalBookingData.status !== 'cancelled') {
      // Find related session slot
      const slot = await SessionSlot.findOne({
        'bookedBy.bookingId': bookingId
      });

      if (slot) {
        // Remove booking from slot
        slot.bookedBy = slot.bookedBy.filter(
          b => b.bookingId.toString() !== bookingId.toString()
        );
        slot.currentParticipants = Math.max(0, slot.currentParticipants - 1);
        
        // Update slot status if it was full
        if (slot.status === 'full' && slot.currentParticipants < slot.maxParticipants) {
          slot.status = 'available';
        }

        await slot.save();
        console.log(`✓ Updated slot availability after booking cancellation`);
      }
    }

    return originalJson;
  } catch (error) {
    console.error('Post-sync booking error:', error);
    return originalJson;
  }
};

/**
 * Helper function to wrap response.json() with post-processing
 */
export const wrapResponseJson = (res, postProcessor) => {
  const originalJson = res.json.bind(res);
  
  res.json = async function(data) {
    if (postProcessor) {
      data = await postProcessor(res.req, res, data);
    }
    return originalJson(data);
  };
};
