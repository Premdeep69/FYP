import { EventEmitter } from 'events';
import SessionSlot from '../models/sessionSlot.js';
import Session from '../models/session.js';
import User from '../models/users.js';

class SyncService extends EventEmitter {
  constructor() {
    super();
    this.setupListeners();
  }

  setupListeners() {
    // Listen for trainer profile updates
    this.on('trainer:profile:updated', this.handleTrainerProfileUpdate.bind(this));
    
    // Listen for session slot updates
    this.on('slot:created', this.handleSlotCreated.bind(this));
    this.on('slot:updated', this.handleSlotUpdated.bind(this));
    this.on('slot:cancelled', this.handleSlotCancelled.bind(this));
    this.on('slot:deleted', this.handleSlotDeleted.bind(this));
    
    // Listen for booking updates
    this.on('booking:created', this.handleBookingCreated.bind(this));
    this.on('booking:confirmed', this.handleBookingConfirmed.bind(this));
    this.on('booking:cancelled', this.handleBookingCancelled.bind(this));
    this.on('booking:completed', this.handleBookingCompleted.bind(this));
  }

  // Trainer Profile Update Handlers
  async handleTrainerProfileUpdate(data) {
    try {
      const { trainerId, updates } = data;
      
      console.log(`🔄 Syncing trainer profile updates for trainer ${trainerId}`);
      
      // Update future session slots if pricing changed
      if (updates.sessionTypes || updates.hourlyRate) {
        await this.syncPricingToSlots(trainerId, updates);
      }
      
      // Update availability-based data
      if (updates.availability) {
        await this.syncAvailabilityToSlots(trainerId, updates);
      }
      
      console.log(`✓ Trainer profile sync completed`);
    } catch (error) {
      console.error('Error handling trainer profile update:', error);
    }
  }

  async syncPricingToSlots(trainerId, updates) {
    const futureSlots = await SessionSlot.find({
      trainerId,
      date: { $gte: new Date() },
      status: { $in: ['available', 'full'] },
      isActive: true,
    });

    let updatedCount = 0;

    for (const slot of futureSlots) {
      let priceUpdated = false;
      
      if (updates.sessionTypes) {
        const sessionTypeConfig = updates.sessionTypes.find(
          st => st.type === slot.sessionType
        );
        if (sessionTypeConfig && sessionTypeConfig.price) {
          slot.price = sessionTypeConfig.price;
          priceUpdated = true;
        }
      }
      
      if (!priceUpdated && updates.hourlyRate) {
        slot.price = updates.hourlyRate;
        priceUpdated = true;
      }
      
      if (priceUpdated) {
        await slot.save();
        updatedCount++;
      }
    }

    console.log(`✓ Updated pricing for ${updatedCount} session slots`);
    return updatedCount;
  }

  async syncAvailabilityToSlots(trainerId, updates) {
    // Availability is checked dynamically during booking
    // No need to update existing slots
    console.log(`✓ Availability updated - will reflect in booking system`);
  }

  // Session Slot Handlers
  async handleSlotCreated(data) {
    try {
      const { slot } = data;
      console.log(`✓ New session slot created: ${slot._id}`);
      
      // Emit event for real-time updates (can be used with WebSockets)
      this.emit('realtime:slot:created', { slot });
    } catch (error) {
      console.error('Error handling slot creation:', error);
    }
  }

  async handleSlotUpdated(data) {
    try {
      const { slotId, updates } = data;
      console.log(`🔄 Syncing slot updates for slot ${slotId}`);
      
      const slot = await SessionSlot.findById(slotId);
      if (!slot) return;

      // If time/date changed, update related bookings
      if (updates.date || updates.startTime || updates.endTime) {
        await this.syncSlotScheduleToBookings(slot);
      }

      // If price changed, update pending bookings
      if (updates.price) {
        await this.syncSlotPriceToBookings(slot);
      }

      // Emit event for real-time updates
      this.emit('realtime:slot:updated', { slot });
      
      console.log(`✓ Slot sync completed`);
    } catch (error) {
      console.error('Error handling slot update:', error);
    }
  }

  async handleSlotCancelled(data) {
    try {
      const { slotId, reason } = data;
      console.log(`🔄 Handling slot cancellation: ${slotId}`);
      
      const slot = await SessionSlot.findById(slotId);
      if (!slot) return;

      // Cancel all related bookings
      const bookingIds = slot.bookedBy.map(b => b.bookingId);
      
      if (bookingIds.length > 0) {
        await Session.updateMany(
          { _id: { $in: bookingIds }, status: { $in: ['pending', 'confirmed'] } },
          {
            status: 'cancelled',
            cancellationReason: reason || 'Session slot was cancelled by trainer',
            cancelledAt: new Date(),
          }
        );
        
        console.log(`✓ Cancelled ${bookingIds.length} bookings`);
      }

      // Emit event for real-time updates
      this.emit('realtime:slot:cancelled', { slotId, bookingIds });
    } catch (error) {
      console.error('Error handling slot cancellation:', error);
    }
  }

  async handleSlotDeleted(data) {
    try {
      const { slotId } = data;
      console.log(`🔄 Handling slot deletion: ${slotId}`);
      
      // Similar to cancellation
      await this.handleSlotCancelled({ slotId, reason: 'Session slot was deleted' });
      
      // Emit event for real-time updates
      this.emit('realtime:slot:deleted', { slotId });
    } catch (error) {
      console.error('Error handling slot deletion:', error);
    }
  }

