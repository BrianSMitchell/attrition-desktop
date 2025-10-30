import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { supabase } from '../config/supabase';
import { DB_TABLES, DB_FIELDS } from '../constants/database-fields';
import { HTTP_STATUS, RESPONSE_FORMAT } from '../constants/response-formats';

const router = express.Router();

// Get message summary (unread count, etc.)
router.get('/summary', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = (req.user as any)?._id || (req.user as any)?.id || (req.user as any)?.userId;
  const uid = String(userId);

  // Perform counts using Supabase exact counts (head requests to avoid payloads)
  const [inboxRes, sentRes, unreadRes] = await Promise.all([
    supabase
      .from(DB_TABLES.MESSAGES)
      .select('*', { count: 'exact', head: true })
      .eq('to_user_id', uid),
    supabase
      .from(DB_TABLES.MESSAGES)
      .select('*', { count: 'exact', head: true })
      .eq('from_user_id', uid),
    supabase
      .from(DB_TABLES.MESSAGES)
      .select('*', { count: 'exact', head: true })
      .eq('to_user_id', uid)
      .eq('is_read', false),
  ]);

  const inboxCount = inboxRes.error ? 0 : (inboxRes.count ?? 0);
  const sentCount = sentRes.error ? 0 : (sentRes.count ?? 0);
  const unreadMessages = unreadRes.error ? 0 : (unreadRes.count ?? 0);
  const totalMessages = inboxCount + sentCount;

  if (inboxRes.error || sentRes.error || unreadRes.error) {
    // Log minimal error context; return what we have
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: { totalMessages, unreadMessages, inboxCount, sentCount },
      warnings: [
        inboxRes.error?.message,
        sentRes.error?.message,
        unreadRes.error?.message,
      ].filter(Boolean),
    });
  }

  return res.json({
    success: true,
    data: { totalMessages, unreadMessages, inboxCount, sentCount }
  });
}));

// Get inbox messages
router.get('/inbox', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50); // Max 50 per page
  const offset = (page - 1) * limit;
  const uid = String(userId);

  // Get paginated messages
  const { data: messages, error: messagesError } = await supabase
    .from(DB_TABLES.MESSAGES)
    .select('*')
    .eq('to_user_id', uid)
    .order(DB_FIELDS.BUILDINGS.CREATED_AT, { ascending: false })
    .range(offset, offset + limit - 1);

  if (messagesError) {
    console.error('Error fetching inbox messages:', messagesError);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Failed to fetch inbox messages'
    });
  }

  // Get total count
  const { count: totalCount, error: countError } = await supabase
    .from(DB_TABLES.MESSAGES)
    .select('*', { count: 'exact', head: true })
    .eq('to_user_id', uid);

  if (countError) {
    console.error('Error counting inbox messages:', countError);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Failed to count inbox messages'
    });
  }

  const totalPages = Math.ceil((totalCount || 0) / limit);

  return res.json({
    success: true,
    data: {
      messages: messages || [],
      totalPages
    }
  });
}));

// Get sent messages
router.get('/sent', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50); // Max 50 per page
  const offset = (page - 1) * limit;
  const uid = String(userId);

  // Get paginated messages
  const { data: messages, error: messagesError } = await supabase
    .from(DB_TABLES.MESSAGES)
    .select('*')
    .eq('from_user_id', uid)
    .order(DB_FIELDS.BUILDINGS.CREATED_AT, { ascending: false })
    .range(offset, offset + limit - 1);

  if (messagesError) {
    console.error('Error fetching sent messages:', messagesError);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Failed to fetch sent messages'
    });
  }

  // Get total count
  const { count: totalCount, error: countError } = await supabase
    .from(DB_TABLES.MESSAGES)
    .select('*', { count: 'exact', head: true })
    .eq('from_user_id', uid);

  if (countError) {
    console.error('Error counting sent messages:', countError);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Failed to count sent messages'
    });
  }

  const totalPages = Math.ceil((totalCount || 0) / limit);

  return res.json({
    success: true,
    data: {
      messages: messages || [],
      totalPages
    }
  });
}));

