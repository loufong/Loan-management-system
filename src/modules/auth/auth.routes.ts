import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticate } from '../../middlewares/auth.middleware';

export const authRouter = Router();

// Public Authentication
authRouter.post('/login', AuthController.login);
authRouter.post('/register', AuthController.registerBorrower);
authRouter.post('/refresh', AuthController.refreshTokens);

// Authenticated Session & Profile Management
authRouter.get('/me', authenticate, AuthController.me);
authRouter.put('/profile', authenticate, AuthController.updateProfile);
authRouter.put('/change-password', authenticate, AuthController.changePassword);
authRouter.post('/change-password', authenticate, AuthController.changePassword);
authRouter.post('/logout', authenticate, AuthController.logout);
