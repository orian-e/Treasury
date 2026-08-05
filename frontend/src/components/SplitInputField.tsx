import React, { useState, useEffect } from "react";
import { Box, TextField, Typography } from "@mui/material";

const SplitInputField: React.FC<{
  userId: string;
  userName: string;
  value: number;
  label: string;
  max: number;
  step?: string;
  onChange: (userId: string, value: number) => void;
}> = ({ userId, userName, value, label, max, step = "1", onChange }) => {
  const [localValue, setLocalValue] = useState(() => {
    return value > 0 ? value.toString() : "";
  });
  const [isFocused, setIsFocused] = useState(false);

  // Update local value when prop changes (but not when user is typing)
  useEffect(() => {
    if (!isFocused) {
      setLocalValue(value > 0 ? value.toString() : "");
    }
  }, [value, isFocused]);

  const handleBlur = () => {
    setIsFocused(false);
    const numValue = parseFloat(localValue);
    if (!isNaN(numValue) && numValue > 0) {
      onChange(userId, numValue);
    } else {
      onChange(userId, 0);
      setLocalValue("");
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  return (
    <Box key={userId} sx={{ mb: 2 }}>
      <Typography
        variant="body2"
        sx={{
          mb: 0.5,
          fontWeight: 500,
          color: "text.secondary",
        }}
      >
        {userName} ({label})
      </Typography>
      <TextField
        type="number"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onFocus={handleFocus}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.currentTarget.blur();
          }
        }}
        onWheel={(e) => (e.target as HTMLInputElement).blur()}
        inputProps={{
          min: 0,
          max,
          step,
          onWheel: (e) => e.preventDefault(),
        }}
        fullWidth
        size="small"
        sx={{
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
        }}
      />
    </Box>
  );
};

export default SplitInputField;