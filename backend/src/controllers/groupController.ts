import { Request, Response } from "express";
import Group, { IGroup } from "../models/groupModel";
import User from "../models/usersModel";
import Expense from "../models/expenseModel";
import logger from "../utils/logger";
import mongoose from "mongoose";

class GroupController {
  // Create a new group (account users only)
  async createGroup(req: Request, res: Response) {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const { name, description } = req.body;
      const userId = (req as any).userId; // From auth middleware

      if (!name) {
        await session.abortTransaction();
        return res.status(400).json({ error: "Group name is required" });
      }

      // Verify user is an account user (has email)
      const user = await User.findById(userId).session(session);
      if (!user || !user.email) {
        await session.abortTransaction();
        return res
          .status(403)
          .json({ error: "Only account users can create groups" });
      }

      const group = new Group({
        name,
        description,
        creatorId: userId,
      });

      await group.save({ session });

      // Add group to user's groupIds
      await User.findByIdAndUpdate(
        userId,
        {
          $addToSet: { groupIds: group._id },
        },
        { session }
      );

      await session.commitTransaction();

      const obj = group.toObject() as any;
      obj.id = obj._id;
      delete obj._id;

      res.status(201).json(obj);
    } catch (err: any) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      res.status(500).json({ error: "Internal server error" });
    } finally {
      session.endSession();
    }
  }

  // Join group by invite code (account users only)
  async joinGroup(req: Request, res: Response) {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const { inviteCode } = req.body;
      const userId = (req as any).userId;

      if (!inviteCode) {
        await session.abortTransaction();
        return res.status(400).json({ error: "Invite code is required" });
      }

      // Verify user is an account user (has email)
      const user = await User.findById(userId).session(session);
      if (!user || !user.email) {
        await session.abortTransaction();
        return res.status(403).json({
          error: "Only account users can join groups with invite codes",
        });
      }

      const group = await Group.findOne({ inviteCode }).session(session);
      if (!group) {
        await session.abortTransaction();
        return res.status(404).json({ error: "Invalid invite code" });
      }

      // Check if user is already in this group
      if (user.groupIds.includes(group._id)) {
        await session.abortTransaction();
        return res
          .status(400)
          .json({ error: "You are already a member of this group" });
      }

      // Add group to user's groupIds
      await User.findByIdAndUpdate(
        userId,
        {
          $addToSet: { groupIds: group._id },
        },
        { session }
      );

      await session.commitTransaction();
      res.json({ message: "Successfully joined group", group });
    } catch (err: any) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      res.status(500).json({ error: "Internal server error" });
    } finally {
      session.endSession();
    }
  }

  // Get user's groups (account users only)
  async getUserGroups(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;

      // Verify user is an account user
      const user = await User.findById(userId);
      if (!user || !user.email) {
        return res
          .status(403)
          .json({ error: "Only account users have groups" });
      }

      const groups = await Group.find({
        _id: { $in: user.groupIds || [] },
      }).populate("creatorId", "name email");

      // Transform _id to id for each group (same as for users)
      const transformedGroups = groups.map((group) => {
        const obj = group.toObject() as any;
        obj.id = obj._id;
        delete obj._id;
        return obj;
      });

      res.json(transformedGroups);
    } catch (err: any) {
      res.status(500).json({ error: "Internal server error" });
    }
  }

  // Get group members (only for group members)
  async getGroupMembers(req: Request, res: Response) {
    try {
      const { groupId } = req.params;
      const userId = (req as any).userId;

      const user = await User.findById(userId);
      if (!user || !user.groupIds?.some((id) => id.toString() === groupId)) {
        return res
          .status(403)
          .json({ error: "You are not a member of this group" });
      }

      // Get all users in this group (both account and guest users)
      const members = await User.find({
        groupIds: groupId,
      }).select("name isAdmin");

      // Transform _id to id for consistency
      const result = members.map((member) => {
        const obj = member.toObject() as any;
        obj.id = obj._id;
        delete obj._id;
        return obj;
      });

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: "Internal server error" });
    }
  }

  // Leave group (account users only)
  async leaveGroup(req: Request, res: Response) {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const { groupId } = req.params;
      const userId = (req as any).userId;

      const group = await Group.findById(groupId).session(session);
      if (!group) {
        await session.abortTransaction();
        return res.status(404).json({ error: "Group not found" });
      }

      const user = await User.findById(userId).session(session);
      if (!user || !user.groupIds.some((id) => id.toString() === groupId)) {
        await session.abortTransaction();
        return res
          .status(403)
          .json({ error: "You are not a member of this group" });
      }

      // Check if user is admin
      if (group.creatorId.toString() === userId) {
        await session.abortTransaction();
        return res.status(400).json({
          error: "Creator cannot leave group. Transfer creator rights first.",
        });
      }

      // Remove group from user's groupIds
      await User.findByIdAndUpdate(
        userId,
        {
          $pull: { groupIds: groupId },
        },
        { session }
      );

      await session.commitTransaction();
      res.json({ message: "Successfully left group" });
    } catch (err: any) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      res.status(500).json({ error: "Internal server error" });
    } finally {
      session.endSession();
    }
  }

  // Invite user to group (generates shareable link)
  async getInviteInfo(req: Request, res: Response) {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const { groupId } = req.params;
      const userId = (req as any).userId;

      const group = (await Group.findById(groupId).session(session)) as IGroup;
      if (!group) {
        await session.abortTransaction();
        return res.status(404).json({ error: "Group not found" });
      }

      const user = await User.findById(userId).session(session);
      if (!user || !user.groupIds.some((id) => id.toString() === groupId)) {
        await session.abortTransaction();
        return res
          .status(403)
          .json({ error: "You are not a member of this group" });
      }

      // Generate invite code only when needed
      const inviteCode = group.generateInviteCode();
      await group.save({ session });

      await session.commitTransaction();

      res.json({
        groupName: group.name,
        inviteCode: inviteCode,
        inviteMessage: `Join "${group.name}" group using invite code: ${inviteCode}`,
      });
    } catch (err: any) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      res.status(500).json({ error: "Internal server error" });
    } finally {
      session.endSession();
    }
  }

  // Rotate invite code — invalidates the old code immediately
  async rotateInviteCode(req: Request, res: Response) {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const { groupId } = req.params;
      const userId = (req as any).userId;

      const group = (await Group.findById(groupId).session(session)) as IGroup;
      if (!group) {
        await session.abortTransaction();
        return res.status(404).json({ error: "Group not found" });
      }

      if (!group.creatorId || group.creatorId.toString() !== userId) {
        await session.abortTransaction();
        return res.status(403).json({ error: "Only the group creator can rotate the invite code" });
      }

      (group as any).inviteCode = undefined;
      const newCode = group.generateInviteCode();
      await group.save({ session });

      await session.commitTransaction();
      res.json({ inviteCode: newCode });
    } catch (err: any) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      res.status(500).json({ error: "Internal server error" });
    } finally {
      session.endSession();
    }
  }

  async updateGroup(req: Request, res: Response) {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const { groupId } = req.params;
      const { name, description } = req.body;
      const userId = (req as any).userId;

      const group = await Group.findById(groupId).session(session);
      if (!group) {
        await session.abortTransaction();
        return res.status(404).json({ error: "Group not found" });
      }

      // Check if user is the creator of the group
      if (group.creatorId.toString() !== userId) {
        await session.abortTransaction();
        return res
          .status(403)
          .json({ error: "Only the creator can update group details" });
      }

      // Update group
      group.name = name || group.name;
      group.description = description || group.description;
      await group.save({ session });

      await session.commitTransaction();

      const obj = group.toObject() as any;
      obj.id = obj._id;
      delete obj._id;

      res.json(obj);
    } catch (err: any) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      res.status(500).json({ error: "Internal server error" });
    } finally {
      session.endSession();
    }
  }

  // Delete group completely (Admin only - nuclear option)
  async deleteGroup(req: Request, res: Response) {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const { groupId } = req.params;
      const userId = (req as any).userId;

      const group = await Group.findById(groupId).session(session);
      if (!group) {
        await session.abortTransaction();
        return res.status(404).json({ error: "Group not found" });
      }

      // Check if user is admin
      if (group.creatorId.toString() !== userId) {
        await session.abortTransaction();
        return res
          .status(403)
          .json({ error: "Only group creator can delete the group" });
      }

      // Get all expenses in this group
      const groupExpenses = await Expense.find({ groupId: groupId }).session(
        session
      );

      // Get all users in this group
      const groupUsers = await User.find({ groupIds: groupId }).session(
        session
      );

      logger.info(
        `🗑️ Deleting group "${group.name}" with ${groupExpenses.length} expenses and ${groupUsers.length} users`
      );

      // Delete all expenses in this group first
      await Expense.deleteMany({ groupId: groupId }, { session });

      // Remove group from all users' groupIds
      await User.updateMany(
        { groupIds: groupId },
        { $pull: { groupIds: groupId } },
        { session }
      );

      // Delete guest users who now have no groups
      const usersToCleanup = await User.find({
        email: { $exists: false }, // Guest users only
        groupIds: { $size: 0 }, // No groups left
      }).session(session);

      if (usersToCleanup.length > 0) {
        await User.deleteMany(
          {
            email: { $exists: false },
            groupIds: { $size: 0 },
          },
          { session }
        );
        logger.info(
          `🧹 Cleaned up ${usersToCleanup.length} orphaned guest users`
        );
      }

      // Finally delete the group
      await Group.findByIdAndDelete(groupId).session(session);

      await session.commitTransaction();

      res.json({
        message: "Group deleted successfully",
        deletedExpenses: groupExpenses.length,
        cleanedUpUsers: usersToCleanup.length,
      });
    } catch (err: any) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      logger.error("❌ Delete group error:", err);
      res.status(500).json({ error: "Internal server error" });
    } finally {
      session.endSession();
    }
  }
}

export default GroupController;
