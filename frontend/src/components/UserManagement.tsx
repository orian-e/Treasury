import React, { useState } from "react";
import {
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  CircularProgress,
  Box,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import ConfirmDialog from "./ConfirmDialog";
import { User } from "../models/Users";
import { logger } from "../utils/logger";

interface UserManagementProps {
  users: User[];
  onDeleteUser: (id: string, groupId?: string) => Promise<void>;
  onRemoveFromGroup?: (userId: string, groupId: string) => Promise<void>;
  loading: boolean;
  selectedGroupId?: string | null;
  isGroupCreator?: boolean;
}

const UserManagement: React.FC<UserManagementProps> = ({
  users,
  onDeleteUser,
  loading,
  selectedGroupId,
  isGroupCreator = false,
}) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [removeFromGroup, setRemoveFromGroup] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteClick = (
    user: User,
    isRemoveFromGroup: boolean = false
  ) => {
    setUserToDelete(user);
    setDeleteError(null);
    setRemoveFromGroup(isRemoveFromGroup);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (userToDelete) {
      setDeleting(true);
      setDeleteError(null);
      try {
        if (removeFromGroup && selectedGroupId) {
          await onDeleteUser(userToDelete.id, selectedGroupId);
        } else {
          await onDeleteUser(userToDelete.id);
        }
        setDeleteDialogOpen(false);
        setUserToDelete(null);
      } catch (error: any) {
        logger.error("Failed to delete user:", error);

        const errorMessage = error.message || "Failed to delete user";
        setDeleteError(errorMessage);
      } finally {
        setDeleting(false);
      }
    }
  };

  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setUserToDelete(null);
  };

  if (loading) {
    return (
      <Paper sx={{ p: 2, mt: 2 }}>
        <Box display="flex" justifyContent="center">
          <CircularProgress />
        </Box>
      </Paper>
    );
  }

  return (
    <>
      <Paper sx={{ p: 2, mt: 2 }}>
        <Typography
          variant="h6"
          gutterBottom
          sx={{
            fontWeight: 600,
            color: "primary.main",
            borderBottom: "2px solid",
            borderColor: "primary.main",
            pb: 1,
          }}
        >
          👥 Manage Users ({users.length})
        </Typography>

        {users.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No users added yet
          </Typography>
        ) : (
          <List dense>
            {users.map((user) => (
              <ListItem key={user.id} divider>
                <ListItemText
                  primary={
                    user.name.length > 25
                      ? user.name.substring(0, 25) + "..."
                      : user.name
                  }
                  secondary={user.email || "No email"}
                />
                <ListItemSecondaryAction>
                  <Box display="flex" gap={0.5}>
                    {/* Remove from Group button (for any user type when admin) */}
                    {isGroupCreator && selectedGroupId && (
                      <IconButton
                        edge="end"
                        onClick={() => handleDeleteClick(user, true)}
                        color="warning"
                        size="small"
                        title="Remove from group"
                      >
                        <RemoveCircleIcon />
                      </IconButton>
                    )}

                    {/* Delete Permanently button (only for guest users) */}
                    {!user.email && (
                      <IconButton
                        edge="end"
                        onClick={() => handleDeleteClick(user, false)}
                        color="error"
                        size="small"
                        title="Delete permanently"
                      >
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </Box>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title={removeFromGroup ? "Remove from Group" : "Delete User"}
        message={
          removeFromGroup
            ? `Are you sure you want to remove "${userToDelete?.name}" from this group?`
            : `Are you sure you want to delete "${userToDelete?.name}"?`
        }
        warningText={
          removeFromGroup
            ? "The user will be removed from this group but may still exist in other groups."
            : "This action cannot be undone. The user will be removed from all groups."
        }
        confirmLabel={removeFromGroup ? "Remove from Group" : "Delete Permanently"}
        confirmingLabel={removeFromGroup ? "Removing..." : "Deleting..."}
        color={removeFromGroup ? "warning" : "error"}
        loading={deleting}
        error={
          deleteError
            ? `${removeFromGroup ? "Remove Failed" : "Delete Failed"}: ${deleteError}`
            : null
        }
        errorHint={
          deleteError?.includes("expenses")
            ? "💡 Delete the expenses involving this user first."
            : undefined
        }
        onCancel={handleCancelDelete}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
};

export default UserManagement;
