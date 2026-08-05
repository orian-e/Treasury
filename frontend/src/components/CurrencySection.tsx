import { Box, Chip, Typography, Divider } from "@mui/material";
import React from "react";
import { getCurrencySymbol } from "../utils/currencies";

interface CurrencySectionProps {
  currency: string;
  contextLabel?: "Summary" | "Expenses";
  metaText?: string;
  children?: React.ReactNode;
  showDivider?: boolean; // <-- Add this prop
  dataTestId?: string;
}

export const CurrencySection: React.FC<CurrencySectionProps> = ({
  currency,
  contextLabel,
  metaText,
  children,
  showDivider = true, // <-- Default: show divider
  dataTestId,
}) => {
  return (
    <Box sx={{ mb: 2.5 }} data-testid={dataTestId}>
      {showDivider ? (
        <Divider textAlign="left" sx={{ mb: 1 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
            }}
          >
            <Chip
              label={`${getCurrencySymbol(currency)} ${currency || 'N/A'}`}
              color="primary"
              size="small"
            />
            {contextLabel && (
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {contextLabel}
              </Typography>
            )}
            {metaText && (
              <Typography variant="caption" color="text.secondary">
                {metaText}
              </Typography>
            )}
          </Box>
        </Divider>
      ) : (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
            mb: 1,
          }}
        >
          <Chip
            label={`${getCurrencySymbol(currency)} ${currency}`}
            color="primary"
            size="small"
          />
          {contextLabel && (
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {contextLabel}
            </Typography>
          )}
          {metaText && (
            <Typography variant="caption" color="text.secondary">
              {metaText}
            </Typography>
          )}
        </Box>
      )}
      {children}
    </Box>
  );
};

export default CurrencySection;
