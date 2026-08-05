import mongoose, { Schema, Document } from "mongoose";

// User reference can be either an ID string or a populated user object
export interface IUserRef {
  _id: string;
  name: string;
}

export type UserOrId = string | IUserRef;

export interface IPayerSplit {
  userId: UserOrId | null;
  userName?: string;
  amount: number;
  type?: "equal" | "percentage" | "custom";
  percentage?: number;
}

export interface IExpenseSplit extends IPayerSplit {
  // For backward compatibility with single-payer expenses
  paid?: boolean;
}

export interface IExpense extends Document {
  description: string;
  amount: number;
  currency: string;
  date: Date;
  // For backward compatibility
  payerId?: string | null;
  payerName?: string;
  // New fields for multi-payer support
  payers?: IPayerSplit[];
  splits: IExpenseSplit[];
  groupId: string;
  splitType: "equal" | "percentage" | "custom";
  // For validation and calculations
  totalPaid?: number;
  totalOwed?: number;
  createdBy?: string;
}

const PayerSplitSchema: Schema = new Schema({
  userId: { 
    type: Schema.Types.Mixed,
    ref: 'User',
    default: null,
    set: (v: any) => v?._id || v
  },
  userName: { type: String },
  amount: { type: Number, required: true },
  type: { type: String, enum: ["equal", "percentage", "custom"], default: "equal" },
  percentage: { type: Number, min: 0, max: 100 },
}, { _id: false });

const ExpenseSplitSchema: Schema = new Schema({
  ...PayerSplitSchema.obj,
  paid: { type: Boolean, default: false },
}, { _id: false });

const ExpenseSchema: Schema = new Schema({
  description: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 0.01 },
  currency: { type: String, default: "EUR" },
  date: { type: Date, required: true, default: Date.now },
  // For backward compatibility
  payerId: { type: String, default: null },
  payerName: { type: String },
  // New fields for multi-payer support
  payers: { type: [PayerSplitSchema], default: [] },
  splits: { type: [ExpenseSplitSchema], required: true },
  groupId: { type: String, required: true },
  splitType: {
    type: String,
    enum: ["equal", "percentage", "custom"],
    default: "equal",
    required: true
  },
  // For validation
  totalPaid: { type: Number, default: 0 },
  totalOwed: { type: Number, default: 0 },
  // Track who created the expense
  createdBy: { type: String, required: true },
}, { timestamps: true });

// Pre-save hook to handle backward compatibility and validation
ExpenseSchema.pre<IExpense>('save', function() {
  // If no payers array but we have payerId, create a payer entry for backward compatibility
  if ((!this.payers || this.payers.length === 0) && this.payerId) {
    this.payers = [{
      userId: this.payerId,
      userName: this.payerName || '',
      amount: this.amount,
      type: 'custom',
    }];
  }

  // Calculate totals for validation with proper null checks
  this.totalPaid = (this.payers || []).reduce((sum, payer) => sum + (payer?.amount || 0), 0);
  this.totalOwed = (this.splits || []).reduce((sum, split) => sum + (split?.amount || 0), 0);

  // Validate that total paid equals the expense amount
  if (Math.abs(this.totalPaid - this.amount) > 0.01) {
    throw new Error('Total paid by all payers must equal the expense amount');
  }

  // If there are splits, validate that total owed equals the expense amount
  if (this.splits && this.splits.length > 0 && Math.abs(this.totalOwed - this.amount) > 0.01) {
    throw new Error('Total owed by all participants must equal the expense amount');
  }

});

export default mongoose.model<IExpense>("Expense", ExpenseSchema);
