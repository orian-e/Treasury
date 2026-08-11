import React, { useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip,
  Alert,
  Snackbar,
} from "@mui/material";
import {
  ContentCopy as CopyIcon,
  Add as AddIcon,
  Group as GroupIcon,
} from "@mui/icons-material";
import { Group } from "../models/Users";
import { matchesQuery } from "../utils/search";
import SearchField from "./SearchField";

interface GroupManagementProps {
  groups: Group[];
  onFetchGroups: () => void;
  onJoinGroup: (inviteCode: string) => Promise<void>;
  onCreateGroup: (name: string, description: string) => Promise<void>;
  onGetInviteInfo: (groupId: string) => Promise<any>;
  onUpdateGroup?: (
    groupId: string,
    name: string,
    description: string
  ) => Promise<any>;
  onDeleteGroup: (groupId: string) => Promise<void>; //
  currentUserId: string;
  selectedGroupId?: string | null;
  onSelectGroup?: (groupId: string | null) => void;
  onSwitchToDashboard?: () => void;
}

const GroupManagement: React.FC<GroupManagementProps> = ({
  groups,
  onFetchGroups,
  onJoinGroup,
  onCreateGroup,
  onGetInviteInfo,
  onUpdateGroup,
  onDeleteGroup,
  currentUserId,
  selectedGroupId,
  onSelectGroup,
  onSwitchToDashboard,
}) => {
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [inviteLink, setInviteLink] = useState("");
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");

  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const [groupSearchQuery, setGroupSearchQuery] = useState("");

  const filteredGroups = useMemo(
    () =>
      groups.filter((group) =>
        matchesQuery([group.name, group.description], groupSearchQuery)
      ),
    [groups, groupSearchQuery]
  );

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;

    try {
      await onCreateGroup(newGroupName.trim(), newGroupDescription.trim());
      setCreateDialogOpen(false);
      setNewGroupName("");
      setNewGroupDescription("");
      setSnackbar({
        open: true,
        message: "Group created successfully!",
        severity: "success",
      });
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: error.message || "Failed to create group",
        severity: "error",
      });
    }
  };

  const handleJoinGroup = async () => {
    try {
      await onJoinGroup(inviteCode.trim());
      setJoinDialogOpen(false);
      setInviteCode("");
      setSnackbar({
        open: true,
        message: "Successfully joined group!",
        severity: "success",
      });
    } catch (error: any) {
      // Extract the actual backend error message
      const errorMessage =
        error.response?.data?.error || error.message || "Failed to join group";
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: "error",
      });
    }
  };

  const handleShowInvite = async (group: Group) => {
    try {
      const inviteInfo = await onGetInviteInfo(group.id);
      setSelectedGroup(group);
      setInviteLink(inviteInfo.inviteCode);
      setInviteDialogOpen(true);
    } catch (error: any) {
      // Extract the actual backend error message
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to get invite code";
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: "error",
      });
    }
  };

  const handleEditGroup = (group: Group) => {
    setEditingGroup(group);
    setEditName(group.name);
    setEditDescription(group.description || "");
  };

  const handleSaveEdit = async () => {
    if (!editingGroup || !onUpdateGroup) return;

    try {
      await onUpdateGroup(editingGroup.id, editName, editDescription);
      setEditingGroup(null);
      setSnackbar({
        open: true,
        message: "Group updated successfully!",
        severity: "success",
      });
      onFetchGroups();
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to update group";
      setSnackbar({ open: true, message: errorMessage, severity: "error" });
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setSnackbar({
        open: true,
        message: "Invite code copied!",
        severity: "success",
      });
    } catch (error) {
      setSnackbar({ open: true, message: "Failed to copy", severity: "error" });
    }
  };

  const handleSelectGroup = (groupId: string) => {
    if (onSelectGroup) {
      onSelectGroup(groupId);
      if (onSwitchToDashboard) {
        onSwitchToDashboard(); // Switch to dashboard tab
      }
    }
  };

  const handleDeleteGroup = async (group: Group) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${group.name}"? This will permanently remove the group and preserve all expense history.`
      )
    ) {
      try {
        await onDeleteGroup(group.id);
        setSnackbar({
          open: true,
          message: "Group deleted successfully!",
          severity: "success",
        });
      } catch (error: any) {
        setSnackbar({
          open: true,
          message: error.message || "Failed to delete group",
          severity: "error",
        });
      }
    }
  };

  return (
    <Box>
      <Box
        display="flex"
        flexDirection={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", sm: "center" }}
        gap={{ xs: 2, sm: 0 }}
        mb={2}
      >
        <Typography variant="h6" display="flex" alignItems="center" gap={1}>
          <GroupIcon />
          Your Groups{" "}
          <Box
            component="span"
            sx={{
              backgroundColor: "primary.main",
              color: "white",
              borderRadius: "50%",
              minWidth: 24,
              height: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.75rem",
              fontWeight: "bold",
              ml: 0.5,
            }}
          >
            {groups.length}
          </Box>
        </Typography>
        <Box
          display="flex"
          flexDirection={{ xs: "column", sm: "row" }}
          gap={1}
          sx={{ ml: { sm: 2 } }} // Only add margin-left on desktop
        >
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
            fullWidth
          >
            Create Group
          </Button>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setJoinDialogOpen(true)}
            fullWidth
          >
            Join Group
          </Button>
        </Box>
      </Box>

      {groups.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <SearchField
            value={groupSearchQuery}
            onChange={setGroupSearchQuery}
            ariaLabel="Search groups"
            placeholder="Search your groups…"
          />
          {groupSearchQuery.trim() !== "" && (
            <Typography
              className="search-field-status"
              variant="caption"
              color="text.secondary"
              aria-live="polite"
              sx={{ mt: 0.5 }}
            >
              Showing {filteredGroups.length} of {groups.length} groups
            </Typography>
          )}
        </Box>
      )}

      <Box display="flex" flexDirection="column" gap={3}>
        {" "}
        {filteredGroups.length === 0 ? (
          <Typography color="text.secondary">
            {groups.length === 0
              ? "No groups yet. Join a group to get started!"
              : "No groups match your search."}
          </Typography>
        ) : (
          filteredGroups.map((group) => (
            <Card
              key={group.id}
              sx={{
                minWidth: 300,
                borderRadius: 2,
                boxShadow: selectedGroupId === group.id ? 4 : 3,
                border: "2px solid",
                borderColor:
                  selectedGroupId === group.id ? "primary.main" : "divider",
                cursor: "pointer",
                "&:hover": {
                  boxShadow: 4,
                  transform: "translateY(-2px)",
                  transition: "all 0.2s ease-in-out",
                },
              }}
              onClick={() => handleSelectGroup(group.id)}
            >
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                {" "}
                <Box
                  display="flex"
                  flexDirection={{ xs: "column", sm: "row" }}
                  gap={{ xs: 2, sm: 0 }}
                  alignItems={{ xs: "stretch", sm: "flex-start" }}
                >
                  {" "}
                  <Box sx={{ flex: 1, mr: 2 }}>
                    {" "}
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 600,
                        mb: 1,
                        fontSize: { xs: "1.1rem", sm: "1.25rem" },
                      }}
                    >
                      {group.name}
                      {selectedGroupId === group.id && (
                        <Chip
                          label="Selected"
                          size="small"
                          color="primary"
                          sx={{ ml: 1 }}
                        />
                      )}
                    </Typography>
                    {group.description && (
                      <Typography
                        color="text.secondary"
                        variant="body2"
                        sx={{ mb: 2, lineHeight: 1.4 }}
                      >
                        {group.description}
                      </Typography>
                    )}
                    <Box>
                      {group.creatorId === currentUserId && (
                        <Chip
                          label="Admin"
                          color="primary"
                          size="small"
                          sx={{ fontWeight: 500 }}
                        />
                      )}
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      flexShrink: 0,
                      display: "flex",
                      flexDirection: { xs: "row", sm: "column" },
                      gap: 1,
                      width: { xs: "100%", sm: "auto" },
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {group.creatorId === currentUserId && (
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleEditGroup(group)}
                        sx={{
                          minWidth: { xs: "auto", sm: 120 },
                          flex: { xs: 1, sm: "none" },
                          whiteSpace: "nowrap",
                        }}
                      >
                        Edit Group
                      </Button>
                    )}{" "}
                    <Button
                      variant="outlined"
                      size="small"
                      color="error"
                      onClick={() => handleDeleteGroup(group)}
                      sx={{
                        minWidth: { xs: "auto", sm: 120 },
                        flex: { xs: 1, sm: "none" },
                        whiteSpace: "nowrap",
                      }}
                    >
                      Delete Group
                    </Button>
                    <Button
                      variant="outlined"
                      size="medium"
                      onClick={() => handleShowInvite(group)}
                      sx={{
                        minWidth: { xs: "auto", sm: 120 },
                        flex: { xs: 1, sm: "none" },
                        whiteSpace: "nowrap",
                      }}
                    >
                      Get Invite Code
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))
        )}
      </Box>

      {/* Join Group Dialog */}
      <Dialog open={joinDialogOpen} onClose={() => setJoinDialogOpen(false)}>
        <DialogTitle>Join Group</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Invite Code"
            fullWidth
            variant="outlined"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            placeholder="Enter invite code..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setJoinDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleJoinGroup}
            variant="contained"
            disabled={!inviteCode.trim()}
          >
            Join
          </Button>
        </DialogActions>
      </Dialog>

      {/* Invite Link Dialog */}
      <Dialog
        open={inviteDialogOpen}
        onClose={() => setInviteDialogOpen(false)}
      >
        <DialogTitle>Invite Others to {selectedGroup?.name}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Share this invite code with others so they can join your group:
          </Typography>
          <Box display="flex" alignItems="center" gap={1}>
            <TextField
              fullWidth
              variant="outlined"
              value={inviteLink}
              InputProps={{ readOnly: true }}
            />
            <IconButton onClick={copyToClipboard} color="primary">
              <CopyIcon />
            </IconButton>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={!!editingGroup}
        onClose={() => setEditingGroup(null)}
        maxWidth="sm"
        fullWidth
      >
        {/* Edit Group Dialog */}
        <DialogTitle>Edit Group</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Group Name"
            fullWidth
            variant="outlined"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            placeholder="e.g., PARIS, Weekend Trip, Office Lunch..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingGroup(null)}>Cancel</Button>
          <Button
            onClick={handleSaveEdit}
            variant="contained"
            disabled={!editName.trim()}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Group Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Group</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Group Name"
            fullWidth
            variant="outlined"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="e.g., PARIS Trip, Office Lunch, Weekend Getaway..."
            sx={{ mb: 2 }}
            required
          />
          <TextField
            margin="dense"
            label="Description (Optional)"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={newGroupDescription}
            onChange={(e) => setNewGroupDescription(e.target.value)}
            placeholder="Add details about this group..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreateGroup}
            variant="contained"
            disabled={!newGroupName.trim()}
          >
            Create Group
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default GroupManagement;
