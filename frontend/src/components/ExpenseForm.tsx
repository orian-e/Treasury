import {
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  InputAdornment,
} from "@mui/material";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Expense,
  Group,
  Payer,
  User,
  hasMultiplePayers,
} from "../models/Users";
import { SplitSelector } from "./SplitSelector";
import { getUserDisplayName } from "../utils/userDisplay";
import { SUPPORTED_CURRENCIES, getCurrencySymbol } from "../utils/currencies";
import { formContainerStyles } from "../styles/componentStyles";

interface ExpenseFormProps {
  onAddExpense: (expense: Omit<Expense, "id">) => void;
  onEditExpense?: (expense: Expense) => void;
  onCancelEdit?: () => void;
  editingExpense?: Expense | null;
  users: User[];
  groups: Group[];
  selectedGroupId?: string | null;
  onGroupChange?: (groupId: string) => void;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({
  onAddExpense,
  editingExpense,
  onEditExpense,
  onCancelEdit,
  users,
  groups,
  selectedGroupId,
  onGroupChange,
}) => {
  const formRef = useRef<HTMLFormElement>(null);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [payerId, setPayerId] = useState(users[0]?.id || "");
  const [payers, setPayers] = useState<Payer[]>([]);
  const [splits, setSplits] = useState<{ userId: string; amount: number }[]>(
    [],
  );
  useEffect(() => {
    if (!payerId && users.length > 0 && !editingExpense) {
      setPayerId(users[0].id);
    }
  }, [users, payerId, editingExpense]);

  useEffect(() => {
    if (editingExpense) {
      setDescription(editingExpense.description);
      setAmount(editingExpense.amount.toString());
      setDate(new Date(editingExpense.date));
      setCurrency(editingExpense.currency);
      setPayerId(editingExpense.payerId || "");
      setPayers(editingExpense.payers || []);
      setSplits(editingExpense.splits);
      if (editingExpense.groupId) {
        setGroupId(editingExpense.groupId);
      }
      // Smooth scroll to the form so the user sees they're editing
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [editingExpense]);

  const resetForm = useCallback(() => {
    setDescription("");
    setAmount("");
    setDate(new Date());
    setPayerId(users[0]?.id || "");
    setPayers([]);
    setSplits([]);
    setCurrency("EUR");
    setErrors({});
    setSplitError(null);
    setResetKey((k) => k + 1);
    setLoading(false);
  }, [users]);

  const handleSplitsChange = useCallback((
    newSplits: { userId: string; amount: number }[],
  ) => {
    setSplits(newSplits);
    setSplitError(null);
  }, []);

  const handleSplitError = useCallback((error: string | null) => {
    setSplitError(error);
  }, []);

  const [groupId, setGroupId] = useState(selectedGroupId || "");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [resetKey, setResetKey] = useState(0);
  const [splitError, setSplitError] = useState<string | null>(null);
  const [currency, setCurrency] = useState("EUR");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    // Basic validation
    const newErrors: { [key: string]: string } = {};
    if (!description.trim()) newErrors.description = "Description is required";
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0)
      newErrors.amount = "Please enter a valid amount";

    // Validate either single payer or multiple payers
    const hasPayers = payers.length > 0;
    if (!hasPayers && !payerId) {
      newErrors.payer = "Please select at least one payer";
    }

    if (hasPayers) {
      const totalPaid = payers.reduce((sum, p) => sum + p.amount, 0);
      if (Math.abs(totalPaid - Number(amount)) > 0.01) {
        newErrors.payers = `Total paid amount (${totalPaid}) must equal the expense amount (${amount})`;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setLoading(false);
      return;
    }
    if (splitError) newErrors.splits = splitError;

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      setLoading(false);
      return;
    }

    const expense: Omit<Expense, "id"> = {
      description,
      amount: Number(amount),
      currency,
      date: date.toISOString().split("T")[0],
      // Only set payerId if not using multiple payers
      ...(payers.length > 0 ? { payers } : { payerId }),
      splits,
      groupId: groupId || null,
    };

    if (editingExpense && onEditExpense) {
      onEditExpense({
        ...editingExpense,
        description,
        amount: Number(amount),
        currency,
        date: date.toISOString().split("T")[0],
        payerId,
        payers,
        splits,
      });
      resetForm();
    } else {
      onAddExpense(expense);
      resetForm();
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box
        ref={formRef}
        component="form"
        onSubmit={handleSubmit}
        sx={{
          ...formContainerStyles,
          ...(editingExpense && {
            borderColor: 'secondary.main',
            borderWidth: '2px',
            boxShadow: '0 0 12px rgba(0, 137, 123, 0.3)',
            transition: 'all 0.3s ease-in-out',
          }),
        }}
      >
        <Typography
          variant="h5"
          component="h2"
          sx={{
            fontWeight: 600,
            color: editingExpense ? "secondary.main" : "primary.main",
            borderBottom: "2px solid",
            borderColor: editingExpense ? "secondary.main" : "primary.main",
            mb: 2,
            display: "flex",
            alignItems: "center",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          {editingExpense ? "Edit Expense" : "Add Expense"}
        </Typography>

        {/* Group Selection */}
        {groups.length === 0 ? (
          <Typography color="warning.main" sx={{ mb: 2 }}>
            No groups found. Please create a group first!
          </Typography>
        ) : (
          <FormControl
            fullWidth
            required
            sx={{
              "& .MuiOutlinedInput-root": {
                bgcolor: groupId ? "success.50" : "error.50",
                "&:hover": {
                  bgcolor: groupId ? "success.100" : "error.100",
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: groupId ? "success.main" : "error.main",
                  },
                },
                "&.Mui-focused": {
                  bgcolor: "background.paper",
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: groupId ? "success.main" : "error.main",
                    borderWidth: "2px",
                  },
                },
              },
              "& .MuiInputLabel-root": {
                color: groupId ? "success.dark" : "error.dark",
                fontWeight: 500,
                "&.Mui-focused": {
                  color: groupId ? "success.main" : "error.main",
                },
              },
            }}
          >
            <InputLabel id="group-label">
              {groupId ? "Group Selected" : "Select Group"}
            </InputLabel>
            <Select
              labelId="group-label"
              value={groupId}
              label={groupId ? "Group Selected" : "Select Group"}
              onChange={(e) => {
                const newGroupId = e.target.value;
                setGroupId(newGroupId);
                onGroupChange?.(newGroupId);
                if (errors.groupId)
                  setErrors((prev) => ({ ...prev, groupId: "" }));
              }}
            >
              {groups.map((group) => (
                <MenuItem key={group.id} value={group.id}>
                  {group.name}
                  {group.description && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ ml: 1 }}
                    >
                      • {group.description}
                    </Typography>
                  )}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <Divider sx={{ my: 1.5, borderColor: "divider", opacity: 0.5 }} />

        <TextField
          label="Amount"
          type="number"
          variant="outlined"
          sx={{ mt: 1 }}
          value={amount}
          onChange={(e) => {
            // Allow empty string or valid number
            if (e.target.value === "" || /^\d*\.?\d*$/.test(e.target.value)) {
              setAmount(e.target.value);
              if (errors.amount) setErrors((prev) => ({ ...prev, amount: "" }));
            }
          }}
          onFocus={(e) => e.target.select()}
          error={!!errors.amount}
          helperText={errors.amount || "Use negative numbers for repayments"}
          inputProps={{
            step: "0.01",
            inputMode: "decimal",
          }}
          required
          fullWidth
          InputProps={{
            startAdornment: (
              <InputAdornment position="start" sx={{ minWidth: { xs: 60, sm: 80 }, mr: 1 }}>
                <FormControl
                  size="small"
                  variant="standard"
                  sx={{ minWidth: { xs: 50, sm: 70 } }}
                >
                  <Select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    disableUnderline
                    sx={{
                      "& .MuiSelect-select": {
                        paddingRight: "8px !important",
                        paddingLeft: "8px",
                      },
                    }}
                  >
                    {SUPPORTED_CURRENCIES.map((curr) => (
                      <MenuItem key={curr.code} value={curr.code}>
                        {curr.code}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </InputAdornment>
            ),
          }}
        />

        {/* Payer Select */}
        <Box mt={1}>
          <Typography
            variant="subtitle2"
            color="text.secondary"
            sx={{ fontSize: "0.875rem" }}
          >
            Who paid for this?
          </Typography>
          <Box display="flex" gap={1} sx={{ mt: 0.5 }}>
            <Button
              variant={payers.length === 0 ? "contained" : "outlined"}
              onClick={() => setPayers([])}
              size="small"
            >
              Single Payer
            </Button>
            <Button
              variant={payers.length > 0 ? "contained" : "outlined"}
              onClick={() =>
                setPayers(
                  payers.length > 0
                    ? payers
                    : [
                        {
                          userId: users[0]?.id || "",
                          amount: Number(amount) || 0,
                        },
                      ],
                )
              }
              size="small"
            >
              Multiple Payers
            </Button>
          </Box>

          {payers.length > 0 ? (
            <Box sx={{ mt: 1 }}>
              {payers.map((payer, index) => (
                <Box key={index} display="flex" gap={1} mb={1}>
                  <FormControl fullWidth>
                    <Select
                      value={payer.userId}
                      onChange={(e) => {
                        const newPayers = [...payers];
                        newPayers[index].userId = e.target.value as string;
                        setPayers(newPayers);
                      }}
                    >
                      {users
                        .filter((user) => user) // Filter out any undefined users
                        .map((user) => (
                          <MenuItem key={user.id} value={user.id}>
                            {getUserDisplayName(user, users)}
                          </MenuItem>
                        ))}
                    </Select>
                  </FormControl>
                  <TextField
                    type="number"
                    value={payer.amount || ""}
                    placeholder="0.00"
                    onChange={(e) => {
                      const newPayers = [...payers];
                      const value =
                        e.target.value === "" ? 0 : Number(e.target.value);
                      newPayers[index].amount = value;
                      setPayers(newPayers);
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          {getCurrencySymbol(currency)}
                        </InputAdornment>
                      ),
                    }}
                    inputProps={{
                      min: 0,
                      step: "0.01",
                    }}
                  />
                  <Button
                    onClick={() => {
                      setPayers(payers.filter((_, i) => i !== index));
                    }}
                  >
                    Remove
                  </Button>
                </Box>
              ))}
              <Button
                onClick={() => {
                  setPayers([
                    ...payers,
                    { userId: users[0]?.id || "", amount: 0 } as const,
                  ]);
                }}
                variant="outlined"
                size="small"
                sx={{ mt: 1 }}
              >
                Add Payer
              </Button>
              {errors.payers && (
                <Typography color="error" variant="caption" display="block">
                  {errors.payers}
                </Typography>
              )}
            </Box>
          ) : (
            <FormControl fullWidth margin="normal" error={!!errors.payer}>
              <InputLabel id="payer-label">Paid by</InputLabel>
              <Select
                labelId="payer-label"
                value={payerId}
                label="Paid by"
                onChange={(e) => setPayerId(e.target.value as string)}
              >
                {users
                  .filter((user) => user) // Filter out any undefined users
                  .map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {getUserDisplayName(user, users)}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          )}
        </Box>

        <Box>
          <TextField
            label="Description"
            variant="outlined"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (errors.description)
                setErrors((prev) => ({ ...prev, description: "" }));
            }}
            error={!!errors.description}
            helperText={errors.description}
            required
            fullWidth
          />
        </Box>
        <Box>
          <DatePicker
            label="Date"
            value={date}
            onChange={(newValue) => {
              if (newValue) setDate(newValue);
            }}
            slotProps={{
              textField: {
                required: true,
                fullWidth: true,
              },
            }}
          />
        </Box>

        <Divider sx={{ my: 1.5, borderColor: "divider", opacity: 0.5 }} />

        <Box>
          <SplitSelector
            users={users}
            amount={Number(amount) || 0}
            value={splits}
            payerId={payerId}
            payers={payers}
            onChange={handleSplitsChange}
            onError={handleSplitError}
            resetKey={resetKey.toString()}
          />
        </Box>

        {errors.splits && (
          <Typography
            variant="caption"
            color="error"
            sx={{
              display: "block",
              whiteSpace: "normal",
              wordWrap: "break-word",
              maxWidth: "100%",
              minHeight: "16px",
            }}
          >
            {errors.splits}
          </Typography>
        )}

        {/* Currency selector moved inline into Amount field */}

        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            type="submit"
            variant="contained"
            color={editingExpense ? "secondary" : "primary"}
            disabled={loading || !!splitError || groups.length === 0}
          >
            {loading ? (
              <CircularProgress size={24} />
            ) : editingExpense ? (
              "Update Expense"
            ) : (
              "Add Expense"
            )}
          </Button>
          {editingExpense && onCancelEdit && (
            <Button
              variant="outlined"
              color="secondary"
              onClick={(e) => {
                e.preventDefault();
                resetForm();
                onCancelEdit();
              }}
            >
              Cancel
            </Button>
          )}
        </Box>
      </Box>
    </LocalizationProvider>
  );
};

export default ExpenseForm;
