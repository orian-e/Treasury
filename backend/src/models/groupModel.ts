import mongoose, { Schema, Document } from "mongoose";
import crypto from "crypto";

export interface IGroup extends Document {
  name: string;
  description?: string;
  creatorId: mongoose.Types.ObjectId;
  inviteCode?: string;
  createdAt: Date;
  updatedAt: Date;
  generateInviteCode(): string; 
}

const GroupSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    creatorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    inviteCode: { type: String, unique: true, sparse: true },
  },
  {
    timestamps: true,
  }
);

// Generate unique invite code
GroupSchema.methods.generateInviteCode = function(): string {
  if (!(this as any).inviteCode) {
    (this as any).inviteCode = crypto.randomBytes(8).toString("hex").toUpperCase();
  }
  return (this as any).inviteCode;
};

export default mongoose.model<IGroup>("Group", GroupSchema);
