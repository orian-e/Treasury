import React from "react";
import {
  Box,
  Chip,
  List,
  ListItem,
  ListItemText,
  Typography,
  useTheme,
  Divider,
  Paper,
  Button,
} from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { Expense, User } from "../models/Users";
import { computeAllSettlements, SettlementTx } from "../utils/balances";
import { formatCurrency, getCurrencySymbol } from "../utils/currencies";
import { getUserDisplayName } from "../utils/userDisplay";

interface SettlementPanelProps {
  users: User[];
  expensesByCurrency: Record<string, Expense[]>;
}

export const SettlementPanel: React.FC<SettlementPanelProps> = ({
  users,
  expensesByCurrency,
}) => {
  const theme = useTheme();
  const settlementsByCurrency = React.useMemo(() => {
    const settlements = computeAllSettlements(users, expensesByCurrency);
    
    // Filter out any empty currency groups
    const nonEmptySettlements = Object.entries(settlements).reduce(
      (acc, [currency, txs]) => {
        if (txs && txs.length > 0) {
          acc[currency] = txs;
        }
        return acc;
      },
      {} as Record<string, SettlementTx[]>
    );
    
    return nonEmptySettlements;
  }, [users, expensesByCurrency]);

  const totalSettlementCount = Object.values(settlementsByCurrency).reduce(
    (sum, arr) => sum + (arr?.length || 0),
    0
  );

  if (totalSettlementCount === 0) {
    return (
      <Paper 
        elevation={0} 
        sx={{ 
          p: 4, 
          textAlign: 'center',
          bgcolor: 'background.default',
          borderRadius: 2,
          border: '1px dashed',
          borderColor: 'divider',
        }}
      >
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No settlements needed
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          All balances are settled up!
        </Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {Object.entries(settlementsByCurrency).map(
        ([currency, settlements]) => (
          <Box key={currency} sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, px: 1 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                {getCurrencySymbol(currency)} {currency}
              </Typography>
              <Chip 
                label={`${settlements.length} settlement${settlements.length !== 1 ? 's' : ''}`}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ height: 20 }}
              />
            </Box>
            <List disablePadding sx={{ bgcolor: 'background.paper', borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}>
                {settlements.map((tx, index) => (
                  <React.Fragment key={index}>
                    <ListItem 
                      sx={{ 
                        py: 1.5, 
                        px: 2,
                        '&:not(:last-child)': {
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                        },
                        '&:hover': {
                          bgcolor: 'action.hover',
                        },
                        transition: 'all 0.2s',
                      }}
                    >
                      <ListItemText
                        primary={
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <Typography
                              variant="body1"
                              component="span"
                              sx={{ fontWeight: 500 }}
                            >
                              {getUserDisplayName(
                                users.find((u) => u.id === tx.from) || {
                                  id: "",
                                  name: "Unknown",
                                },
                                users
                              )}
                            </Typography>
                            <ArrowForwardIcon
                              fontSize="small"
                              sx={{ color: "text.secondary" }}
                            />
                            <Typography
                              variant="body1"
                              component="span"
                              sx={{ fontWeight: 500 }}
                            >
                              {getUserDisplayName(
                                users.find((u) => u.id === tx.to) || {
                                  id: "",
                                  name: "Unknown",
                                },
                                users
                              )}
                            </Typography>
                            <Box sx={{ flexGrow: 1 }} />
                            <Typography
                              variant="body1"
                              component="span"
                              sx={{ 
                                fontWeight: 600,
                                color: 'primary.main',
                              }}
                            >
                              {formatCurrency(tx.amount, currency)}
                            </Typography>
                          </Box>
                        }
                        sx={{ my: 0 }}
                      />
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            </Box>
          )
        )}
      </Box>
  );
};

export default SettlementPanel;
