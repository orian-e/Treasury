import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Divider,
  CircularProgress,
  Alert,
  Button,
} from '@mui/material';
import { Expense, Group } from '../models/Users';
import { groupExpensesByCurrency, formatCurrency } from '../utils/currencies';
import { useExpenseApp } from '../hooks/useApi';
import GroupsIcon from '@mui/icons-material/Groups';
import ShowChartIcon from '@mui/icons-material/ShowChart';

const TotalsComponent: React.FC = () => {
  // Get data from the expense app context
  const { allExpenses = [], groups = [], selectedGroupId, loading, fetchExpenses } = useExpenseApp();
  
  // Ensure expenses are loaded on first render
  React.useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);
  
  // Calculate derived state
  const isLoading = loading || allExpenses === undefined;
  const isEmpty = !isLoading && groups.length === 0;
  const hasData = !isLoading && !isEmpty;

    // Loading state
  if (isLoading) {
    return (
      <Box 
        sx={{ 
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          p: 4,
          textAlign: 'center',
          minHeight: 200
        }}
        role="status"
        aria-live="polite"
        aria-busy={true}
      >
        <CircularProgress color="primary" aria-label="Loading totals" />
        <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
          Loading expense totals...
        </Typography>
      </Box>
    );
  }

  // Empty state
  if (isEmpty) {
    return (
      <Box 
        sx={{ 
          p: 4,
          textAlign: 'center',
          bgcolor: 'background.paper',
          borderRadius: 2,
          boxShadow: 1
        }}
        role="alert"
        aria-live="polite"
      >
        <Typography variant="h6" component="h3" color="text.secondary" gutterBottom>
          No expenses found
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Start adding expenses to see totals
        </Typography>
      </Box>
    );
  }

  // Data state
  return (
    <Box role="region" aria-label="Expense totals by group">
      {!selectedGroupId && (
        <Typography 
          variant="subtitle1" 
          color="text.secondary"
          sx={{ mb: 3 }}
        >
          Viewing totals across all groups
        </Typography>
      )}

      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { xs: '1fr', md: 'repeat(auto-fill, minmax(300px, 1fr))' }, 
        gap: 3 
      }}>
        {groups.map((group: Group) => {
          const groupExpenses = (allExpenses || []).filter(e => e.groupId === group.id);
          const groupName = group.name;
          const byCurrency = groupExpensesByCurrency(groupExpenses);
          const currencyEntries = Object.entries(byCurrency);

          return (
            <Card 
              key={group.id}
              sx={{
                borderRadius: 2,
                boxShadow: 1,
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 4,
                },
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
              }}
              aria-label={`${groupName} expenses`}
            >
              <CardContent sx={{ flexGrow: 1, p: 3 }}>
                <Box 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    mb: 3,
                    gap: 2
                  }}
                >
                  <Box sx={{ 
                    bgcolor: 'primary.light', 
                    p: 1.5, 
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'primary.main',
                    '& .MuiSvgIcon-root': {
                      fontSize: '1.75rem'
                    }
                  }}>
                    <GroupsIcon />
                  </Box>
                  <Box>
                    <Typography 
                      variant="subtitle2" 
                      color="text.secondary"
                      sx={{ 
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        fontSize: '0.7rem',
                        fontWeight: 600
                      }}
                    >
                      Group
                    </Typography>
                    <Typography 
                      variant="h6" 
                      component="h3"
                      sx={{ 
                        fontWeight: 700,
                        color: 'text.primary',
                        lineHeight: 1.2
                      }}
                    >
                      {groupName}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ 
                  mt: 3,
                  '&:before': {
                    content: '""',
                    display: 'block',
                    height: '1px',
                    bgcolor: 'divider',
                    mb: 3,
                    width: '40px'
                  }
                }}>
                  <Typography 
                    variant="overline" 
                    color="text.secondary"
                    component="div"
                    sx={{ 
                      mb: 1.5,
                      display: 'block',
                      fontWeight: 600,
                      letterSpacing: '0.5px',
                      color: 'text.secondary',
                      fontSize: '0.7rem'
                    }}
                  >
                    Total Spending
                  </Typography>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(auto-fill, minmax(140px, 1fr))' },
                      gap: 2,
                      alignItems: 'start'
                    }}
                    role="list"
                    aria-label={`${groupName} currency totals`}
                  >
                    {currencyEntries.map(([currency, expenseList]) => {
                      const total = expenseList.reduce(
                        (sum, expense) => sum + Math.abs(expense.amount),
                        0
                      );
                      
                      return (
                        <Box
                          key={currency}
                          role="listitem"
                          sx={{
                            p: 2,
                            bgcolor: 'grey.50',
                            borderRadius: 2,
                            border: '1px solid',
                            borderColor: 'divider',
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Box sx={{ 
                              width: 8, 
                              height: 8, 
                              borderRadius: '50%', 
                              bgcolor: 'primary.main' 
                            }} />
                            <Typography 
                              variant="overline" 
                              component="div"
                              sx={{ 
                                color: 'text.secondary',
                                lineHeight: 1.2,
                                fontWeight: 500
                              }}
                            >
                              {currency}
                            </Typography>
                          </Box>
                          <Typography
                            variant="h6"
                            sx={{ 
                              fontWeight: 700, 
                              color: 'success.dark',
                              fontFeatureSettings: '"tnum"',
                              mt: 0.5
                            }}
                          >
                            {formatCurrency(total, currency)}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Box>
    </Box>
  );
};

// Memoize the component to prevent unnecessary re-renders
export const Totals = React.memo(TotalsComponent);
