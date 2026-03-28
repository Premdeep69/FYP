import User from "../models/users.js";
import TrainerDocument from "../models/trainerDocument.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const registerUser = async (req, res) => {
  try {
    const { 
      name, 
      email, 
      password, 
      userType,
      // User-specific fields
      age,
      height,
      weight,
      fitnessLevel,
      fitnessGoals,
      // Trainer-specific fields
      bio,
      specializations,
      certifications,
      experience,
      hourlyRate
    } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Build user object
    const userData = {
      name,
      email,
      password: hashedPassword,
      userType,
    };

    // Add user-specific profile data
    if (userType === "user") {
      userData.profile = {
        age: age ? parseInt(age) : undefined,
        height: height ? parseFloat(height) : undefined,
        weight: weight ? parseFloat(weight) : undefined,
        fitnessLevel: fitnessLevel || "beginner",
        goals: fitnessGoals || [],
      };
    }

    // Add trainer-specific profile data
    if (userType === "trainer") {
      userData.profile = {
        bio: bio || "",
        fitnessLevel: "beginner",
      };
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

    // Create user
    const user = await User.create(userData);

    // Save documents to separate collection — avoids any schema cast issues on User model
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
      if (docInserts.length > 0) {
        await TrainerDocument.insertMany(docInserts);
      }
    }

    // Generate token
    const token = jwt.sign(
      { id: user._id, userType: user.userType },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "Account created successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType,
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

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Generate token
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
        isVerified: user.isVerified,
        isActive: user.isActive,
        trainerVerification: user.trainerVerification,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all trainers
export const getTrainers = async (req, res) => {
  try {
    const trainers = await User.find({ 
      userType: "trainer",
      isActive: true 
    }).select('-password');

    res.json(trainers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/auth/me — returns fresh user data
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      userType: user.userType,
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
