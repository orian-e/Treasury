/**
 * @deprecated This component is no longer in use as of Feb 2026.
 * People are now added via guest addition or invite codes in GroupManagement.
 * No other files import this component — safe to delete when ready.
 */

import React, { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  Snackbar,
  Divider,
} from "@mui/material";
import {
  PersonAdd as PersonAddIcon,
  Email as EmailIcon,
} from "@mui/icons-material";
import { Group } from "../models/Users";
import AddUserForm from "./AddUserForm"; // ← Add this import

interface AddPeopleTabProps {
  onAddGuest: (name: string, groupId: string) => void;
  onSwitchToGroups?: () => void;
  groups: Group[];
  selectedGroupId: string | null;
}

const AddPeopleTab: React.FC<AddPeopleTabProps> = ({
  onAddGuest,
  onSwitchToGroups,
  groups,
  selectedGroupId,
}) => {
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });

  const selectedGroup = groups?.find((g) => g.id === selectedGroupId);

  const handleAddGuest = (name: string, groupId: string) => {
    onAddGuest(name, groupId);
    const groupName = groups.find((g) => g.id === groupId)?.name;
    setSnackbar({
      open: true,
      message: `Added ${name} to ${groupName}`,
      severity: "success",
    });
  };

  return (
    <Box sx={{ maxWidth: 800, margin: "0 auto", p: 2 }}>
      <Typography variant="h5" sx={{ mb: 3, textAlign: "center" }}>
        Add People to Your Expenses
      </Typography>

      {/* Add Guest Card */}
      <Card sx={{ mb: 3, boxShadow: 2 }}>
        <CardContent sx={{ p: 3 }}>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <PersonAddIcon color="primary" />
            <Typography variant="h6">Add a Guest</Typography>
          </Box>

          {selectedGroup && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Adding to group: <strong>{selectedGroup.name}</strong>
            </Alert>
          )}

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 2, p: 2, bgcolor: "grey.50", borderRadius: 1 }}
          >
            💡 <strong>Guests</strong> are perfect for quick expense splitting -
            just add their name and you're ready to go!
          </Typography>

          {/* Use AddUserForm component */}
          <AddUserForm
            onAddUser={handleAddGuest}
            groups={groups}
            selectedGroupId={selectedGroupId}
            onSwitchToGroups={onSwitchToGroups}
          />
        </CardContent>
      </Card>

      <Divider sx={{ my: 3 }}>
        <Typography color="text.secondary">OR</Typography>
      </Divider>

      {/* Invite Member Card */}
      <Card sx={{ boxShadow: 2 }}>
        <CardContent sx={{ p: 3 }}>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <EmailIcon color="secondary" />
            <Typography variant="h6">Invite Members</Typography>
          </Box>

          <Alert severity="info" sx={{ mb: 2 }}>
            Members can view expenses, add their own, and manage the group
          </Alert>

          <Typography variant="body1" sx={{ mb: 2 }}>
            To invite members to your group:
          </Typography>

          <Box sx={{ pl: 2, mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              • Go to the <strong>Groups</strong> tab
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              • Click <strong>"Get Invite Code"</strong> on your group
            </Typography>
            <Typography variant="body2">
              • Share that code with people you want to invite
            </Typography>
          </Box>

          <Button
            variant="outlined"
            color="secondary"
            onClick={() => {
              if (onSwitchToGroups) onSwitchToGroups();
            }}
            sx={{ minWidth: 120 }}
          >
            Go to Groups
          </Button>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 2, display: "block" }}
          >
            Only group admins can generate invite codes
          </Typography>
        </CardContent>
      </Card>

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

export default AddPeopleTab;
