import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Checkbox,
  ListItemText,
  Button,
} from "@mui/material";
import { User, Split } from "../models/Users";
import SplitInputField from "./SplitInputField";
import { useAutoFill } from "../hooks/useAutoFill";
import { getCurrencySymbol } from "../utils/currencies";

const splitModes = ["Equal", "Percentage", "Custom Amount"];

interface SplitSelectorProps {
  users: User[];
  amount: number;
  value: Split[];
  payerId?: string; // For backward compatibility
  payers?: Array<{ userId: string; amount: number }>; // New prop for multiple payers
  onChange: (splits: Split[]) => void;
  onError?: (error: string | null) => void;
  defaultTab?: number; // 0 = Equal, 1 = Percentage, 2 = Custom Amount
  resetKey?: string; // Force component reset when this changes
}

export const SplitSelector: React.FC<SplitSelectorProps> = ({
  users,
  amount,
  value,
  payerId,
  payers = [],
  onChange,
  onError,
  defaultTab = 0,
  resetKey,
}) => {
  // Get total paid amount from payers or fallback to amount
  const totalPaid = payers.reduce((sum, p) => sum + (p?.amount || 0), 0) || amount;
  
  // Use a ref to track if we're currently updating from props
  const isUpdatingFromProps = useRef(false);
  const lastEmittedSplits = useRef<string>("");
  const lastEmittedError = useRef<string | null>(null);

  // Derived state for tab based on value
  const detectTab = (currentValue: Split[]) => {
    if (!currentValue || currentValue.length === 0) return defaultTab || 0;
    
    const equalAmount = Math.round((totalPaid / currentValue.length) * 100) / 100;
    const isEqualSplit = currentValue.every((split, index) => {
      if (index === currentValue.length - 1) {
        const otherSplitsTotal = (currentValue.length - 1) * equalAmount;
        const expectedRemainder = Math.round((totalPaid - otherSplitsTotal) * 100) / 100;
        return Math.abs(split.amount - expectedRemainder) < 0.01;
      }
      return Math.abs(split.amount - equalAmount) < 0.01;
    });

    return isEqualSplit ? 0 : 2;
  };

  const [tab, setTab] = useState(() => detectTab(value));
  const [splitUserIds, setSplitUserIds] = useState<string[]>(value.map(s => s.userId));
  const [percentages, setPercentages] = useState<{ [userId: string]: number }>(() => {
    return Object.fromEntries(value.map(s => [s.userId, amount > 0 ? Number(((s.amount * 100) / amount).toFixed(2)) : 0]));
  });
  const [customAmounts, setCustomAmounts] = useState<{ [userId: string]: number }>(() => {
    return Object.fromEntries(value.map(s => [s.userId, s.amount]));
  });
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state with props when value or resetKey changes
  useEffect(() => {
    isUpdatingFromProps.current = true;
    const newUserIds = value.map(s => s.userId);
    setSplitUserIds(newUserIds);
    setPercentages(Object.fromEntries(value.map(s => [s.userId, amount > 0 ? Number(((s.amount * 100) / amount).toFixed(2)) : 0])));
    setCustomAmounts(Object.fromEntries(value.map(s => [s.userId, s.amount])));
    setTab(detectTab(value));
    isUpdatingFromProps.current = false;
  }, [resetKey, amount]); // We don't include 'value' here to avoid feedback loops, but we use it for reset

  // Manual sync for splitUserIds when value changes externally
  useEffect(() => {
    const newUserIds = value.map(s => s.userId);
    if (newUserIds.length !== splitUserIds.length || !newUserIds.every((id, idx) => id === splitUserIds[idx])) {
      setSplitUserIds(newUserIds);
    }
  }, [value]);

  const percentageAutoFill = useAutoFill(splitUserIds, percentages, setPercentages, 100);
  const amountAutoFill = useAutoFill(splitUserIds, customAmounts, setCustomAmounts, amount);

  // Calculate splits and validation in one go
  useEffect(() => {
    if (isUpdatingFromProps.current) return;

    let newSplits: Split[] = [];
    let errorMessage: string | null = null;

    if (splitUserIds.length === 0) {
      errorMessage = tab !== 0 ? "Select at least one person to split with." : null;
    } else {
      if (tab === 0) {
        const equalAmount = Math.round((totalPaid / splitUserIds.length) * 100) / 100;
        newSplits = splitUserIds.map((userId, index) => {
          if (index === splitUserIds.length - 1) {
            const othersTotal = (splitUserIds.length - 1) * equalAmount;
            return { userId, amount: Math.round((totalPaid - othersTotal) * 100) / 100 };
          }
          return { userId, amount: equalAmount };
        });
      } else if (tab === 1) {
        newSplits = splitUserIds.map(userId => ({
          userId,
          amount: Number((((percentages[userId] || 0) * totalPaid) / 100).toFixed(2))
        }));
        
        const totalPct = splitUserIds.reduce((sum, id) => sum + (percentages[id] || 0), 0);
        if (Math.abs(totalPct - 100) > 0.05) {
          errorMessage = `Percentages must total exactly 100%. Current: ${totalPct.toFixed(2)}%`;
        }
      } else {
        newSplits = splitUserIds.map(userId => ({
          userId,
          amount: Number((customAmounts[userId] || 0).toFixed(2))
        }));
        
        const totalAmt = splitUserIds.reduce((sum, id) => sum + (customAmounts[id] || 0), 0);
        if (Math.abs(totalAmt - totalPaid) > 0.01) {
          const symbol = getCurrencySymbol(amount.toString());
          errorMessage = `Amounts must total exactly ${symbol}${totalPaid.toFixed(2)}. Current: ${symbol}${totalAmt.toFixed(2)}`;
        }
      }
    }

    // Emit changes if they differ from last emitted
    const splitsJson = JSON.stringify(newSplits);
    if (splitsJson !== lastEmittedSplits.current) {
      lastEmittedSplits.current = splitsJson;
      onChange(newSplits);
    }

    if (errorMessage !== lastEmittedError.current) {
      lastEmittedError.current = errorMessage;
      setError(errorMessage);
      if (onError) onError(errorMessage);
    }
  }, [tab, splitUserIds, percentages, customAmounts, totalPaid, amount]);

  const getTabLabel = (idx: number, ids: string[]) => {
    if (idx === 0 && ids.length > 0) {
      if (ids.length === 1) {
        const user = users.find(u => u.id === ids[0]);
        return `${user?.name || "User"} owes`;
      }
      return `Equal (${ids.length})`;
    }
    return splitModes[idx];
  };

  return (
    <Box sx={{ width: "100%" }}>
      <FormControl fullWidth margin="dense">
        <InputLabel id="split-with-label">Split With</InputLabel>
        <Select
          labelId="split-with-label"
          multiple
          open={isOpen}
          onOpen={() => setIsOpen(true)}
          onClose={() => setIsOpen(false)}
          value={splitUserIds}
          onChange={(e) => setSplitUserIds(typeof e.target.value === "string" ? e.target.value.split(",") : e.target.value)}
          input={<OutlinedInput label="Split With" />}
          renderValue={(selected) => {
            const names = users.filter(u => selected.includes(u.id)).map(u => u.name).join(", ");
            return names.length > 30 ? names.substring(0, 27) + "..." : names;
          }}
          MenuProps={{ disableAutoFocusItem: true }}
        >
          <Box sx={{ p: 1, display: "flex", justifyContent: "flex-end" }}>
            <Button size="small" variant="contained" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}>Done</Button>
          </Box>
          {users.map((user) => (
            <MenuItem key={user.id} value={user.id} onClick={(e) => e.stopPropagation()}>
              <Checkbox checked={splitUserIds.indexOf(user.id) > -1} />
              <ListItemText primary={user.name} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Box sx={{ display: 'flex', borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        {splitModes.map((mode, idx) => {
          const disabled = idx === 0 ? splitUserIds.length === 0 : splitUserIds.length < 2;
          return (
            <Button
              key={mode}
              onClick={() => !disabled && setTab(idx)}
              disabled={disabled}
              sx={{
                flex: 1, py: 1, textTransform: 'none',
                color: tab === idx ? 'primary.main' : 'text.secondary',
                borderBottom: tab === idx ? '2px solid' : 'none',
                borderColor: 'primary.main', borderRadius: 0,
                fontWeight: tab === idx ? 'bold' : 'normal',
              }}
            >
              {getTabLabel(idx, splitUserIds)}
            </Button>
          );
        })}
      </Box>

      <Box sx={{ mt: 2 }}>
        {tab === 1 && splitUserIds.map(id => (
          <SplitInputField key={id} userId={id} userName={users.find(u => u.id === id)?.name || ""} value={percentages[id] || 0} label="%" max={100} onChange={percentageAutoFill.handleAutoFill} />
        ))}
        {tab === 2 && splitUserIds.map(id => (
          <SplitInputField key={id} userId={id} userName={users.find(u => u.id === id)?.name || ""} value={customAmounts[id] || 0} label="amount" max={amount} step="0.01" onChange={amountAutoFill.handleAutoFill} />
        ))}
        {(tab === 1 || tab === 2) && (
          <Button size="small" onClick={tab === 1 ? percentageAutoFill.resetToEqual : amountAutoFill.resetToEqual} sx={{ mt: 1 }}>Reset to Equal</Button>
        )}
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {tab === 0 ? 'Equal share for all.' : tab === 1 ? 'Enter percentages (total 100%).' : 'Enter custom amounts.'}
        </Typography>
      </Box>

      {error && <Typography color="error" variant="body2" sx={{ mt: 1 }}>{error}</Typography>}
    </Box>
  );
};
