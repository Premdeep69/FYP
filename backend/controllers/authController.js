import User from "../models/users.js";
import TrainerDocument from "../models/trainerDocument.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendVerificationEmail, sendPasswordResetEmail } from "../services/emailService.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

const generateSecureToken = () => crypto.randomBytes(32).toString("hex");

// ── Register ──────────────────────────────────────────────────────────────────

export const registerUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      userType,
      age, height, weight, fitnessLevel, fitnessGoals,
      bio, specializations, certifications, experience, hourlyRate,
    } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // In production without SMTP, auto-verify all users so they can log in immediately
    const skipEmailVerification = process.env.NODE_ENV === "production" &&
      !process.env.SMTP_HOST;

    const verificationToken = skipEmailVerification ? null : generateSecureToken();
    const verificationExpires = skipEmailVerification
      ? null
      : new Date(Date.now() + 24 * 60 * 60 * 1000);

    const userData = {
      name,
      email,
      password: hashedPassword,
      userType,
      emailVerified: skipEmailVerification ? true : false,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
    };

    // Regular users are immediately active when email is auto-verified
    if (skipEmailVerification && userType === "user") {
      userData.isActive = true;
    }

    if (userType === "user") {
      userData.profile = {
        age: age ? parseInt(age) : undefined,
        height: height ? parseFloat(height) : undefined,
        weight: weight ? parseFloat(weight) : undefined,
        fitnessLevel: fitnessLevel || "beginner",
        goals: fitnessGoals || [],
      };
    }

    if (userType === "trainer") {
      userData.profile = { bio: bio || "", fitnessLevel: "beginner" };
      userData.trainerProfile = {
        specializations: specializations || [],
        certifications: certifications || [],
        experience: experience ? parseInt(experience) : 0,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : 0,
      };
      userData.trainerVerification = {
        status: "pending",
        submittedAt: new Date(),
        documents: [],
      };
      userData.isVerified = false;
      userData.isActive = false;
    }

    const user = await User.create(userData);

    // Save trainer documents
    if (userType === "trainer" && Array.isArray(req.body.documents) && req.body.documents.length > 0) {
      const docInserts = req.body.documents
        .filter(d => d && d.data)
        .map(d => ({
          trainerId: user._id,
          name: String(d.name || "document"),
          mimeType: String(d.type || "application/octet-stream"),
          size: Number(d.size || 0),
          data: String(d.data),
        }));
      if (docInserts.length > 0) await TrainerDocument.insertMany(docInserts);
    }

    // Send verification email (skip in production without SMTP)
    if (!skipEmailVerification) {
      try {
        await sendVerificationEmail(user, verificationToken);
      } catch (emailErr) {
        console.error("Failed to send verification email:", emailErr.message);
      }
    }

    res.status(201).json({
      message: skipEmailVerification
        ? "Account created successfully. You can now log in."
        : "Account created successfully. Please check your email to verify your account.",
      requiresVerification: !skipEmailVerification,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType,
        emailVerified: user.emailVerified,
        isVerified: user.isVerified,
        isActive: user.isActive,
        trainerVerification: user.trainerVerification,
        profile: user.profile,
        trainerProfile: user.trainerProfile,
      },
    });
  } catch (error) {
    console.error("Register error:", error.message, error.errors);
    res.status(500).json({ message: error.message });
  }
};

// ── Verify Email ──────────────────────────────────────────────────────────────

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ message: "Verification token is required" });
    }

    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired verification link. Please request a new one.",
        expired: true,
      });
    }

    // Mark email as verified
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    // Activate regular users immediately; trainers still need admin approval
    if (user.userType === "user") {
      user.isActive = true;
    }
    await user.save();

    // Issue JWT so user is logged in right after verification
    const token_jwt = jwt.sign(
      { id: user._id, userType: user.userType },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Email verified successfully! Your account is now active.",
      token: token_jwt,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType,
        emailVerified: user.emailVerified,
        isVerified: user.isVerified,
        isActive: user.isActive,
        trainerVerification: user.trainerVerification,
        profile: user.profile,
        trainerProfile: user.trainerProfile,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── Resend Verification Email ─────────────────────────────────────────────────

export const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      // Don't reveal whether email exists
      return res.json({ message: "If that email is registered, a verification link has been sent." });
    }

    if (user.emailVerified) {
      return res.status(400).json({ message: "This email is already verified." });
    }

    // Generate new token
    const verificationToken = generateSecureToken();
    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    await sendVerificationEmail(user, verificationToken);

    res.json({ message: "Verification email sent. Please check your inbox." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── Login ─────────────────────────────────────────────────────────────────────

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Block login if email not verified
    if (!user.emailVerified) {
      return res.status(403).json({
        message: "Please verify your email address before logging in. Check your inbox for the verification link.",
        requiresVerification: true,
        email: user.email,
      });
    }

    const token = jwt.sign(
      { id: user._id, userType: user.userType },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType,
        emailVerified: user.emailVerified,
        isVerified: user.isVerified,
        isActive: user.isActive,
        trainerVerification: user.trainerVerification,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── Forgot Password ───────────────────────────────────────────────────────────

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ message: "If that email is registered, a password reset link has been sent." });
    }

    // Generate reset token (1h expiry)
    const resetToken = generateSecureToken();
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    await sendPasswordResetEmail(user, resetToken);

    res.json({ message: "Password reset link sent. Please check your email." });
  } catch (error) {
    console.error("Forgot password error:", error.message);
    res.status(500).json({ message: "Failed to send reset email. Please try again." });
  }
};

// ── Reset Password ────────────────────────────────────────────────────────────

export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ message: "Token and new password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired reset link. Please request a new one.",
        expired: true,
      });
    }

    // Hash new password and clear reset fields
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Issue JWT so user is logged in after reset
    const jwtToken = jwt.sign(
      { id: user._id, userType: user.userType },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Password reset successfully. You are now logged in.",
      token: jwtToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType,
        emailVerified: user.emailVerified,
        isVerified: user.isVerified,
        isActive: user.isActive,
        trainerVerification: user.trainerVerification,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── Get Trainers ──────────────────────────────────────────────────────────────

export const getTrainers = async (req, res) => {
  try {
    const trainers = await User.find({
      userType: "trainer",
      isActive: true,
    }).select("-password");
    res.json(trainers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ── Get Me ────────────────────────────────────────────────────────────────────

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      userType: user.userType,
      emailVerified: user.emailVerified,
      isVerified: user.isVerified,
      isActive: user.isActive,
      trainerVerification: user.trainerVerification,
      profile: user.profile,
      trainerProfile: user.trainerProfile,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
