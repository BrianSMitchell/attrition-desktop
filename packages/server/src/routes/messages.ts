import express from 'express';
import { authenticate } from '../middleware/auth';
import { Request, Response, NextFunction } from 'express';

interface AuthRequest extends Request {
  user?: any;
}
import { asyncHandler } from '../middleware/errorHandler';
import { Message } from '../models/Message';
import { User } from '../models/User';
import { Empire } from '../models/Empire';
import mongoose from 'mongoose';
import { getDatabaseType } from '../config/database';
import { supabase } from '../config/supabase';

const router = express.Router();

// Get message summary (unread count, etc.)
router.get('/summary', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = (req.user as any)?._id || (req.user as any)?.id || (req.user as any)?.userId;

  if (getDatabaseType() === 'supabase') {
    // Temporary implementation for production: return zeros until message schema is finalized
    // TODO: replace with Supabase count queries when message schema is confirmed
    return res.json({
      success: true,
      data: {
        totalMessages: 0,
        unreadMessages: 0,
        inboxCount: 0,
        sentCount: 0,
      }
    });
  }

  // MongoDB path
  // Count total messages
  const totalMessages = await Message.countDocuments({
    $or: [
      { 'to._id': userId },
      { 'from._id': userId }
    ]
  });

  // Count unread messages in inbox
  const unreadMessages = await Message.countDocuments({
    'to._id': userId,
    isRead: false
  });

  // Count inbox messages
  const inboxCount = await Message.countDocuments({
    'to._id': userId
  });

  // Count sent messages
  const sentCount = await Message.countDocuments({
    'from._id': userId
  });

  res.json({
    success: true,
    data: {
      totalMessages,
      unreadMessages,
      inboxCount,
      sentCount
    }
  });
}));

// Get inbox messages
router.get('/inbox', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50); // Max 50 per page
  const skip = (page - 1) * limit;

  const messages = await Message.find({ 'to._id': userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const totalCount = await Message.countDocuments({ 'to._id': userId });
  const totalPages = Math.ceil(totalCount / limit);

  res.json({
    success: true,
    data: {
      messages,
      totalPages
    }
  });
}));

// Get sent messages
router.get('/sent', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50); // Max 50 per page
  const skip = (page - 1) * limit;

  const messages = await Message.find({ 'from._id': userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const totalCount = await Message.countDocuments({ 'from._id': userId });
  const totalPages = Math.ceil(totalCount / limit);

  res.json({
    success: true,
    data: {
      messages,
      totalPages
    }
  });
}));

// Get message by ID
router.get('/:messageId', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const messageId = req.params.messageId;

  if (!mongoose.Types.ObjectId.isValid(messageId)) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_MESSAGE_ID',
      message: 'Invalid message ID format'
    });
  }

  const message = await Message.findOne({
    _id: messageId,
    $or: [
      { 'to._id': userId },
      { 'from._id': userId }
    ]
  }).lean();

  if (!message) {
    return res.status(404).json({
      success: false,
      code: 'MESSAGE_NOT_FOUND',
      message: 'Message not found'
    });
  }

  res.json({
    success: true,
    data: message
  });
}));

// Send a new message
router.post('/', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const { toUsername, subject, content } = req.body;

  // Validation
  if (!toUsername || !subject || !content) {
    return res.status(400).json({
      success: false,
      code: 'MISSING_FIELDS',
      message: 'Missing required fields: toUsername, subject, content'
    });
  }

  if (subject.length > 200) {
    return res.status(400).json({
      success: false,
      code: 'SUBJECT_TOO_LONG',
      message: 'Subject must be 200 characters or less'
    });
  }

  if (content.length > 2000) {
    return res.status(400).json({
      success: false,
      code: 'CONTENT_TOO_LONG',
      message: 'Content must be 2000 characters or less'
    });
  }

  // Find sender
  const sender = await User.findById(userId).lean();
  if (!sender) {
    return res.status(400).json({
      success: false,
      code: 'SENDER_NOT_FOUND',
      message: 'Sender not found'
    });
  }

  // Find sender's empire
  const senderEmpire = await Empire.findOne({ owner: userId }).lean();

  // Find recipient
  const recipient = await User.findOne({ username: toUsername }).lean();
  if (!recipient) {
    return res.status(400).json({
      success: false,
      code: 'RECIPIENT_NOT_FOUND',
      message: 'Recipient not found'
    });
  }

  // Find recipient's empire
  const recipientEmpire = await Empire.findOne({ owner: recipient._id }).lean();

  // Create message
  const message = new Message({
    from: {
      _id: sender._id,
      username: sender.username,
      empireName: senderEmpire?.name
    },
    to: {
      _id: recipient._id,
      username: recipient.username,
      empireName: recipientEmpire?.name
    },
    subject: subject.trim(),
    content: content.trim(),
    isRead: false
  });

  await message.save();

  res.status(201).json({
    success: true,
    data: message
  });
}));

// Mark message as read
router.patch('/:messageId/read', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const messageId = req.params.messageId;

  if (!mongoose.Types.ObjectId.isValid(messageId)) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_MESSAGE_ID',
      message: 'Invalid message ID format'
    });
  }

  const result = await Message.updateOne(
    { 
      _id: messageId, 
      'to._id': userId // Only recipient can mark as read
    },
    { isRead: true }
  );

  if (result.matchedCount === 0) {
    return res.status(404).json({
      success: false,
      code: 'MESSAGE_NOT_FOUND',
      message: 'Message not found or not authorized'
    });
  }

  res.json({
    success: true,
    message: 'Message marked as read'
  });
}));

// Mark all messages as read
router.patch('/mark-all-read', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;

  await Message.updateMany(
    { 'to._id': userId },
    { isRead: true }
  );

  res.json({
    success: true,
    message: 'All messages marked as read'
  });
}));

// Delete a message
router.delete('/:messageId', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const messageId = req.params.messageId;

  if (!mongoose.Types.ObjectId.isValid(messageId)) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_MESSAGE_ID',
      message: 'Invalid message ID format'
    });
  }

  const result = await Message.deleteOne({
    _id: messageId,
    $or: [
      { 'to._id': userId },
      { 'from._id': userId }
    ]
  });

  if (result.deletedCount === 0) {
    return res.status(404).json({
      success: false,
      code: 'MESSAGE_NOT_FOUND',
      message: 'Message not found or not authorized'
    });
  }

  res.json({
    success: true,
    message: 'Message deleted'
  });
}));

export default router;