// Get message by ID
router.get('/:messageId', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const messageId = req.params.messageId;
  const uid = String(userId);

  // Basic UUID validation (Supabase uses UUID for IDs)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(messageId)) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      code: 'INVALID_MESSAGE_ID',
      message: 'Invalid message ID format'
    });
  }

  // Get message with authorization check
  const { data: message, error } = await supabase
    .from(DB_TABLES.MESSAGES)
    .select('*')
    .eq(DB_FIELDS.BUILDINGS.ID, messageId)
    .or(`from_user_id.eq.${uid},to_user_id.eq.${uid}`)
    .maybeSingle();

  if (error) {
    console.error('Error fetching message by ID:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Failed to fetch message'
    });
  }

  if (!message) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      code: 'MESSAGE_NOT_FOUND',
      message: 'Message not found'
    });
  }

  return res.json({
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
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      code: 'MISSING_FIELDS',
      message: 'Missing required fields: toUsername, subject, content'
    });
  }

  if (subject.length > 200) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      code: 'SUBJECT_TOO_LONG',
      message: 'Subject must be 200 characters or less'
    });
  }

  if (content.length > 2000) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      code: 'CONTENT_TOO_LONG',
      message: 'Content must be 2000 characters or less'
    });
  }

  const uid = String(userId);

  // Find sender
  const { data: sender, error: senderError } = await supabase
    .from(DB_TABLES.USERS)
    .select('id, username')
    .eq(DB_FIELDS.BUILDINGS.ID, uid)
    .maybeSingle();

  if (senderError || !sender) {
    console.error('Error finding sender:', senderError);
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      code: 'SENDER_NOT_FOUND',
      message: 'Sender not found'
    });
  }

  // Find sender's empire
  const { data: senderEmpire } = await supabase
    .from(DB_TABLES.EMPIRES)
    .select('id, name')
    .eq(DB_FIELDS.EMPIRES.USER_ID, uid)
    .maybeSingle();

  // Find recipient
  const { data: recipient, error: recipientError } = await supabase
    .from(DB_TABLES.USERS)
    .select('id, username')
    .eq(DB_FIELDS.USERS.USERNAME, toUsername)
    .maybeSingle();

  if (recipientError || !recipient) {
    console.error('Error finding recipient:', recipientError);
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      code: 'RECIPIENT_NOT_FOUND',
      message: 'Recipient not found'
    });
  }

  // Find recipient's empire
  const { data: recipientEmpire } = await supabase
    .from(DB_TABLES.EMPIRES)
    .select('id, name')
    .eq(DB_FIELDS.EMPIRES.USER_ID, String(recipient.id))
    .maybeSingle();

  // Create message
  const { data: message, error: messageError } = await supabase
    .from(DB_TABLES.MESSAGES)
    .insert({
      from_user_id: sender.id,
      to_user_id: recipient.id,
      from_username: sender.username,
      to_username: recipient.username,
      from_empire_name: senderEmpire?.name || null,
      to_empire_name: recipientEmpire?.name || null,
      subject: subject.trim(),
      content: content.trim(),
      is_read: false,
      created_at: new Date().toISOString()
    })
    .select('*')
    .single();

  if (messageError) {
    console.error('Error creating message:', messageError);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Failed to create message'
    });
  }

  return res.status(HTTP_STATUS.CREATED).json({
    success: true,
    data: message
  });
}));

// Mark message as read
router.patch('/:messageId/read', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const messageId = req.params.messageId;
  const uid = String(userId);

  // Basic UUID validation (Supabase uses UUID for IDs)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(messageId)) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      code: 'INVALID_MESSAGE_ID',
      message: 'Invalid message ID format'
    });
  }

  // Update message to mark as read (only if user is recipient)
  const { data, error } = await supabase
    .from(DB_TABLES.MESSAGES)
    .update({ is_read: true })
    .eq(DB_FIELDS.BUILDINGS.ID, messageId)
    .eq('to_user_id', uid) // Only recipient can mark as read
    .select(DB_FIELDS.BUILDINGS.ID)
    .single();

  if (error) {
    console.error('Error marking message as read:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Failed to mark message as read'
    });
  }

  if (!data) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      code: 'MESSAGE_NOT_FOUND',
      message: 'Message not found or not authorized'
    });
  }

  return res.json({
    success: true,
    message: 'Message marked as read'
  });
}));

// Mark all messages as read
router.patch('/mark-all-read', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const uid = String(userId);

  // Update all messages for this user as read
  const { error } = await supabase
    .from(DB_TABLES.MESSAGES)
    .update({ is_read: true })
    .eq('to_user_id', uid);

  if (error) {
    console.error('Error marking all messages as read:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Failed to mark all messages as read'
    });
  }

  return res.json({
    success: true,
    message: 'All messages marked as read'
  });
}));

// Delete a message
router.delete('/:messageId', authenticate, asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const messageId = req.params.messageId;
  const uid = String(userId);

  // Basic UUID validation (Supabase uses UUID for IDs)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(messageId)) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      code: 'INVALID_MESSAGE_ID',
      message: 'Invalid message ID format'
    });
  }

  // Delete message (only if user is sender or recipient)
  const { data, error } = await supabase
    .from(DB_TABLES.MESSAGES)
    .delete()
    .eq(DB_FIELDS.BUILDINGS.ID, messageId)
    .or(`from_user_id.eq.${uid},to_user_id.eq.${uid}`)
    .select(DB_FIELDS.BUILDINGS.ID)
    .single();

  if (error) {
    console.error('Error deleting message:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Failed to delete message'
    });
  }

  if (!data) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      success: false,
      code: 'MESSAGE_NOT_FOUND',
      message: 'Message not found or not authorized'
    });
  }

  return res.json({
    success: true,
    message: 'Message deleted'
  });
}));

export default router;

