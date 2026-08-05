import { useState, useCallback, useEffect } from "react";
import { Expense, User, Group } from "../models/Users";
import { userService } from "../services/userService";
import { expenseService } from "../services/expenseService";
import { groupService } from "../services/groupService";
import { logger } from "../utils/logger";

export const useExpenseApp = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);

  const selectGroup = useCallback(
    (groupId: string | null) => {
      setSelectedGroupId(groupId);
      // Filter expenses based on selected group
      if (groupId) {
        const groupExpenses = allExpenses.filter(
          (expense) => expense.groupId === groupId
        );
        setExpenses(groupExpenses);
      } else {
        setExpenses([]); // Do not show expenses if no group is selected
      }
    },
    [allExpenses]
  );

  // Load ALL data once on mount
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        // Fetch expenses and groups in parallel
        const [expenseData, groupsData] = await Promise.all([
          expenseService.getExpenses(),
          groupService.getUserGroups(),
        ]);

        setAllExpenses(expenseData);
        setExpenses([]); // Show nothing until a group is selected
        setGroups(groupsData);
        setSelectedGroupId(null); // Do not select a group by default
      } catch (error) {
        logger.error("Error loading initial data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Individual fetch functions for manual refresh
  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const data = await expenseService.getExpenses();
      setAllExpenses(data);
      if (selectedGroupId) {
        const filtered = data.filter(
          (expense) => expense.groupId === selectedGroupId
        );
        setExpenses(filtered);
      } else {
        setExpenses(data);
      }
    } catch (error) {
      logger.error("Error fetching expenses:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedGroupId]);

  const fetchUsers = useCallback(async () => {
    if (!selectedGroupId) {
      setUsers([]);
      return;
    }
    try {
      const data = await userService.getGroupMembers(selectedGroupId);
      setUsers(data);
    } catch (error) {
      logger.error("Error fetching users:", error);
      setUsers([]);
    }
  }, [selectedGroupId]);

  // Fetch users when selectedGroupId changes
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const fetchGroups = useCallback(async () => {
    try {
      const groupsData = await groupService.getUserGroups();
      setGroups(groupsData);
    } catch (error) {
      logger.error("Error fetching groups:", error);
    }
  }, []);

  // CRUD operations - manual refresh instead of calling other functions
  const addExpense = useCallback(
    async (expenseData: Omit<Expense, "id">) => {
      try {
        await expenseService.createExpense(expenseData);
        // Refresh expenses and users data
        const [expensesData, usersData] = await Promise.all([
          expenseService.getExpenses(),
          selectedGroupId
            ? userService.getGroupMembers(selectedGroupId)
            : Promise.resolve([]),
        ]);

        setAllExpenses(expensesData);
        setUsers(usersData);

        if (selectedGroupId) {
          const filtered = expensesData.filter(
            (expense) => expense.groupId === selectedGroupId
          );
          setExpenses(filtered);
        } else {
          setExpenses(expensesData);
        }

        // Return success status for showing toast
        return { success: true };
      } catch (error) {
        logger.error("Error adding expense:", error);
        return { success: false, error: "Failed to add expense" };
      }
    },
    [selectedGroupId]
  );

  const deleteExpense = useCallback(
    async (id: string) => {
      try {
        await expenseService.deleteExpense(id);
        // Manual refresh
        const data = await expenseService.getExpenses();
        setAllExpenses(data);
        if (selectedGroupId) {
          const filtered = data.filter(
            (expense) => expense.groupId === selectedGroupId
          );
          setExpenses(filtered);
        } else {
          setExpenses([]);
        }
      } catch (error) {
        logger.error("Error deleting expense:", error);
      }
    },
    [selectedGroupId]
  );

  const updateExpense = useCallback(
    async (updatedExpense: Expense) => {
      try {
        await expenseService.updateExpense(updatedExpense.id, updatedExpense);
        // Manual refresh
        const data = await expenseService.getExpenses();
        setAllExpenses(data);
        if (selectedGroupId) {
          const filtered = data.filter(
            (expense) => expense.groupId === selectedGroupId
          );
          setExpenses(filtered);
        } else {
          setExpenses([]);
        }
      } catch (error) {
        logger.error("Error updating expense:", error);
      }
    },
    [selectedGroupId]
  );

  const addUser = useCallback(
    async (name: string, groupId?: string) => {
      try {
        const userData = groupId ? { name, groupId } : { name };
        await userService.createUser(userData);
        // Manual refresh
        if (selectedGroupId) {
          const data = await userService.getGroupMembers(selectedGroupId);
          setUsers(data);
        }
      } catch (error) {
        logger.error("Error adding user:", error);
        throw error;
      }
    },
    [selectedGroupId]
  );

  const deleteUser = useCallback(
    async (id: string, groupId?: string) => {
      try {
        await userService.deleteUser(id, groupId);
        // Manual refresh
        if (selectedGroupId) {
          const data = await userService.getGroupMembers(selectedGroupId);
          setUsers(data);
        }
      } catch (error) {
        logger.error("Error deleting user:", error);
        throw error; // Add throw so the UI can handle the error
      }
    },
    [selectedGroupId]
  );

  const createGroup = useCallback(async (name: string, description: string) => {
    try {
      await groupService.createGroup(name, description);
      // Manual refresh
      const groupsData = await groupService.getUserGroups();
      setGroups(groupsData);
    } catch (error) {
      logger.error("Error creating group:", error);
      throw error;
    }
  }, []);

  const joinGroup = useCallback(
    async (inviteCode: string) => {
      try {
        await groupService.joinGroup(inviteCode);
        // Manual refresh both
        const groupsData = await groupService.getUserGroups();
        setGroups(groupsData);
        // Refresh users for the currently selected group
        if (selectedGroupId) {
          const groupUsers = await userService.getGroupMembers(selectedGroupId);
          setUsers(groupUsers);
        }
      } catch (error) {
        logger.error("Error joining group:", error);
        throw error;
      }
    },
    [selectedGroupId]
  );

  const getInviteInfo = useCallback(async (groupId: string) => {
    try {
      return await groupService.getInviteInfo(groupId);
    } catch (error) {
      logger.error("Error getting invite info:", error);
      throw error;
    }
  }, []);

  const updateGroup = useCallback(
    async (groupId: string, name: string, description: string) => {
      try {
        const result = await groupService.updateGroup(
          groupId,
          name,
          description
        );
        // Manual refresh
        const groupsData = await groupService.getUserGroups();
        setGroups(groupsData);
        return result;
      } catch (error) {
        logger.error("Error updating group:", error);
        throw error;
      }
    },
    []
  );

  const deleteGroup = useCallback(
    async (groupId: string) => {
      try {
        await groupService.deleteGroup(groupId);
        // Refresh groups
        const groupsData = await groupService.getUserGroups();
        setGroups(groupsData);
        // Refresh users for the currently selected group (if any)
        if (selectedGroupId && selectedGroupId !== groupId) {
          const groupUsers = await userService.getGroupMembers(selectedGroupId);
          setUsers(groupUsers);
        } else {
          setUsers([]);
          setSelectedGroupId(null);
          setExpenses([]);
        }
      } catch (error) {
        logger.error("Error deleting group:", error);
        throw error;
      }
    },
    [selectedGroupId]
  );

  const getGroupMembers = useCallback(async (groupId: string) => {
    try {
      return await groupService.getGroupMembers(groupId);
    } catch (error) {
      logger.error("Error fetching group members:", error);
      throw error;
    }
  }, []);

  return {
    expenses,
    allExpenses,
    users,
    loading,
    fetchExpenses,
    fetchUsers,
    addExpense,
    deleteExpense,
    updateExpense,
    addUser,
    deleteUser,
    groups,
    selectedGroupId,
    selectGroup,
    fetchGroups,
    createGroup,
    joinGroup,
    getInviteInfo,
    updateGroup,
    getGroupMembers,
    deleteGroup,
  };
};