  async syncSlotScheduleToBookings(slot) {
    const bookingIds = slot.bookedBy.map(b => b.bookingId);
    
    if (bookingIds.length > 0) {
      await Session.updateMany(
        { _id: { $in: bookingIds } },
        {
          scheduledDate: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
        }
      );
      
      console.log(`✓ Updated schedule for ${bookingIds.length} bookings`);
    }
  }

  async syncSlotPriceToBookings(slot) {
    const bookingIds = slot.bookedBy.map(b => b.bookingId);
    
    if (bookingIds.length > 0) {
      // Only update pending bookings (not yet paid)
      await Session.updateMany(
        { 
          _id: { $in: bookingIds },
          paymentStatus: 'pending'
        },
        {
          price: slot.price,
        }
      );
      
      console.log(`✓ Updated price for pending bookings`);
    }
  }

  // Booking Handlers
  async handleBookingCreated(data) {
    try {
      const { booking } = data;
      console.log(`✓ New booking created: ${booking._id}`);
      
      // Emit event for real-time updates
      this.emit('realtime:booking:created', { booking });
    } catch (error) {
      console.error('Error handling booking creation:', error);
    }
  }

  async handleBookingConfirmed(data) {
    try {
      const { bookingId } = data;
      console.log(`🔄 Handling booking confirmation: ${bookingId}`);
      
      const booking = await Session.findById(bookingId);
      if (!booking) return;

      // Update slot booking status
      const slot = await SessionSlot.findOne({
        'bookedBy.bookingId': bookingId
      });

      if (slot) {
        const slotBooking = slot.bookedBy.find(
          b => b.bookingId.toString() === bookingId.toString()
        );
        
        if (slotBooking) {
          slotBooking.hasAccess = true;
          await slot.save();
          console.log(`✓ Updated slot booking access`);
        }
      }

      // Emit event for real-time updates
      this.emit('realtime:booking:confirmed', { bookingId });
    } catch (error) {
      console.error('Error handling booking confirmation:', error);
    }
  }

  async handleBookingCancelled(data) {
    try {
      const { bookingId } = data;
      console.log(`🔄 Handling booking cancellation: ${bookingId}`);
      
      // Find and update related slot
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
        console.log(`✓ Updated slot availability after cancellation`);
      }

      // Emit event for real-time updates
      this.emit('realtime:booking:cancelled', { bookingId });
    } catch (error) {
      console.error('Error handling booking cancellation:', error);
    }
  }

  async handleBookingCompleted(data) {
    try {
      const { bookingId } = data;
      console.log(`✓ Booking completed: ${bookingId}`);
      
      const booking = await Session.findById(bookingId);
      if (!booking) return;

      // Update trainer stats
      await User.findByIdAndUpdate(booking.trainerId, {
        $inc: {
          'trainerProfile.completedSessions': 1,
          'trainerProfile.totalSessions': 1,
        },
      });

      // Update slot status if all bookings completed
      const slot = await SessionSlot.findOne({
        'bookedBy.bookingId': bookingId
      });

      if (slot && slot.date < new Date()) {
        slot.status = 'completed';
        await slot.save();
      }

      // Emit event for real-time updates
      this.emit('realtime:booking:completed', { bookingId });
      
      console.log(`✓ Updated trainer stats and slot status`);
    } catch (error) {
      console.error('Error handling booking completion:', error);
    }
  }

  // Utility methods for manual sync
  async syncAllTrainerData(trainerId) {
    console.log(`🔄 Full sync for trainer ${trainerId}`);
    
    const trainer = await User.findById(trainerId);
    if (!trainer || trainer.userType !== 'trainer') {
      throw new Error('Trainer not found');
    }

    // Sync pricing
    await this.syncPricingToSlots(trainerId, {
      sessionTypes: trainer.trainerProfile.sessionTypes,
      hourlyRate: trainer.trainerProfile.hourlyRate,
    });

    console.log(`✓ Full sync completed for trainer ${trainerId}`);
  }

  async syncAllSlotData(slotId) {
    console.log(`🔄 Full sync for slot ${slotId}`);
    
    const slot = await SessionSlot.findById(slotId);
    if (!slot) {
      throw new Error('Slot not found');
    }

    // Sync schedule to bookings
    await this.syncSlotScheduleToBookings(slot);
    
    // Sync price to bookings
    await this.syncSlotPriceToBookings(slot);

    console.log(`✓ Full sync completed for slot ${slotId}`);
  }

  // Get sync status
  async getSyncStatus(trainerId) {
    const trainer = await User.findById(trainerId);
    if (!trainer) {
      throw new Error('Trainer not found');
    }

    const slots = await SessionSlot.find({
      trainerId,
      isActive: true,
    });

    const bookings = await Session.find({
      trainerId,
      status: { $in: ['pending', 'confirmed'] },
    });

    return {
      trainer: {
        id: trainerId,
        name: trainer.name,
        hourlyRate: trainer.trainerProfile.hourlyRate,
        sessionTypes: trainer.trainerProfile.sessionTypes.length,
      },
      slots: {
        total: slots.length,
        available: slots.filter(s => s.status === 'available').length,
        full: slots.filter(s => s.status === 'full').length,
      },
      bookings: {
        total: bookings.length,
        pending: bookings.filter(b => b.status === 'pending').length,
        confirmed: bookings.filter(b => b.status === 'confirmed').length,
      },
      lastSync: new Date(),
    };
  }
}

// Create singleton instance
const syncService = new SyncService();

export default syncService;
