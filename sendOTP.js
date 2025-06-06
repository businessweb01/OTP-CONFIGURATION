import express from 'express';
import emailjs from '@emailjs/nodejs';

const router = express.Router();

const otpStore = new Map(); // simple in-memory store { email: otp }

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
}

// Send OTP endpoint
router.post('/', async (req, res) => {
  const { to_email } = req.body;

  if (!to_email) return res.status(400).json({ success: false, message: 'Email required' });

  try {
    const otp = generateOtp();
    otpStore.set(to_email, otp);

    await emailjs.send(
      process.env.EMAILJS_SERVICE_ID,
      process.env.EMAILJS_TEMPLATE_ID,
      { to_email, otp },
      {
        publicKey: process.env.EMAILJS_PUBLIC_KEY,
        privateKey: process.env.EMAILJS_PRIVATE_KEY,
      }
    );

    res.status(200).json({ success: true, message: 'OTP sent' });
  } catch (error) {
    console.error('EmailJS Error:', error);
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
