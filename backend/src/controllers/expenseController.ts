import { Request, Response } from "express";
import mongoose from "mongoose";
import Expense, { IExpense, IPayerSplit, IExpenseSplit, IUserRef, UserOrId } from "../models/expenseModel";
import User from "../models/usersModel";

// Helper function to get user ID from UserOrId type
const getUserId = (user: UserOrId | null | undefined): string | null => {
  if (!user) return null;
  return typeof user === 'string' ? user : user._id?.toString() || null;
};

// Helper function to get user name from UserOrId type
const getUserName = (user: UserOrId | null | undefined, userMap: Map<string, string>): string => {
  if (!user) return 'Unknown';
  if (typeof user === 'string') return userMap.get(user) || 'Unknown';
  return (user as IUserRef).name || 'Unknown';
};

// Type guard to check if value is an object with _id property
const isUserRef = (value: any): value is IUserRef => {
  return value && typeof value === 'object' && '_id' in value;
};

interface IExpenseRequest extends Request {
  body: {
    description: string;
    amount: number;
    currency?: string;
    date?: Date;
    payerId?: string | null;
    payerName?: string;
    payers?: IPayerSplit[];
    splits: IExpenseSplit[];
    groupId: string;
    splitType?: "equal" | "percentage" | "custom";
  };
  params: {
    id?: string;
    groupId?: string;
  };
  query: {
    userId?: string;
    startDate?: string;
    endDate?: string;
  };
}

class ExpenseController {
  private validateExpense(expense: IExpenseRequest['body']): string | null {
    const { amount, splits = [], payers = [], splitType = 'equal' } = expense;

    // Validate amount
    if (typeof amount !== 'number' || amount <= 0) {
      return 'Amount must be a positive number';
    }

    // Handle backward compatibility: if no payers but payerId exists, create a payer entry
    const validatedPayers = [...payers];
    if ((!validatedPayers || validatedPayers.length === 0) && expense.payerId) {
      validatedPayers.push({
        userId: expense.payerId,
        userName: expense.payerName || '',
        amount: amount,
        type: 'custom' as const,
      });
    }

    // Validate payers
    if (!validatedPayers || validatedPayers.length === 0) {
      return 'At least one payer is required';
    }

    // Validate each payer
    const payerUserIds = new Set<string>();
    let totalPaid = 0;

    for (const payer of validatedPayers) {
      const userId = isUserRef(payer.userId) ? payer.userId._id?.toString() : payer.userId;
      if (!userId) {
        return 'Each payer must have a valid userId';
      }
      
      if (payerUserIds.has(userId)) {
        return `Duplicate payer ID found: ${userId}`;
      }
      payerUserIds.add(userId);

      if (typeof payer.amount !== 'number' || payer.amount < 0) {
        return `Invalid amount for payer ${userId}: must be a non-negative number`;
      }
      totalPaid += payer.amount;

      // Validate percentage if split type is percentage
      if (splitType === 'percentage' && (payer.percentage === undefined || payer.percentage < 0 || payer.percentage > 100)) {
        return `Invalid percentage for payer ${userId}: must be between 0 and 100`;
      }
    }

    // Validate total paid equals expense amount (with tolerance for floating point)
    const difference = Math.abs(totalPaid - amount);
    if (difference > 0.01) {
      return `Total paid by all payers (${totalPaid.toFixed(2)}) must equal expense amount (${amount.toFixed(2)})`;
    }

    // Validate splits
    if (splits.length === 0) {
      // If no splits, assume the payer is paying for themselves
      return null;
    }

    // Validate each split
    const splitUserIds = new Set<string>();
    let totalOwed = 0;

    for (const split of splits) {
      const userId = isUserRef(split.userId) ? split.userId._id?.toString() : split.userId;
      if (!userId) {
        return 'Each split must have a valid userId';
      }
      
      if (splitUserIds.has(userId)) {
        return `Duplicate user ID found in splits: ${userId}`;
      }
      splitUserIds.add(userId);

      if (typeof split.amount !== 'number' || split.amount < 0) {
        return `Invalid amount for user ${userId}: must be a non-negative number`;
      }
      totalOwed += split.amount;

      // Validate percentage if split type is percentage
      if (splitType === 'percentage' && (split.percentage === undefined || split.percentage < 0 || split.percentage > 100)) {
        return `Invalid percentage for user ${userId}: must be between 0 and 100`;
      }
    }

    // Validate total owed equals expense amount (with tolerance for floating point)
    const owedDifference = Math.abs(totalOwed - amount);
    if (owedDifference > 0.01) {
      return `Total owed by all participants (${totalOwed.toFixed(2)}) must equal expense amount (${amount.toFixed(2)})`;
    }

    // Validate percentage splits if type is percentage
    if (splitType === 'percentage') {
      const totalPercentage = splits.reduce(
        (sum: number, split: any) => sum + (split.percentage || 0),
        0
      );
      const percentageTolerance = 0.1; // Allow small floating point differences
      if (Math.abs(totalPercentage - 100) > percentageTolerance) {
        return `Percentage splits must total 100%, got ${totalPercentage.toFixed(2)}%`;
      }
    }

    return null;
  }

