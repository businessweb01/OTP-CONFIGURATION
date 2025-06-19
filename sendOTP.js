import express from 'express';
import nodemailer from 'nodemailer';
import { db } from './firebase.js';
import {
  doc,
  setDoc,
  getDoc,
  deleteDoc,
} from 'firebase/firestore';

const router = express.Router();

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// 🚀 SEND OTP
router.post('/', async (req, res) => {
  const { to_email } = req.body;
  if (!to_email) return res.status(400).json({ success: false, message: 'Email required' });

  try {
    const otp = generateOtp();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes from now

    // Save to Firestore
    await setDoc(doc(db, 'otp', to_email), { otp, expiresAt });

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: to_email,
      subject: '🚦 SIKLO Email Verification - Your OTP Code 🛺',
      html: `<p>Your OTP is <strong>${otp} 🛺</strong>. Valid for 5 minutes.</p>`,
    });

    res.json({ success: true, message: 'OTP sent' });
  } catch (err) {
    console.error('Send OTP error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ✅ VERIFY OTP
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP required' });

  try {
    const ref = doc(db, 'otp', email);
    const docSnap = await getDoc(ref);

    if (!docSnap.exists()) return res.status(400).json({ success: false, message: 'No OTP found' });

    const { otp: storedOtp, expiresAt } = docSnap.data();

    if (Date.now() > expiresAt) {
      await deleteDoc(ref);
      return res.status(400).json({ success: false, message: 'OTP expired' });
    }

    if (otp !== storedOtp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    await deleteDoc(ref); // ✅ Invalidate immediately
    res.json({ success: true, message: 'OTP verified' });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});


export default router;
