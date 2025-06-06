import express from 'express';
import nodemailer from 'nodemailer';

const router = express.Router();
const otpStore = new Map(); // simple in-memory store { email: otp }

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
}

// Configure Nodemailer transporter with SMTP details from environment variables
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST, // e.g. smtp.gmail.com
  port: Number(process.env.SMTP_PORT) || 587, // usually 587 or 465
  secure: process.env.SMTP_SECURE === 'true', // true for port 465, false for 587
  auth: {
    user: process.env.SMTP_USER, // SMTP username
    pass: process.env.SMTP_PASS, // SMTP password or app password
  },
});

// Send OTP endpoint
router.post('/', async (req, res) => {
  const { to_email } = req.body;

  if (!to_email) return res.status(400).json({ success: false, message: 'Email required' });

  try {
    const otp = generateOtp();
    otpStore.set(to_email, otp);

    // Prepare email content
   const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: to_email,
      subject: '🚦 SIKLO Email Verification - Your OTP Code 🛺',
      text: `Your OTP code is ${otp} 🛺. It is valid for 5 minutes.`,
      html: `
        <p>Your OTP code is <strong>${otp} 🛺</strong>. It is valid for 5 minutes.</p>
        <p>Thank you for using <span style="font-weight:bold;">SIKLO</span> 🛺!</p>
      `,
    };
    // Send mail with defined transport object
    await transporter.sendMail(mailOptions);

    res.status(200).json({ success: true, message: 'OTP sent' });
  } catch (error) {
    console.error('Nodemailer Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Verify OTP endpoint
router.post('/verify-otp', (req, res) => {
  const { to_email, otp } = req.body;

  if (!to_email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP required' });

  const validOtp = otpStore.get(to_email);

  if (validOtp === otp) {
    otpStore.delete(to_email); // invalidate OTP after verification
    return res.status(200).json({ success: true, message: 'OTP verified' });
  }

  res.status(400).json({ success: false, message: 'Invalid OTP' });
});

export default router;
