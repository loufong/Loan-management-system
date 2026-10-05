import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticate } from '../../middlewares/auth.middleware';

export const authRouter = Router();

// ==========================================
// 1. PUBLIC AUTHENTICATION & GMAIL OTP FLOW
// ==========================================

// Register new account & create pending_registrations record
authRouter.post('/register', AuthController.register);

// Login with email/username and password
authRouter.post('/login', AuthController.login);

// Verify 6-digit OTP code (for atomic user creation or password reset)
authRouter.post('/verify-otp', AuthController.verifyOtp);
authRouter.post('/otp/verify', AuthController.verifyOtp); // Alias per Point 10

// Resend / Send 6-digit OTP code with 60-second rate-limiting cooldown
authRouter.post('/resend-otp', AuthController.resendOtp);
authRouter.post('/send-otp', AuthController.resendOtp);
authRouter.post('/otp/send', AuthController.resendOtp); // Alias per Point 9

// Forgot Password - Send recovery OTP to Gmail
authRouter.post('/forgot-password', AuthController.forgotPassword);

// Set New Password using verified OTP reset token
authRouter.post('/reset-password', AuthController.resetPassword);

// Token rotation
authRouter.post('/refresh', AuthController.refreshTokens);

// Backward compatibility for borrower direct origination
authRouter.post('/register-borrower', AuthController.registerBorrower);

// ==========================================
// 2. AUTHENTICATED PROFILE & SESSION
// ==========================================

// Current user profile
authRouter.get('/me', authenticate, AuthController.me);

// Profile updates
authRouter.put('/profile', authenticate, AuthController.updateProfile);

// Change password
authRouter.put('/change-password', authenticate, AuthController.changePassword);
authRouter.post('/change-password', authenticate, AuthController.changePassword);

// Logout & invalidate session
authRouter.post('/logout', authenticate, AuthController.logout);
