import { Request, Response } from "express";
import User from "../models/usersModel";
import Group from "../models/groupModel";
import Expense from "../models/expenseModel";
import logger from "../utils/logger";
import mongoose from "mongoose";

class UserController {
  // Create guest user (name + auto-assign to user's group)
  async createUser(req: Request, res: Response) {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const { name, groupId } = req.body;
      const requesterId = (req as any).userId;

      if (!name || !name.trim()) {
        await session.abortTransaction();
        return res.status(400).json({ error: "Name is required" });
      }

      if (!groupId) {
        await session.abortTransaction();
        return res.status(400).json({
          error: "Group ID is required. Please create or select a group first.",
        });
      }

      const requester = await User.findById(requesterId).session(session);
      if (!requester) {
        await session.abortTransaction();
        return res.status(401).json({ error: "User not found" });
      }

      if (!requester.groupIds?.includes(groupId)) {
        await session.abortTransaction();
        return res
          .status(403)
          .json({ error: "You are not a member of this group" });
      }

      // Check if name already exists in this specific group
      const existingUser = await User.findOne({
        name: name.trim(),
        groupIds: groupId,
      }).session(session);

      if (existingUser) {
        await session.abortTransaction();
        return res.status(400).json({
          error: "User with this name already exists in this group",
        });
      }

      const userData = {
        name: name.trim(),
        groupIds: [groupId],
      };

      const user = new User(userData);
      const saved = await user.save({ session });

      await session.commitTransaction();

      const obj = saved.toObject() as any;
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

  // Get users (show users in same groups)
  async getUsers(req: Request, res: Response) {
    try {
      const requesterId = (req as any).userId;
      const currentUser = await User.findById(requesterId);

      if (!currentUser) {
        return res.status(401).json({ error: "User not found" });
      }

      // If user has no groups, return empty array
      if (!currentUser.groupIds || currentUser.groupIds.length === 0) {
        return res.json([]);
      }

      // Show users in same groups
      const users = await User.find({
        groupIds: { $in: currentUser.groupIds },
      })
        .select("name email isAdmin groupIds")
        .sort({ name: 1 });

      const result = users.map((u) => {
        const obj = u.toObject() as any;
        obj.id = obj._id;
        delete obj._id;
        return obj;
      });

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: "Internal server error" });
    }
  }

  // Update user (simple: just check same group)
  async updateUser(req: Request, res: Response) {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const { name } = req.body;
      const requesterId = (req as any).userId;
      const userId = req.params.id;

      if (!name || !name.trim()) {
        await session.abortTransaction();
        return res.status(400).json({ error: "Name is required" });
      }

      if (!requesterId) {
        await session.abortTransaction();
        return res.status(401).json({ error: "Please log in" });
      }

      const userToUpdate = await User.findById(userId).session(session);
      if (!userToUpdate) {
        await session.abortTransaction();
        return res.status(404).json({ error: "User not found" });
      }

      // Don't allow updating account users (those with email)
      if (userToUpdate.email) {
        await session.abortTransaction();
        return res.status(403).json({
          error: "Cannot edit account users",
        });
      }

      const updated = await User.findByIdAndUpdate(
        userId,
        { name: name.trim() },
        { new: true, session }
      );

      await session.commitTransaction();

      const obj = updated!.toObject() as any;
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

  // Delete user: check for expenses, deletion and removal from group
  async deleteUser(req: Request, res: Response) {
    try {
      const requesterId = (req as any).userId;
      const userId = req.params.id;
      const { groupId } = req.body; // Optional: if provided, remove from specific group only

      if (!requesterId) {
        return res.status(401).json({ error: "Please log in" });
      }

      const userToDelete = await User.findById(userId);
      if (!userToDelete) {
        return res.status(404).json({ error: "User not found" });
      }

      const requester = await User.findById(requesterId);
      if (!requester) {
        return res.status(401).json({ error: "Requester not found" });
      }

      // **CASE 1: Remove from specific group (group removal)**
      if (groupId) {
        return this.removeUserFromGroup(
          req,
          res,
          userToDelete,
          requester,
          groupId
        );
      }

      // **CASE 2: Complete deletion attempts**

      // Block deletion of account users (registered members)
      if (userToDelete.email) {
        return res.status(403).json({
          error: `Cannot delete "${userToDelete.name}" because they are a registered account user. Only guest users can be deleted completely.`,
        });
      }

      // For guest users - only group creators can delete them completely
      // Check if requester is creator of ANY group that contains this guest user
      const userGroups = userToDelete.groupIds || [];
      const requesterGroups = await Group.find({
        _id: { $in: userGroups },
        creatorId: requesterId,
      });

      if (requesterGroups.length === 0) {
        return res.status(403).json({
          error: `You can only delete guest users from groups you created. "${userToDelete.name}" is not in any of your groups, or you are not the creator.`,
        });
      }

      // When admin features are implemented, add:
      // if (requester.isAdmin) {
      //   return this.adminDeleteUser(userId);
      // }

      // Proceed with complete deletion of guest user
      return this.completeUserDeletion(req, res, userToDelete, requesterId);
    } catch (err: any) {
      res.status(500).json({ error: "Internal server error" });
    }
  }

  // Helper: Remove user from specific group only
  private async removeUserFromGroup(
    req: Request,
    res: Response,
    userToDelete: any,
    requester: any,
    groupId: string
  ) {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      // Verify requester is creator of the specific group
      const group = await Group.findById(groupId).session(session);
      if (!group) {
        await session.abortTransaction();
        return res.status(404).json({ error: "Group not found" });
      }

      if (group.creatorId.toString() !== requester._id.toString()) {
        await session.abortTransaction();
        return res.status(403).json({
          error: "Only group creator can remove users from group",
        });
      }

      // Check user's expenses in this specific group
      const userExpenses = await Expense.find({
        $and: [
          { groupId: groupId },
          {
            $or: [
              { payerId: userToDelete._id },
              { "splits.userId": userToDelete._id },
            ],
          },
        ],
      }).session(session);

      if (userExpenses.length > 0) {
        const balances = await this.calculateUserBalances(
          userToDelete._id.toString(),
          groupId,
          session
        );

        // Check if user is settled in ALL currencies
        const unsettledCurrencies = Object.entries(balances)
          .filter(([currency, balance]) => Math.abs(balance) > 0.01)
          .map(([currency, balance]) => `${currency}: ${balance.toFixed(2)}`);

        if (unsettledCurrencies.length > 0) {
          await session.abortTransaction();
          return res.status(400).json({
            error: `Cannot remove "${
              userToDelete.name
            }" because they have unsettled expenses in: ${unsettledCurrencies.join(
              ", "
            )}`,
            balances: balances,
            expenseCount: userExpenses.length,
          });
        }

        // All currencies settled - allow removal with history
        // Remove group from user's groupIds
        await User.findByIdAndUpdate(
          userToDelete._id,
          { $pull: { groupIds: groupId } },
          { session }
        );

        // If guest user has no more groups, delete them entirely (cleanup)
        const updatedUser = await User.findById(userToDelete._id).session(
          session
        );
        if (!updatedUser?.groupIds?.length && !updatedUser?.email) {
          await User.findByIdAndDelete(userToDelete._id).session(session);
        }

        await session.commitTransaction();
        return res.status(200).json({
          message: `User "${userToDelete.name}" removed from group. Expense history preserved.`,
          preservedExpenses: true,
          expenseCount: userExpenses.length,
          balances: balances,
        });
      }

      // Clean removal - no expenses
      await User.findByIdAndUpdate(
        userToDelete._id,
        { $pull: { groupIds: groupId } },
        { session }
      );

      // Cleanup guest users with no groups
      const updatedUser = await User.findById(userToDelete._id).session(
        session
      );
      if (!updatedUser?.groupIds?.length && !updatedUser?.email) {
        await User.findByIdAndDelete(userToDelete._id).session(session);
      }

      await session.commitTransaction();
      return res.status(204).send(); // Clean removal
    } catch (err: any) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      throw err;
    } finally {
      session.endSession();
    }
  }

  // Helper: Complete deletion of user (preserves expense history)
  private async completeUserDeletion(
    req: Request,
    res: Response,
    userToDelete: any,
    requesterId: string
  ) {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      // **PRESERVE EXPENSE HISTORY**: Don't delete expenses, just mark user as deleted
      // Update all expenses to replace user references with a "deleted user" marker
      await Expense.updateMany(
        { payerId: userToDelete._id },
        {
          payerId: null,
          payerName: `${userToDelete.name} (deleted)`, // Add this field to preserve name
        },
        { session }
      );

      await Expense.updateMany(
        { "splits.userId": userToDelete._id },
        {
          $set: {
            "splits.$[elem].userId": null,
            "splits.$[elem].userName": `${userToDelete.name} (deleted)`,
          },
        },
        {
          arrayFilters: [{ "elem.userId": userToDelete._id }],
          session,
        }
      );

      // Remove user from all groups
      await User.updateMany(
        { groupIds: userToDelete._id },
        { $pull: { groupIds: userToDelete._id } },
        { session }
      );

      // Delete the user
      await User.findByIdAndDelete(userToDelete._id).session(session);

      await session.commitTransaction();

      return res.status(200).json({
        message: `User "${userToDelete.name}" deleted completely. Expense history preserved.`,
        preservedExpenses: true,
      });
    } catch (err: any) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      throw err;
    } finally {
      session.endSession();
    }
  }

  // Calculate user balance for a specific group
  private async calculateUserBalance(
    userId: string,
    groupId: string,
    session: any
  ): Promise<number> {
    const expenses = await Expense.find({
      groupId: groupId,
      $or: [{ payerId: userId }, { "splits.userId": userId }],
    }).session(session);

    let balance = 0;

    expenses.forEach((expense) => {
      // User paid for this expense
      if (expense.payerId?.toString() === userId) {
        balance += expense.amount;
      }

      // User owes money for this expense
      const userSplit = expense.splits.find(
        (split) => split.userId?.toString() === userId
      );
      if (userSplit) {
        balance -= userSplit.amount;
      }
    });

    return Math.round(balance * 100) / 100; // Round to 2 decimal places
  }

  private async calculateUserBalances(
    userId: string,
    groupId: string,
    session: any
  ): Promise<Record<string, number>> {
    const expenses = await Expense.find({
      groupId: groupId,
      $or: [{ payerId: userId }, { "splits.userId": userId }],
    }).session(session);

    const balances: Record<string, number> = {};

    expenses.forEach((expense) => {
      const currency = expense.currency || "EUR";
      if (!balances[currency]) balances[currency] = 0;

      if (expense.payerId?.toString() === userId) {
        balances[currency] += expense.amount;
      }

      const userSplit = expense.splits.find(
        (split) => split.userId?.toString() === userId
      );
      if (userSplit) {
        balances[currency] -= userSplit.amount;
      }
    });

    return balances;
  }
}

export default UserController;
