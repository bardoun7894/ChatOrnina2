import { Schema } from 'mongoose';
import { SystemRoles } from 'librechat-data-provider';
import { IUser } from '~/types';

// Session sub-schema
const SessionSchema = new Schema(
  {
    refreshToken: {
      type: String,
      default: '',
    },
  },
  { _id: false },
);

// Backup code sub-schema
const BackupCodeSchema = new Schema(
  {
    codeHash: { type: String, required: true },
    used: { type: Boolean, default: false },
    usedAt: { type: Date, default: null },
  },
  { _id: false },
);

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
    },
    username: {
      type: String,
      lowercase: true,
      default: '',
    },
    email: {
      type: String,
      required: [true, "can't be blank"],
      lowercase: true,
      unique: true,
      match: [/\S+@\S+\.\S+/, 'is invalid'],
      index: true,
    },
    emailVerified: {
      type: Boolean,
      required: true,
      default: false,
    },
    password: {
      type: String,
      trim: true,
      minlength: 8,
      maxlength: 128,
      select: false,
    },
    avatar: {
      type: String,
      required: false,
    },
    provider: {
      type: String,
      required: true,
      default: 'local',
    },
    role: {
      type: String,
      default: SystemRoles.USER,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    githubId: {
      type: String,
      unique: true,
      sparse: true,
    },
    plugins: {
      type: Array,
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    totpSecret: {
      type: String,
      select: false,
    },
    backupCodes: {
      type: [BackupCodeSchema],
      select: false,
    },
    refreshToken: {
      type: [SessionSchema],
    },
    expiresAt: {
      type: Date,
      expires: 604800, // 7 days in seconds
    },
    termsAccepted: {
      type: Boolean,
      default: false,
    },
    personalization: {
      type: {
        memories: {
          type: Boolean,
          default: true,
        },
      },
      default: {},
    },
    /** Field for external source identification (for consistency with TPrincipal schema) */
    idOnTheSource: {
      type: String,
      sparse: true,
    },
    /** Subscription and billing fields for SaaS platform */
    subscriptionTier: {
      type: String,
      enum: ['free', 'basic', 'pro', 'enterprise'],
      default: 'free',
    },
    subscriptionStatus: {
      type: String,
      enum: ['active', 'canceled', 'past_due', 'trialing', 'inactive'],
      default: 'inactive',
    },
    subscriptionStartDate: {
      type: Date,
    },
    subscriptionEndDate: {
      type: Date,
    },
    stripeCustomerId: {
      type: String,
      sparse: true,
    },
    stripeSubscriptionId: {
      type: String,
      sparse: true,
    },
    /** Usage tracking for quota management */
    usageQuota: {
      type: {
        messages: { type: Number, default: 0 },
        images: { type: Number, default: 0 },
        videos: { type: Number, default: 0 },
        codeGenerations: { type: Number, default: 0 },
        designAnalyses: { type: Number, default: 0 },
      },
      default: {},
    },
    usageCount: {
      type: {
        messages: { type: Number, default: 0 },
        images: { type: Number, default: 0 },
        videos: { type: Number, default: 0 },
        codeGenerations: { type: Number, default: 0 },
        designAnalyses: { type: Number, default: 0 },
        lastReset: { type: Date, default: Date.now },
      },
      default: {},
    },
  },
  { timestamps: true },
);

export default userSchema;
