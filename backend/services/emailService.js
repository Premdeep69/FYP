import nodemailer from "nodemailer";

// Create transporter — uses SMTP env vars, falls back to Ethereal for dev
const createTransporter = async () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Dev fallback: Ethereal (fake SMTP — logs preview URL to console)
  const testAccount = await nodemailer.createTestAccount();
  console.log("📧 Using Ethereal test email account:", testAccount.user);
  return nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
};

const FROM_NAME = process.env.EMAIL_FROM_NAME || "SmartGym";
const FROM_EMAIL = process.env.EMAIL_FROM || "noreply@smartgym.app";
const APP_URL = process.env.FRONTEND_URL || "http://localhost:8080";

// ── Send email verification ───────────────────────────────────────────────────
export const sendVerificationEmail = async (user, token) => {
  const transporter = await createTransporter();
  const verifyUrl = `${APP_URL}/verify-email?token=${token}`;

  const info = await transporter.sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: user.email,
    subject: "Verify your SmartGym email address",
    html: `
      <div style="font-family: Inter, Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #E2E5ED;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #3B5BF5 0%, #8B3CF7 100%); padding: 32px 40px; text-align: center;">
          <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0; letter-spacing: -0.02em;">SmartGym</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px;">Your Fitness Platform</p>
        </div>
        <!-- Body -->
        <div style="padding: 40px;">
          <h2 style="color: #1A1F2E; font-size: 20px; font-weight: 700; margin: 0 0 12px;">Verify your email address</h2>
          <p style="color: #7A8299; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
            Hi <strong style="color: #1A1F2E;">${user.name}</strong>, thanks for signing up! Please verify your email address to activate your account.
          </p>
          <a href="${verifyUrl}"
             style="display: inline-block; background: linear-gradient(135deg, #3B5BF5, #8B3CF7); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; letter-spacing: 0.01em;">
            Verify Email Address
          </a>
          <p style="color: #7A8299; font-size: 13px; margin: 24px 0 0; line-height: 1.5;">
            This link expires in <strong>24 hours</strong>. If you didn't create an account, you can safely ignore this email.
          </p>
          <hr style="border: none; border-top: 1px solid #E2E5ED; margin: 28px 0;" />
          <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
            Or copy this link into your browser:<br/>
            <span style="color: #3B5BF5; word-break: break-all;">${verifyUrl}</span>
          </p>
        </div>
      </div>
    `,
  });

  if (process.env.NODE_ENV !== "production") {
    console.log("📧 Verification email preview:", nodemailer.getTestMessageUrl(info));
  }
};

// ── Send password reset email ─────────────────────────────────────────────────
export const sendPasswordResetEmail = async (user, token) => {
  const transporter = await createTransporter();
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;

  const info = await transporter.sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: user.email,
    subject: "Reset your SmartGym password",
    html: `
      <div style="font-family: Inter, Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #E2E5ED;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #3B5BF5 0%, #8B3CF7 100%); padding: 32px 40px; text-align: center;">
          <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0; letter-spacing: -0.02em;">SmartGym</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px;">Your Fitness Platform</p>
        </div>
        <!-- Body -->
        <div style="padding: 40px;">
          <h2 style="color: #1A1F2E; font-size: 20px; font-weight: 700; margin: 0 0 12px;">Reset your password</h2>
          <p style="color: #7A8299; font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
            Hi <strong style="color: #1A1F2E;">${user.name}</strong>, we received a request to reset your password. Click the button below to create a new one.
          </p>
          <a href="${resetUrl}"
             style="display: inline-block; background: linear-gradient(135deg, #3B5BF5, #8B3CF7); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 15px; letter-spacing: 0.01em;">
            Reset Password
          </a>
          <p style="color: #7A8299; font-size: 13px; margin: 24px 0 0; line-height: 1.5;">
            This link expires in <strong>1 hour</strong>. If you didn't request a password reset, you can safely ignore this email — your password will not change.
          </p>
          <hr style="border: none; border-top: 1px solid #E2E5ED; margin: 28px 0;" />
          <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
            Or copy this link into your browser:<br/>
            <span style="color: #3B5BF5; word-break: break-all;">${resetUrl}</span>
          </p>
        </div>
      </div>
    `,
  });

  if (process.env.NODE_ENV !== "production") {
    console.log("📧 Password reset email preview:", nodemailer.getTestMessageUrl(info));
  }
};