  async createExpense(req: IExpenseRequest, res: Response) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const { 
        description, 
        amount, 
        currency = 'EUR', 
        date = new Date(), 
        payerId, 
        payerName, 
        groupId, 
        splits = [], 
        payers = [],
        splitType = 'equal'
      } = req.body;

      // Basic validation
      if (!description || amount === undefined || !groupId) {
        await session.abortTransaction();
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Process payers - ensure we have at least one payer
      const finalPayers = payers.length > 0 ? [...payers] : [];
      if (finalPayers.length === 0 && payerId) {
        finalPayers.push({
          userId: payerId,
          userName: payerName || '',
          amount: amount,
          type: 'custom' as const,
        });
      }

      // Create expense object with all fields
      const expenseData: Partial<IExpense> = {
        description,
        amount,
        currency,
        date,
        groupId,
        splitType,
        // Backward compatibility
        ...(payerId && { payerId, payerName }),
        // New multipayer fields
        payers: finalPayers.length > 0 ? finalPayers : undefined,
        splits,
        createdBy: (req as any).userId,
      };

      // Validate the expense
      const validationError = this.validateExpense(expenseData as IExpenseRequest['body']);
      if (validationError) {
        await session.abortTransaction();
        return res.status(400).json({ error: validationError });
      }

      const expense = new Expense(expenseData);
      const saved = await expense.save({ session });

      // Populate user names for the response
      const populatedExpense = await Expense.populate(saved, [
        { path: 'payers.userId', select: 'name', model: 'User' },
        { path: 'splits.userId', select: 'name', model: 'User' },
      ]);

      // Convert to plain object and process
      const expenseObj = populatedExpense.toObject() as any;
      
      // Process payers with proper typing
      const processedPayers = (expenseObj.payers || []).map((payer: any) => {
        const userId = isUserRef(payer.userId) ? payer.userId._id?.toString() : payer.userId;
        return {
          ...payer,
          userId,
          userName: isUserRef(payer.userId) 
            ? payer.userId.name || payer.userName || 'Unknown'
            : payer.userName || 'Unknown'
        };
      });

      // Process splits with proper typing
      const processedSplits = (expenseObj.splits || []).map((split: any) => {
        const userId = isUserRef(split.userId) ? split.userId._id?.toString() : split.userId;
        return {
          ...split,
          userId,
          userName: isUserRef(split.userId)
            ? split.userId.name || split.userName || 'Unknown'
            : split.userName || 'Unknown'
        };
      });

      await session.commitTransaction();
      
      // Prepare response object
      const response = {
        ...expenseObj,
        id: expenseObj._id,
        payers: processedPayers,
        splits: processedSplits
      };
      
      delete (response as any)._id;
      res.status(201).json(response);
    } catch (err: any) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      res.status(500).json({ error: "Internal server error" });
    } finally {
      session.endSession();
    }
  }

  async getExpenses(req: Request, res: Response) {
    try {
      const requesterId = (req as any).userId; // From auth middleware

      if (!requesterId) {
        return res.status(401).json({ error: 'Please log in to view expenses' });
      }

      const currentUser = await User.findById(requesterId);
      if (!currentUser || !currentUser.groupIds?.length) {
        return res.json([]); // No expenses if no groups
      }

      // Get all users in the same groups
      const groupUsers = await User.find({
        groupIds: { $in: currentUser.groupIds },
      }).select('_id name');

      const userIds = groupUsers.map((u) => u._id.toString());
      const userMap = new Map(groupUsers.map(u => [u._id.toString(), u.name || 'Unknown']));

      // Find expenses where:
      // 1. The user is a payer (old or new format), OR
      // 2. The user is in the splits
      const expenses = await Expense.find({
        $or: [
          { payerId: { $in: userIds } },
          { 'payers.userId': { $in: userIds } },
          { 'splits.userId': { $in: userIds } },
        ],
      })
        .populate('payers.userId', 'name')
        .populate('splits.userId', 'name')
        .sort({ date: -1 }); // Newest first

      // Process expenses for the response
      const result = expenses.map((expense) => {
        const obj = expense.toObject() as any;
        
        // Set id field and remove _id for frontend
        const { _id, ...rest } = obj;
        const result: any = { ...rest, id: _id };

        // Ensure payers array exists for backward compatibility
        const payers = (result.payers && result.payers.length > 0) 
          ? result.payers 
          : [{
              userId: result.payerId,
              userName: result.payerName || userMap.get(result.payerId?.toString() || '') || 'Unknown',
              amount: result.amount,
              type: 'custom' as const,
            }];

        // Process payers with proper typing
        result.payers = payers.map((payer: any) => {
          const userId = isUserRef(payer.userId) ? payer.userId._id?.toString() : payer.userId;
          return {
            ...payer,
            userId,
            userName: isUserRef(payer.userId) 
              ? payer.userId.name || payer.userName || 'Unknown'
              : userMap.get(payer.userId) || payer.userName || 'Unknown'
          };
        });

        // Process splits with proper typing
        result.splits = (result.splits || []).map((split: any) => {
          const userId = isUserRef(split.userId) ? split.userId._id?.toString() : split.userId;
          return {
            ...split,
            userId,
            userName: isUserRef(split.userId)
              ? split.userId.name || split.userName || 'Unknown'
              : userMap.get(split.userId) || split.userName || 'Unknown'
          };
        });

        return result;
      });

      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  }

  async updateExpense(req: IExpenseRequest, res: Response) {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const { id } = req.params;
      const {
        description,
        amount,
        currency,
        date,
        payerId,
        payerName,
        groupId,
        splits,
        payers,
        splitType,
        ...otherFields
      } = req.body;

      // Get the existing expense first
      const existingExpense = await Expense.findById(id).session(session);
      if (!existingExpense) {
        await session.abortTransaction();
        return res.status(404).json({ error: 'Expense not found' });
      }

      // Verify requester belongs to the expense's group
      const requesterId = (req as any).userId;
      const requester = await User.findById(requesterId).session(session);
      const inGroup = requester?.groupIds?.some(
        (gid) => gid.toString() === existingExpense.groupId?.toString()
      );
      if (!inGroup) {
        await session.abortTransaction();
        return res.status(403).json({ error: 'You do not have permission to update this expense' });
      }

      // Prepare update data
      const updateData: Partial<IExpense> = {
        ...(description !== undefined && { description }),
        ...(amount !== undefined && { amount }),
        ...(currency !== undefined && { currency }),
        ...(date !== undefined && { date }),
        ...(splitType !== undefined && { splitType }),
        // Handle payer updates (both backward compatible and new multipayer)
        ...(payerId !== undefined && { payerId }),
        ...(payerName !== undefined && { payerName }),
        ...(splits !== undefined && { splits }),
        ...(payers !== undefined && { payers }),
        ...(groupId !== undefined && { groupId }),
      };

      // Create a temporary expense with updated fields for validation
      const tempExpense = {
        ...existingExpense.toObject(),
        ...updateData,
      };

      // Validate the updated expense
      const validationError = this.validateExpense(tempExpense);
      if (validationError) {
        await session.abortTransaction();
        return res.status(400).json({ error: validationError });
      }

      // Update the expense
      const updated = await Expense.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true, session, runValidators: true }
      );

      if (!updated) {
        await session.abortTransaction();
        return res.status(404).json({ error: 'Failed to update expense' });
      }

      // Populate user names for the response
      const populatedExpense = await Expense.populate(updated, [
        { path: 'payers.userId', select: 'name', model: 'User' },
        { path: 'splits.userId', select: 'name', model: 'User' },
      ]);

      // Convert to plain object and process
      const expenseObj = populatedExpense.toObject() as any;
      
      // Process payers with proper typing
      const processedPayers = (expenseObj.payers || []).map((payer: any) => {
        const userId = isUserRef(payer.userId) ? payer.userId._id?.toString() : payer.userId;
        return {
          ...payer,
          userId,
          userName: isUserRef(payer.userId) 
            ? payer.userId.name || payer.userName || 'Unknown'
            : payer.userName || 'Unknown'
        };
      });

      // Process splits with proper typing
      const processedSplits = (expenseObj.splits || []).map((split: any) => {
        const userId = isUserRef(split.userId) ? split.userId._id?.toString() : split.userId;
        return {
          ...split,
          userId,
          userName: isUserRef(split.userId)
            ? split.userId.name || split.userName || 'Unknown'
            : split.userName || 'Unknown'
        };
      });

      await session.commitTransaction();
      
      // Prepare response object
      const response = {
        ...expenseObj,
        id: expenseObj._id,
        payers: processedPayers,
        splits: processedSplits
      };
      
      delete (response as any)._id;
      res.json(response);
    } catch (err: any) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      res.status(500).json({ error: "Internal server error" });
    } finally {
      session.endSession();
    }
  }

  async deleteExpense(req: Request, res: Response) {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const expense = await Expense.findById(req.params.id).session(session);
      if (!expense) {
        await session.abortTransaction();
        return res.status(404).json({ error: "Expense not found" });
      }

      // Verify requester belongs to the expense's group
      const requesterId = (req as any).userId;
      const requester = await User.findById(requesterId).session(session);
      const inGroup = requester?.groupIds?.some(
        (gid) => gid.toString() === expense.groupId?.toString()
      );
      if (!inGroup) {
        await session.abortTransaction();
        return res.status(403).json({ error: "You do not have permission to delete this expense" });
      }

      await Expense.findByIdAndDelete(req.params.id).session(session);

      await session.commitTransaction();
      res.status(204).send();
    } catch (err) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: message });
    } finally {
      session.endSession();
    }
  }

  // Get expenses for a specific group
  async getGroupExpenses(req: Request, res: Response) {
    try {
      const { groupId } = req.params;
      const userId = (req as any).userId;

      const user = await User.findById(userId);
      if (!user || !user.groupIds?.some((id) => id.toString() === groupId)) {
        return res
          .status(403)
          .json({ error: "You are not a member of this group" });
      }

      // Get all users in this group
      const groupUsers = await User.find({
        groupIds: groupId,
      }).select("_id");

      const userIds = groupUsers.map((u) => u._id.toString());

      // Get expenses involving users in this specific group
      const expenses = await Expense.find({
        $or: [
          { payerId: { $in: userIds } },
          { "splits.userId": { $in: userIds } },
        ],
        groupId: groupId,
      } as any);

      // Transform _id to id for consistency
      const result = expenses.map((expense) => {
        const obj = expense.toObject() as any;
        obj.id = obj._id;
        delete obj._id;
        return obj;
      });

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
}

export default ExpenseController;
