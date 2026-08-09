import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  CircularProgress,
  Box,
} from "@mui/material";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: React.ReactNode;
  warningText?: string;
  confirmLabel?: string;
  confirmingLabel?: string;
  cancelLabel?: string;
  color?: "error" | "warning" | "primary";
  loading?: boolean;
  error?: string | null;
  errorHint?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  warningText,
  confirmLabel = "Confirm",
  confirmingLabel,
  cancelLabel = "Cancel",
  color = "error",
  loading = false,
  error,
  errorHint,
  onConfirm,
  onCancel,
}) => {
  return (
    <Dialog open={open} onClose={onCancel}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography>{message}</Typography>

        {warningText && (
          <Typography variant="body2" color={`${color}.main`} sx={{ mt: 1 }}>
            {warningText}
          </Typography>
        )}

        {error && (
          <Box
            sx={{ mt: 2, p: 2, backgroundColor: "error.light", borderRadius: 1 }}
          >
            <Typography variant="body2" color="error.dark" sx={{ fontWeight: 600 }}>
              ❌ {error}
            </Typography>
            {errorHint && (
              <Typography variant="caption" color="error.dark" sx={{ mt: 1, display: "block" }}>
                {errorHint}
              </Typography>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          onClick={onConfirm}
          color={color}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : null}
        >
          {loading ? confirmingLabel || `${confirmLabel}...` : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;
