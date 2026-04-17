import SessionRequest from "../models/sessionRequest.js";
import syncService from "../services/syncService.js";

/**
 * Marks awaiting_payment requests as expired when their deadline has passed.
 * Run this on an interval (e.g. every hour).
 */
export const expireOverdueRequests = async () => {
  try {
    const expired = await SessionRequest.find({
      status: "awaiting_payment",
      paymentDeadline: { $lt: new Date() },
    }).populate("userId", "name email").populate("trainerId", "name email");

    if (expired.length === 0) return;

    const ids = expired.map(r => r._id);
    await SessionRequest.updateMany({ _id: { $in: ids } }, { status: "expired" });

    for (const req of expired) {
      req.status = "expired";
      syncService.emit("sessionRequest:expired", { request: req });
    }

    console.log(`[expireSessionRequests] Expired ${expired.length} overdue request(s)`);
  } catch (err) {
    console.error("[expireSessionRequests] Error:", err.message);
  }
};

export const startExpiryJob = () => {
  // Run immediately on startup, then every hour
  expireOverdueRequests();
  setInterval(expireOverdueRequests, 60 * 60 * 1000);
};
