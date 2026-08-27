import { Request, Response } from 'express';
import { admin } from '../config/firebaseAdmin';
import { sendResponse } from '../utils/apiResponse';
import { asyncHandler } from '../utils/asyncHandler';

// GET /api/activities
export const getActivities = asyncHandler(async (req: Request, res: Response) => {
  const db = admin.firestore();
  
  const snapshot = await db.collection('activities')
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();

  const activities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Gather unique user UIDs to populate user metadata
  const uids = Array.from(new Set(activities.map((act: any) => act.user).filter(Boolean)));
  
  if (uids.length > 0) {
    const userRefs = uids.map(uid => db.collection('users').doc(uid));
    const userDocs = await db.getAll(...userRefs);
    const userMap: Record<string, any> = {};
    
    userDocs.forEach(doc => {
      if (doc.exists) {
        const d = doc.data() || {};
        userMap[doc.id] = {
          id: doc.id,
          firebaseUid: doc.id,
          name: d.name || 'Google User',
          photoURL: d.photoURL || '',
          avatar: d.avatar || '',
          headline: d.headline || '',
          college: d.college || '',
          department: d.department || '',
          year: d.year || '',
          collegeName: d.collegeName || ''
        };
      }
    });

    // Populate user in each activity
    activities.forEach((act: any) => {
      if (act.user && userMap[act.user]) {
        act.user = userMap[act.user];
      } else {
        act.user = { name: 'Google User', photoURL: '' };
      }
    });
  }

  return sendResponse(res, 200, true, 'Activities feed retrieved successfully.', activities);
});

// POST /api/activities
export const createActivity = asyncHandler(async (req: any, res: Response) => {
  const db = admin.firestore();
  const uid = req.user?.firebaseUid || req.user?.id;
  if (!uid) {
    return sendResponse(res, 401, false, 'Unauthorized');
  }

  const { type, title, description, badgeText, badgeTheme, metadata } = req.body;
  
  const activityData = {
    user: uid,
    type: type || 'student_post',
    title: title || '',
    description: description || '',
    badgeText: badgeText || '💭 Student Post',
    badgeTheme: badgeTheme || 'blue',
    metadata: metadata || {},
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    likesCount: 0,
    commentsCount: 0,
    sharesCount: 0
  };

  const docRef = await db.collection('activities').add(activityData);
  const newActivity = await docRef.get();

  return sendResponse(res, 201, true, 'Activity created successfully.', { id: newActivity.id, ...newActivity.data() });
});

// DELETE /api/activities/:id
export const deleteActivity = asyncHandler(async (req: any, res: Response) => {
  const db = admin.firestore();
  const uid = req.user?.firebaseUid || req.user?.id;
  const activityId = req.params.id;

  if (!uid) {
    return sendResponse(res, 401, false, 'Unauthorized');
  }

  const docRef = db.collection('activities').doc(activityId);
  const doc = await docRef.get();

  if (!doc.exists) {
    return sendResponse(res, 404, false, 'Activity not found');
  }

  const data = doc.data();
  if (data?.user !== uid) {
    return sendResponse(res, 403, false, 'Forbidden: You can only delete your own activities');
  }

  await docRef.delete();

  return sendResponse(res, 200, true, 'Activity deleted successfully.');
});

// POST /api/activities/:id/like
export const toggleLikeActivity = asyncHandler(async (req: any, res: Response) => {
  const db = admin.firestore();
  const uid = req.user?.firebaseUid || req.user?.id;
  const activityId = req.params.id;

  if (!uid) {
    return sendResponse(res, 401, false, 'Unauthorized');
  }

  const docRef = db.collection('activities').doc(activityId);
  const doc = await docRef.get();

  if (!doc.exists) {
    return sendResponse(res, 404, false, 'Activity not found');
  }

  const data = doc.data() || {};
  let likedBy = data.likedBy || [];
  
  const hasLiked = likedBy.includes(uid);
  if (hasLiked) {
    likedBy = likedBy.filter((id: string) => id !== uid);
  } else {
    likedBy.push(uid);
  }
  
  const likesCount = likedBy.length;
  await docRef.update({ likedBy, likesCount });
  
  try {
    const { io } = require('../server');
    io.emit('activity_liked', { activityId, likesCount, likedBy });
  } catch (err) {
    console.error('Socket io emit error', err);
  }

  return sendResponse(res, 200, true, 'Like toggled successfully', { likesCount, likedBy, hasLiked: !hasLiked });
});

// POST /api/activities/:id/comment
export const commentActivity = asyncHandler(async (req: any, res: Response) => {
  const db = admin.firestore();
  const uid = req.user?.firebaseUid || req.user?.id;
  const activityId = req.params.id;
  const { text } = req.body;

  if (!uid) {
    return sendResponse(res, 401, false, 'Unauthorized');
  }
  if (!text) {
    return sendResponse(res, 400, false, 'Comment text is required');
  }

  const docRef = db.collection('activities').doc(activityId);
  const doc = await docRef.get();

  if (!doc.exists) {
    return sendResponse(res, 404, false, 'Activity not found');
  }

  const data = doc.data() || {};
  const comments = data.comments || [];
  
  // Get user info for real-time broadcast payload
  const userDoc = await db.collection('users').doc(uid).get();
  const userData = userDoc.data() || {};
  
  const newComment = {
    id: `c_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    text,
    userId: uid,
    timestamp: new Date().toISOString(),
    author: {
      name: userData.name || 'Google User',
      avatar: userData.avatar || userData.photoURL || '',
      headline: userData.headline || userData.department || ''
    }
  };
  
  comments.push(newComment);
  const commentsCount = comments.length;
  
  await docRef.update({ comments, commentsCount });
  
  try {
    const { io } = require('../server');
    io.emit('activity_commented', { activityId, comment: newComment, commentsCount });
  } catch (err) {
    console.error('Socket io emit error', err);
  }

  return sendResponse(res, 200, true, 'Comment added successfully', { comment: newComment, commentsCount });
});
