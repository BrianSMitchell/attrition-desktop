import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import { User as IUser } from '@game/shared';

export interface UserDocument extends Document {
  email: string;
  username: string;
  passwordHash: string;
  role: 'user' | 'admin';
  gameProfile: {
    empireId?: string;
    credits: number;
    experience: number;
    startingCoordinate?: string;
  };
  lastLogin: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<UserDocument>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20
  },
  passwordHash: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  gameProfile: {
    empireId: {
      type: String
    },
    credits: {
      type: Number,
      default: 100
    },
    experience: {
      type: Number,
      default: 0
    },
    startingCoordinate: {
      type: String,
      default: null,
      match: /^[A-Z]\d{2}:\d{2}:\d{2}:\d{2}$/
    }
  },
  lastLogin: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

 // Indexes are implicitly created by 'unique: true' on email and username.
 // Avoid adding duplicate schema indexes to prevent Mongoose duplicate index warnings.

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.passwordHash;
  return userObject;
};

export const User = mongoose.model<UserDocument>('User', userSchema);
