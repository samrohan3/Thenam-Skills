import { Request, Response, NextFunction } from 'express';
import { admin } from '../config/firebaseAdmin';

export interface AuthenticatedRequest extends Request {
  user?: any; // Hold Firestore User document or synchronized auth payload
}

export const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access Denied. Authorization Bearer token is missing or malformed.',
      error: {
        code: 'UNAUTHORIZED'
      }
    });
  }

  const token = authHeader.split(' ')[1];

  try {


    // 1. Verify token with Firebase Admin Auth
    const decodedToken = await admin.auth().verifyIdToken(token);
    const firebaseUid = decodedToken.uid;

    // 2. Fetch User document from Firestore
    const userDoc = await admin.firestore().collection('users').doc(firebaseUid).get();

    // 3. Attach user record to request
    if (userDoc.exists) {
      req.user = {
        id: userDoc.id,
        firebaseUid: userDoc.id,
        ...userDoc.data()
      };
    } else {
      req.user = {
        firebaseUid,
        email: decodedToken.email || '',
        name: decodedToken.name || 'Google User',
        photoURL: decodedToken.picture || '',
        role: 'student',
        profileCompleted: false
      };
    }

    next();
  } catch (error: any) {
    console.error('Firebase token verification failed:', error);
    return res.status(401).json({
      success: false,
      message: 'Access Denied. Invalid, expired, or revoked Authorization token.',
      error: {
        code: 'UNAUTHORIZED',
        details: error.message
      }
    });
  }
};
export default authMiddleware;
