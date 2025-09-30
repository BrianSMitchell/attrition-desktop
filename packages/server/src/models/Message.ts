import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  _id: string;
  from: {
    _id: string;
    username: string;
    empireName?: string;
  };
  to: {
    _id: string;
    username: string;
    empireName?: string;
  };
  subject: string;
  content: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema: Schema = new Schema({
  from: {
    _id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    empireName: { type: String }
  },
  to: {
    _id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    empireName: { type: String }
  },
  subject: {
    type: String,
    required: true,
    maxlength: 200,
    trim: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 2000,
    trim: true
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  collection: 'messages'
});

// Indexes for efficient querying
MessageSchema.index({ 'to._id': 1, createdAt: -1 }); // Inbox queries
MessageSchema.index({ 'from._id': 1, createdAt: -1 }); // Sentbox queries
MessageSchema.index({ 'to._id': 1, isRead: 1 }); // Unread message queries

export const Message = mongoose.model<IMessage>('Message', MessageSchema);
