import React, { useState, useEffect } from "react";
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Tabs,
  Tab,
  Snackbar,
  Alert,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  Divider,
  Tooltip,
  Chip,
} from "@mui/material";
import ShowChartIcon from '@mui/icons-material/ShowChart';
import GroupsIcon from '@mui/icons-material/Groups';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import LogoutIcon from '@mui/icons-material/Logout';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

// Single source of truth for the primary navigation, shared by the desktop
// header and the mobile bottom bar. Order defines the tab index used by
// currentTab and by every setCurrentTab call in this file.
const NAV_ITEMS = [
  { id: "groups", label: "Groups", Icon: GroupsIcon, requiresGroup: false },
  { id: "expenses", label: "Expenses", Icon: ReceiptLongIcon, requiresGroup: true },
  { id: "settlements", label: "Settlements", Icon: SwapHorizIcon, requiresGroup: true },
  { id: "totals", label: "Totals", Icon: ShowChartIcon, requiresGroup: false },
] as const;
import ConfirmDialog from "./ConfirmDialog";
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
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [accountMenuAnchor, setAccountMenuAnchor] = useState<null | HTMLElement>(null);
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

  // A tab is locked while it needs a group and none is selected. Derived from
  // NAV_ITEMS so the guards and the nav rendering cannot drift apart.
  const isTabLocked = (index: number) =>
    Boolean(NAV_ITEMS[index]?.requiresGroup) && !selectedGroupId;

  useEffect(() => {
    // Never leave a group-dependent tab on screen after the group goes away.
    if (isTabLocked(currentTab)) {
      setCurrentTab(0);
    }
  }, [selectedGroupId, currentTab]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    // Don't allow switching to Expenses or Settlements tabs if no group is selected
    if (isTabLocked(newValue)) {
      return;
    }
    setCurrentTab(newValue);
  };

  // Short enough to keep in the header at every width. currentUser may be an
  // email, which has no whitespace and so passes through unchanged.
  const firstName = currentUser.trim().split(/\s+/)[0];

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
          // Clear the bottom-docked nav on mobile.
          pb: { xs: "calc(56px + env(safe-area-inset-bottom))", md: 0 },
        }}
      >
        <AppBar position="sticky" sx={{ bgcolor: "primary.main" }}>
          <Toolbar
            sx={{
              minHeight: { xs: 56, md: 64 },
              height: { xs: 56, md: 64 },
              gap: 1,
            }}
          >
            <Typography
              variant="h5"
              component="h1"
              sx={{ fontWeight: 600, color: "white", whiteSpace: "nowrap" }}
            >
              Treasury
            </Typography>

            {/* Primary navigation. One set of markup: inline in the toolbar on
                desktop, docked to the bottom of the viewport on mobile. */}
            <Tabs
              component="nav"
              value={currentTab}
              onChange={handleTabChange}
              textColor="inherit"
              sx={{
                minHeight: 0,
                minWidth: 0,
                ml: { xs: 0, md: 3 },
                position: { xs: "fixed", md: "static" },
                bottom: { xs: 0, md: "auto" },
                left: { xs: 0, md: "auto" },
                right: { xs: 0, md: "auto" },
                zIndex: { xs: "appBar", md: "auto" },
                bgcolor: { xs: "background.paper", md: "transparent" },
                borderTop: { xs: 1, md: 0 },
                borderColor: "divider",
                pb: { xs: "env(safe-area-inset-bottom)", md: 0 },
                "& .MuiTabs-flexContainer": {
                  display: { xs: "grid", md: "flex" },
                  gridTemplateColumns: { xs: "repeat(4, 1fr)", md: "none" },
                },
                // Selection is shown as a pill (desktop) / tinted item (mobile).
                "& .MuiTabs-indicator": { display: "none" },
                "& .MuiTab-root": {
                  minHeight: { xs: 56, md: 44 },
                  minWidth: 0,
                  // Padding lives on the inner span so it, and not a dead zone
                  // around it, carries the hover target for the lock Tooltip.
                  p: 0,
                  fontSize: { xs: "0.65rem", md: "0.9rem" },
                  fontWeight: 600,
                  textTransform: "none",
                  borderRadius: { xs: 0, md: 2 },
                  color: { xs: "text.secondary", md: "rgba(255,255,255,0.9)" },
                  "&.Mui-selected": {
                    color: { xs: "primary.main", md: "common.white" },
                    bgcolor: { xs: "transparent", md: "rgba(255,255,255,0.18)" },
                  },
                  // Locked: needs a group before it can be opened. Dimmed hard
                  // against the brighter available items above — the lock icon
                  // is what says "unavailable", the opacity only reinforces it.
                  '&[aria-disabled="true"]': {
                    opacity: { xs: 0.38, md: 0.28 },
                    fontWeight: 400,
                    cursor: "not-allowed",
                    "&:hover": { bgcolor: "transparent" },
                  },
                },
              }}
            >
              {NAV_ITEMS.map(({ id, label, Icon }, index) => {
                const locked = isTabLocked(index);
                return (
                  <Tab
                    key={id}
                    value={index}
                    // Not the native `disabled` prop: a disabled button swallows
                    // mouse events, so the Tooltip explaining *why* it is locked
                    // would never fire. handleTabChange still refuses the click.
                    aria-disabled={locked || undefined}
                    // Pinned because the Tooltip puts its own aria-label on the
                    // child span, which would otherwise become the tab's name.
                    aria-label={locked ? `${label} — select a group first` : label}
                    disableRipple={locked}
                    label={
                      <Tooltip
                        title={locked ? "Select a group first" : ""}
                        arrow
                        disableInteractive
                      >
                        <Box
                          component="span"
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "100%",
                            height: "100%",
                            flexDirection: { xs: "column", md: "row" },
                            gap: { xs: 0.25, md: 1 },
                            px: { xs: 0.5, md: 2 },
                            py: { xs: 1, md: 0.75 },
                          }}
                        >
                          {locked ? (
                            <LockOutlinedIcon fontSize="small" />
                          ) : (
                            <Icon fontSize="small" />
                          )}
                          <Box component="span">{label}</Box>
                        </Box>
                      </Tooltip>
                    }
                  />
                );
              })}
            </Tabs>

            <Box
              sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 1 }}
            >
              <Typography
                variant="body2"
                noWrap
                data-testid="current-user"
                sx={{ maxWidth: { xs: 100, md: 160 } }}
              >
                {firstName}
              </Typography>
              <IconButton
                aria-label="Account menu"
                aria-haspopup="true"
                aria-expanded={accountMenuAnchor ? "true" : undefined}
                onClick={(event) => setAccountMenuAnchor(event.currentTarget)}
                sx={{ p: 0.5 }}
              >
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: "background.paper",
                    color: "primary.main",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                  }}
                >
                  {currentUser.trim().charAt(0).toUpperCase()}
                </Avatar>
              </IconButton>
            </Box>
          </Toolbar>
        </AppBar>

        <Menu
          anchorEl={accountMenuAnchor}
          open={Boolean(accountMenuAnchor)}
          onClose={() => setAccountMenuAnchor(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
        >
          <MenuItem disabled sx={{ opacity: "1 !important" }}>
            <Typography variant="body2" color="text.secondary">
              Signed in as {currentUser}
            </Typography>
          </MenuItem>
          <Divider />
          <MenuItem
            onClick={() => {
              setAccountMenuAnchor(null);
              setLogoutDialogOpen(true);
            }}
          >
            <ListItemIcon>
              <LogoutIcon fontSize="small" />
            </ListItemIcon>
            Logout
          </MenuItem>
        </Menu>

        {/* Main Content */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
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
                <>
                {/* The nav says what you are doing; this says what you are
                    doing it to. Totals is global, so it has no equivalent. */}
                <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
                    Expenses
                  </Typography>
                  <Chip
                    icon={<GroupsIcon />}
                    label={
                      groups?.find((g) => g.id === selectedGroupId)?.name || "Group"
                    }
                    size="small"
                    onClick={() => setCurrentTab(0)}
                    aria-label="Change group"
                  />
                </Box>
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
                      // Remount on group change so a search typed in one group
                      // does not hide the next group's expenses. The form's own
                      // group dropdown swaps groups without unmounting this.
                      key={selectedGroupId}
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
                </>
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

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        open={logoutDialogOpen}
        title="Log Out"
        message="Are you sure you want to log out?"
        confirmLabel="Logout"
        color="error"
        onCancel={() => setLogoutDialogOpen(false)}
        onConfirm={() => {
          setLogoutDialogOpen(false);
          onLogout();
        }}
      />

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
