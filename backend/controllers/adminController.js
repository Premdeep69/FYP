import User from "../models/users.js";
import Payment from "../models/payment.js";
import Session from "../models/session.js";
import TrainerDocument from "../models/trainerDocument.js";
import bcrypt from "bcryptjs";

// GET /api/admin/stats
export const getStats = async (req, res) => {
  try {
    const [totalUsers, totalTrainers, totalPayments, revenueResult] = await Promise.all([
      User.countDocuments({ userType: "user" }),
      User.countDocuments({ userType: "trainer" }),
      Payment.countDocuments({ status: "succeeded" }),
      Payment.aggregate([
        { $match: { status: "succeeded" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    const totalRevenue = revenueResult[0]?.total || 0;

    // Monthly revenue for chart (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyRevenue = await Payment.aggregate([
      { $match: { status: "succeeded", createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          revenue: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    res.json({
      totalUsers,
      totalTrainers,
      totalPayments,
      totalRevenue: totalRevenue / 100, // convert cents to dollars
      monthlyRevenue: monthlyRevenue.map((m) => ({
        month: `${m._id.year}-${String(m._id.month).padStart(2, "0")}`,
        revenue: m.revenue / 100,
        count: m.count,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/admin/users
export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, userType } = req.query;
    const query = {};
    if (userType) query.userType = userType;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit)),
      User.countDocuments(query),
    ]);

    res.json({ users, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/admin/trainers/pending
export const getPendingTrainers = async (req, res) => {
  try {
    const trainers = await User.find({
      userType: "trainer",
      $or: [
        { "trainerVerification.status": "pending" },
        { "trainerVerification.status": { $exists: false } },
        { trainerVerification: { $exists: false } },
      ],
    }).select("-password").sort({ createdAt: -1 }).lean();

    // Attach documents from separate collection
    const trainerIds = trainers.map(t => t._id);
    const allDocs = await TrainerDocument.find({ trainerId: { $in: trainerIds } }).lean();

    const docsByTrainer = {};
    allDocs.forEach(d => {
      const key = d.trainerId.toString();
      if (!docsByTrainer[key]) docsByTrainer[key] = [];
      docsByTrainer[key].push({ name: d.name, mimeType: d.mimeType, size: d.size, data: d.data, _id: d._id });
    });

    const result = trainers.map(t => ({
      ...t,
      verificationDocuments: docsByTrainer[t._id.toString()] || [],
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/admin/trainers
export const getAllTrainers = async (req, res) => {
  try {
    const trainers = await User.find({ userType: "trainer" })
      .select("-password")
      .sort({ createdAt: -1 });

    res.json(trainers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/admin/trainers/:id/verify
export const verifyTrainer = async (req, res) => {
  try {
    const trainer = await User.findOneAndUpdate(
      { _id: req.params.id, userType: "trainer" },
      {
        "trainerVerification.status": "verified",
        "trainerVerification.reviewedAt": new Date(),
        "trainerVerification.reviewNotes": req.body.notes || "",
        isVerified: true,
        isActive: true,
      },
      { new: true }
    ).select("-password");

    if (!trainer) return res.status(404).json({ message: "Trainer not found" });

    res.json({ message: "Trainer verified successfully", trainer });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/admin/trainers/:id/reject
export const rejectTrainer = async (req, res) => {
  try {
    const trainer = await User.findOneAndUpdate(
      { _id: req.params.id, userType: "trainer" },
      {
        "trainerVerification.status": "rejected",
        "trainerVerification.reviewedAt": new Date(),
        "trainerVerification.reviewNotes": req.body.notes || "",
        isVerified: false,
      },
      { new: true }
    ).select("-password");

    if (!trainer) return res.status(404).json({ message: "Trainer not found" });

    res.json({ message: "Trainer rejected", trainer });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/admin/payments
export const getAllPayments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      startDate,
      endDate,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const query = {};
    if (status && status !== "all") query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    // If searching by name we need to do a lookup — fetch all and filter in memory for simplicity
    let payments = await Payment.find(query)
      .populate("userId", "name email")
      .populate("trainerId", "name email")
      .populate("sessionId", "sessionType scheduledDate startTime duration")
      .sort(sort)
      .lean();

    // Apply search filter after populate
    if (search) {
      const s = search.toLowerCase();
      payments = payments.filter(
        (p) =>
          p.userId?.name?.toLowerCase().includes(s) ||
          p.userId?.email?.toLowerCase().includes(s) ||
          p.trainerId?.name?.toLowerCase().includes(s) ||
          p.stripePaymentIntentId?.toLowerCase().includes(s) ||
          p.description?.toLowerCase().includes(s)
      );
    }

    const total = payments.length;
    const paginated = payments.slice((page - 1) * limit, page * limit);

    // Summary stats across the full filtered set (before pagination)
    const summary = {
      totalRevenue: 0,
      completed: 0,
      pending: 0,
      refunded: 0,
      failed: 0,
    };
    for (const p of payments) {
      if (p.status === "succeeded") { summary.totalRevenue += p.amount; summary.completed++; }
      else if (p.status === "pending") summary.pending++;
      else if (p.status === "refunded") summary.refunded++;
      else if (p.status === "failed") summary.failed++;
    }
    summary.totalRevenue = summary.totalRevenue / 100;

    res.json({
      payments: paginated,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      summary,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/admin/payments/:id — single payment detail
export const getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate("userId", "name email")
      .populate("trainerId", "name email")
      .populate("sessionId", "sessionType scheduledDate startTime endTime duration status")
      .lean();

    if (!payment) return res.status(404).json({ message: "Payment not found" });

    res.json(payment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/admin/users/:id/toggle-active
export const toggleUserActive = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    user.isActive = !user.isActive;
    await user.save();

    res.json({ message: `User ${user.isActive ? "activated" : "deactivated"}`, user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/admin/trainers
export const addTrainer = async (req, res) => {
  try {
    const { name, email, password, specializations, certifications, experience, hourlyRate, bio } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "Email already in use" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const trainer = await User.create({
      name,
      email,
      password: hashedPassword,
      userType: "trainer",
      isVerified: true,
      isActive: true,
      trainerVerification: { status: "verified", reviewedAt: new Date() },
      trainerProfile: {
        specializations: specializations || [],
        certifications: certifications || [],
        experience: experience || 0,
        hourlyRate: hourlyRate || 0,
        bio: bio || "",
      },
    });

    res.status(201).json({
      message: "Trainer added successfully",
      trainer: { id: trainer._id, name: trainer.name, email: trainer.email },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
