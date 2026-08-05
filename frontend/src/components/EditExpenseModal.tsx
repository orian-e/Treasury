/**
 * @deprecated This component is no longer in use as of Feb 2026.
 * Expense editing is now handled inline via ExpenseForm (with editingExpense prop).
 * Kept for potential reuse as a generic modal template.
 */

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  OutlinedInput,
  Checkbox,
  ListItemText,
} from "@mui/material";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { Expense, User, Split } from "../models/Users";
import { SplitSelector } from "./SplitSelector";

interface EditExpenseModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (expense: Expense) => void;
  expense: Expense;
  users: User[];
}

const EditExpenseModal: React.FC<EditExpenseModalProps> = ({
  open,
  onClose,
  onSave,
  expense,
  users,
}) => {
  const [description, setDescription] = useState(expense.description);
  const [amount, setAmount] = useState(expense.amount);
  const [date, setDate] = useState(new Date(expense.date));
  const [payerId, setPayerId] = useState(expense.payerId);
  const [splits, setSplits] = useState(expense.splits);
  const [splitError, setSplitError] = useState<string | null>(null);

  // Reset state when expense changes
  useEffect(() => {
    setDescription(expense.description);
    setAmount(expense.amount);
    setDate(new Date(expense.date));
    setPayerId(expense.payerId);
    setSplits(expense.splits);
    setSplitError(null);
  }, [expense]); // Only depend on expense, not open

  const handleSave = () => {
    if (splitError) return;
    onSave({
      ...expense,
      description,
      amount,
      date: date.toISOString().split('T')[0],
      payerId,
      splits,
    });
    onClose();
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>Edit Expense</DialogTitle>
      <DialogContent>
        <TextField
          margin="dense"
          label="Description"
          fullWidth
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <TextField
          margin="dense"
          label="Amount"
          type="number"
          fullWidth
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
        />
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <DatePicker
            label="Date"
            value={date}
            onChange={(newValue) => {
              if (newValue) setDate(newValue);
            }}
            slotProps={{
              textField: { required: true, fullWidth: true, margin: "dense" },
            }}
          />
        </LocalizationProvider>
        <FormControl fullWidth margin="dense">
          <InputLabel id="payer-label">Payer</InputLabel>
          <Select
            labelId="payer-label"
            value={payerId}
            label="Payer"
            onChange={(e) => setPayerId(e.target.value)}
          >
            {users.map((user) => (
              <MenuItem key={user.id} value={user.id}>
                {user.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <SplitSelector
          users={users}
          amount={amount}
          value={splits}
          onChange={setSplits}
          onError={setSplitError}
          resetKey={expense.id}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!!splitError}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditExpenseModal;
