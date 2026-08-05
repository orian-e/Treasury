import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcryptjs";
import logger from "../utils/logger";

export interface IUser extends Document {
  name: string;
  email?: string;
  passwordHash?: string;
  isAdmin: boolean;
  groupIds: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
  comparePassword(password: string): Promise<boolean>;
}

const UserSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, unique: true, trim: true, sparse: true },
    passwordHash: { type: String },
    isAdmin: { type: Boolean, default: false },
    groupIds: [{ type: Schema.Types.ObjectId, ref: "Group" }],
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
UserSchema.pre('save', async function() {
  const user = this as any;

 // Only hash if passwordHash exists AND was modified
  if (!user.passwordHash || !user.isModified('passwordHash')) return;

  try {
    user.passwordHash = await bcrypt.hash(user.passwordHash, 10);
  } catch (error) {
    logger.error('Password hashing error:', error);
    throw error instanceof Error ? error : new Error('Password hashing failed');
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function(password: string): Promise<boolean> {
  const user = this as any;
  
  if (!user.passwordHash) {
    logger.warn('No password hash found for user');
    return false;
  }
  
  try {
    return await bcrypt.compare(password, user.passwordHash);
  } catch (error) {
    logger.error('Password comparison error:', error);
    return false;
  }
};

export default mongoose.model<IUser>("User", UserSchema);