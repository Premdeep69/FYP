import mongoose from "mongoose";

const sessionSlotSchema = new mongoose.Schema(
  {
    trainerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: String,
    sessionType: {
      type: String,
      enum: ["personal-training", "group-class", "consultation", "follow-up"],
      required: true,
    },
    mode: {
      type: String,
      enum: ["online", "offline", "hybrid"],
      default: "offline",
    },
    location: {
      type: String,
      required: function() {
        return this.mode === "offline" || this.mode === "hybrid";
      },
    },
    // External meeting link (Zoom, Google Meet, etc.)
    meetingLink: {
      type: String,
    },
    date: {
      type: Date,
      required: true,
    },
    startTime: {
      type: String, // HH:MM format
      required: true,
    },
    endTime: {
      type: String, // HH:MM format
      required: true,
    },
    duration: {
      type: Number, // in minutes
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    maxParticipants: {
      type: Number,
      default: 1, // 1 for personal training, more for group classes
    },
    currentParticipants: {
      type: Number,
      default: 0,
    },
    bookedBy: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Session",
      },
      bookedAt: Date,
      hasAccess: { type: Boolean, default: true },
    }],
    status: {
      type: String,
      enum: ["available", "full", "completed", "cancelled"],
      default: "available",
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurringPattern: {
      frequency: {
        type: String,
        enum: ["daily", "weekly", "monthly"],
      },
      endDate: Date,
      daysOfWeek: [Number], // 0-6 for Sunday-Saturday
    },
    requirements: [String], // Prerequisites or requirements
    equipment: [String], // Required equipment
    tags: [String], // For categorization
    cancellationPolicy: {
      type: String,
      default: "24 hours notice required",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Indexes for efficient queries
sessionSlotSchema.index({ trainerId: 1, date: 1, status: 1 });
sessionSlotSchema.index({ status: 1, date: 1 });
sessionSlotSchema.index({ sessionType: 1, mode: 1 });

// Virtual for checking if slot is bookable
sessionSlotSchema.virtual('isBookable').get(function() {
  return this.status === 'available' && 
         this.currentParticipants < this.maxParticipants &&
         this.isActive &&
         new Date(this.date) > new Date();
});

// Method to check availability
sessionSlotSchema.methods.hasAvailability = function() {
  return this.currentParticipants < this.maxParticipants && 
         this.status === 'available';
};

// Method to add participant
sessionSlotSchema.methods.addParticipant = function(userId, bookingId) {
  if (!this.hasAvailability()) {
    throw new Error('Slot is full');
  }
  
  this.bookedBy.push({
    userId,
    bookingId,
    bookedAt: new Date(),
    hasAccess: true,
  });
  
  this.currentParticipants += 1;
  
  if (this.currentParticipants >= this.maxParticipants) {
    this.status = 'full';
  }
  
  return this.save();
};

// Method to remove participant
sessionSlotSchema.methods.removeParticipant = function(userId) {
  const index = this.bookedBy.findIndex(
    (booking) => booking.userId.toString() === userId.toString()
  );
  
  if (index > -1) {
    this.bookedBy.splice(index, 1);
    this.currentParticipants -= 1;
    
    if (this.status === 'full' && this.currentParticipants < this.maxParticipants) {
      this.status = 'available';
    }
  }
  
  return this.save();
};

// ALL HOOKS COMPLETELY REMOVED FOR DEBUGGING
// Synchronization handled entirely by syncService events from controllers

export default mongoose.model("SessionSlot", sessionSlotSchema);
