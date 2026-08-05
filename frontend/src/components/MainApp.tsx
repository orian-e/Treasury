import React, { useState, useEffect } from "react";
import {
  Box,
  AppBar,
  Typography,
  Button,
  Tabs,
  Tab,
  Snackbar,
  Alert,
  Paper,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import ShowChartIcon from '@mui/icons-material/ShowChart';
import ExpenseList from "./ExpenseList";
import ExpenseForm from "./ExpenseForm";
import ExpenseSummary from "./ExpenseSummary";
import { Totals } from "./Totals";
import AddUserForm from "./AddUserForm";
import UserManagement from "./UserManagement";
import GroupManagement from "./GroupManagement";
import SettlementPanel from "./SettlementPanel";
import { Expense } from "../models/Users";
import { useExpenseApp } from "../hooks/useApi";

interface MainAppProps {
  currentUser: string;
  onLogout: () => void;
}

const MainApp: React.FC<MainAppProps> = ({ currentUser, onLogout }) => {
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [currentTab, setCurrentTab] = React.useState(0);
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info" | "warning";
  }>({ open: false, message: "", severity: "success" });

  const showNotification = (
    message: string,
    severity: "success" | "error" | "info" | "warning" = "success"
  ) => {
    setNotification({ open: true, message, severity });
  };

  const handleCloseNotification = () => {
    setNotification((prev) => ({ ...prev, open: false }));
  };

  const {
    expenses,
    users,
    loading,
    addExpense,
    deleteExpense,
    updateExpense,
    addUser,
    deleteUser,
    groups,
    selectedGroupId,
    selectGroup,
    fetchGroups,
    joinGroup,
    createGroup,
    getInviteInfo,
    updateGroup,
    deleteGroup,
  } = useExpenseApp();

  useEffect(() => {
    // Only redirect if trying to access Expenses (1) or Settlements (2) tabs without a selected group
    if (!selectedGroupId && (currentTab === 1 || currentTab === 2)) {
      setCurrentTab(0);
    }
    // Allow Groups (0) and Totals (3) tabs without a selected group
  }, [selectedGroupId, currentTab]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    // Don't allow switching to Expenses or Settlements tabs if no group is selected
    if ((newValue === 1 || newValue === 2) && !selectedGroupId) {
      return;
    }
    setCurrentTab(newValue);
  };

  const currentUserObject = users.find(
    (u) => u.name === currentUser || u.email === currentUser
  );
  const currentUserId = currentUserObject?.id;

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
  };

  const handleCancelEdit = () => {
    setEditingExpense(null);
  };

  const handleSaveExpense = async (updatedExpense: Expense) => {
    try {
      await updateExpense(updatedExpense);
      setEditingExpense(null);
      showNotification("Expense updated successfully!");
    } catch (error) {
      showNotification("Failed to update expense", "error");
    }
  };

  const handleAddExpense = async (expenseData: Omit<Expense, "id">) => {
    const result = await addExpense(expenseData);
    if (result?.success) {
      showNotification("Expense added successfully!");
    } else {
      showNotification(result?.error || "Failed to add expense", "error");
    }
  };

  return (
    <>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          overflow: "hidden",
        }}
      >
        <AppBar position="static" sx={{ bgcolor: "primary.main" }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              p: 1.25,
            }}
          >
            <Typography
              variant="h4"
              component="h1"
              sx={{
                fontWeight: 600,
                fontSize: { xs: '1.25rem', sm: '2.125rem' },
                color: "white",
                position: "relative",
                "&::after": {
                  content: '""',
                  position: "absolute",
                  bottom: -8,
                  left: 0,
                  width: "100%",
                  height: "3px",
                  background:
                    "linear-gradient(90deg, transparent, white, transparent)",
                },
              }}
            >
              Treasury
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1, sm: 2 } }}>
              <Typography variant={isMobile ? "body2" : "body1"}>
                {isMobile ? currentUser : `Welcome, ${currentUser}`}
              </Typography>
              <Button
                color="inherit"
                onClick={onLogout}
                variant="outlined"
                size="small"
              >
                Logout
              </Button>
            </Box>
          </Box>
        </AppBar>

        {/* Main Content */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Tabs */}
          <Paper 
            elevation={0}
            sx={{
              position: 'sticky',
              top: 0,
              zIndex: 10,
              borderRadius: 0,
              borderBottom: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              px: { xs: 0, sm: 2 },
            }}
          >
            <Tabs
              value={currentTab}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              sx={{
                minHeight: { xs: 48, sm: 64 },
                overflowX: 'auto',
                '& .MuiTabs-flexContainer': {
                  flexWrap: 'nowrap',
                  minWidth: '100%',
                  width: 'max-content',
                  margin: '0 auto',
                  justifyContent: 'center',
                  '@media (max-width: 900px)': {
                    justifyContent: 'flex-start',
                  },
                },
                '& .MuiTabs-scroller': {
                  overflow: 'auto !important',
                  WebkitOverflowScrolling: 'touch',
                },
                '& .MuiTabs-indicator': {
                  height: 3,
                  borderRadius: '3px 3px 0 0',
                },
                '& .MuiTab-root': {
                  minHeight: { xs: 48, sm: 64 },
                  minWidth: 'auto',
                  padding: { xs: '8px 10px', sm: '12px 16px' },
                  fontSize: { xs: '0.8rem', sm: '1rem' },
                  fontWeight: 600,
                  textTransform: 'none',
                  letterSpacing: '0.5px',
                  '& .MuiSvgIcon-root': {
                    marginBottom: '4px',
                  },
                  '&.Mui-selected': {
                    color: 'primary.main',
                  },
                },
              }}
            >
              <Tab
                label={
                  <Box
                    component="span"
                    sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                  >
                    <Box component="span" sx={{ fontSize: "1rem" }}>
                      🏢
                    </Box>
                    <Box component="span">Groups</Box>
                  </Box>
                }
              />
              <Tab
                disabled={!selectedGroupId}
                label={
                  <Box
                    component="span"
                    sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                  >
                    <Box component="span" sx={{ fontSize: "1rem" }}>
                      💰
                    </Box>
                    <Box component="span">Expenses</Box>
                  </Box>
                }
              />
              <Tab
                disabled={!selectedGroupId}
                label={
                  <Box
                    component="span"
                    sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                  >
                    <Box component="span" sx={{ fontSize: "1rem" }}>
                      💸
                    </Box>
                    <Box component="span">Settlements</Box>
                  </Box>
                }
              />
              <Tab
                label={
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <ShowChartIcon fontSize="small" />
                    <Box component="span">Totals</Box>
                  </Box>
                }
                sx={{
                  minHeight: 'auto',
                  py: 1.5,
                }}
              />
            </Tabs>
          </Paper>

          {/* Tab content container */}
          <Box sx={{
            maxWidth: 1200,
            margin: '0 auto',
            p: { xs: 1, sm: 2, md: 3 },
            width: '100%',
            '& .tab-header': {
              mb: 4,
              pb: 2,
              borderBottom: '2px solid',
              borderColor: 'divider',
              '& h2': {
                fontWeight: 600,
                color: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }
            },
            '& .card-container': {
              bgcolor: 'background.paper',
              borderRadius: 2,
              boxShadow: 1,
              p: 3,
              mb: 3
            }
          }}>

          {/* Groups Tab */}
          {currentTab === 0 && (
            <Box>
              <GroupManagement
                groups={groups || []}
                onFetchGroups={fetchGroups}
                onJoinGroup={joinGroup}
                onCreateGroup={createGroup}
                onGetInviteInfo={getInviteInfo}
                onUpdateGroup={updateGroup}
                onDeleteGroup={deleteGroup}
                currentUserId={currentUserId || ""}
                selectedGroupId={selectedGroupId}
                onSelectGroup={selectGroup}
                onSwitchToDashboard={() => setCurrentTab(1)}
              />
            </Box>
          )}

          {/* Expenses Tab */}
          {currentTab === 1 && (
            <Box>
              {selectedGroupId ? (
                <Box
                  sx={{
                    display: "flex",
                    gap: 3,
                    flexDirection: { xs: "column", md: "row" },
                    alignItems: "flex-start",
                  }}
                >
                  <Box
                    sx={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      gap: 1.5, // Reduced from gap-3 (24px) to gap-1.5 (12px)
                      width: "100%",
                      maxWidth: 800,
                      margin: "0 auto",
                    }}
                  >
                    <ExpenseForm
                      onAddExpense={handleAddExpense}
                      editingExpense={editingExpense}
                      onEditExpense={handleSaveExpense}
                      onCancelEdit={handleCancelEdit}
                      users={users}
                      groups={groups || []}
                      selectedGroupId={selectedGroupId}
                      onGroupChange={selectGroup}
                    />
                    <ExpenseList
                      expenses={expenses}
                      users={users}
                      onDeleteExpense={deleteExpense}
                      onEditExpense={handleEditExpense}
                      loading={loading}
                    />
                  </Box>

                  {/* Sidebar */}
                  <Box sx={{ width: { xs: "100%", md: 300 } }}>
                    <ExpenseSummary
                      expenses={expenses}
                      users={users}
                      loading={loading}
                      groupName={
                        groups?.find((g) => g.id === selectedGroupId)?.name
                      }
                      onViewSettlements={() => setCurrentTab(2)} // Changed from 3 to 2 to match the Settlements tab index
                    />

                    <Box
                      sx={{
                        mt: 2,
                        bgcolor: "background.paper",
                        p: 2,
                        borderRadius: 2,
                        boxShadow: 1,
                      }}
                    >
                      <UserManagement
                        users={users}
                        onDeleteUser={deleteUser}
                        onRemoveFromGroup={(userId, groupId) =>
                          deleteUser(userId, groupId)
                        }
                        loading={loading}
                        selectedGroupId={selectedGroupId}
                        isGroupCreator={
                          groups?.find((g) => g.id === selectedGroupId)
                            ?.creatorId === currentUserId
                        }
                      />

                      <AddUserForm
                        onAddUser={addUser}
                        groups={groups}
                        selectedGroupId={selectedGroupId}
                        onSwitchToGroups={() => setCurrentTab(0)}
                      />
                    </Box>
                  </Box>
                </Box>
              ) : (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: 300,
                    textAlign: "center",
                    p: 3,
                  }}
                >
                  <Typography variant="h6" gutterBottom>
                    No group selected
                  </Typography>
                  <Typography color="text.secondary" paragraph sx={{ mb: 3 }}>
                    Please select or create a group to start adding expenses.
                  </Typography>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => setCurrentTab(0)}
                  >
                    Go to Groups
                  </Button>
                </Box>
              )}
            </Box>
          )}

          {/* Settlements Tab */}
          {currentTab === 2 && selectedGroupId && (
            <Box>
              <Box className="tab-header">
                <Typography variant="h5" component="h2">
                  🤝 Settlements for{" "}
                  {groups?.find((g) => g.id === selectedGroupId)?.name ||
                    "Group"}
                </Typography>
              </Box>

              <Box
                sx={{
                  bgcolor: "background.paper",
                  borderRadius: 2,
                  p: 2,
                  boxShadow: 1,
                  mb: 3,
                }}
              >
                {expenses.length > 0 ? (
                  <SettlementPanel
                    users={users}
                    expensesByCurrency={expenses.reduce<
                      Record<string, Expense[]>
                    >((acc, expense) => {
                      if (!acc[expense.currency]) {
                        acc[expense.currency] = [];
                      }
                      acc[expense.currency].push(expense);
                      return acc;
                    }, {})}
                  />
                ) : (
                  <Box sx={{ textAlign: "center", py: 4 }}>
                    <Typography color="text.secondary" gutterBottom>
                      No expenses found to calculate settlements.
                    </Typography>
                    <Button
                      variant="outlined"
                      color="primary"
                      onClick={() => setCurrentTab(1)}
                      sx={{ mt: 2 }}
                    >
                      Add Expenses
                    </Button>
                  </Box>
                )}
              </Box>
            </Box>
          )}

          {/* Totals Tab */}
          {currentTab === 3 && (
            <Box>
              <Box className="tab-header">
                <Typography variant="h5" component="h2">
                  📊 Expense Totals
                </Typography>
              </Box>
              <Box className="card-container">
                <Totals key="totals" />
              </Box>
            </Box>
          )}
        </Box>
        </Box> {/* Close the tab content container */}

        {/* Footer */}
        <Box component="footer" sx={{ p: 2, textAlign: 'center', mt: 'auto' }}>
          <Typography variant="body2" color="text.secondary">
            2025 Shared Expense App
          </Typography>
        </Box>
      </Box>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          sx={{ width: "100%" }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default MainApp;
