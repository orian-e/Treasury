import { Box, Button, TextField, Alert } from "@mui/material";
import React, { useEffect, useState } from "react";
import { Group } from "../models/Users";

interface AddUserFormProps {
  onAddUser: (name: string, groupId: string) => void;
  groups?: Group[];
  selectedGroupId?: string | null;
  onSwitchToGroups?: () => void;
}

const AddUserForm: React.FC<AddUserFormProps> = ({
  onAddUser,
  groups = [],
  selectedGroupId,
  onSwitchToGroups,
}) => {

  const [name, setName] = useState("");
  const [groupId, setGroupId] = useState<string>(selectedGroupId || "");
  
  useEffect(() => {
    setGroupId(selectedGroupId || "");
  }, [selectedGroupId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && groupId) {
      onAddUser(name.trim(), groupId);
      setName("");
    }
  };

  const hasGroups = groups.length > 0;

  return (
    <Box sx={{ mt: 2, width: "100%" }}>
      {!hasGroups ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Create a group first to add users!
          {onSwitchToGroups && (
            <Button
              variant="outlined"
              size="small"
              onClick={onSwitchToGroups}
              sx={{ ml: 1 }}
            >
              Create Group
            </Button>
          )}
        </Alert>
      ) : !selectedGroupId ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          Select a group first to add users!
          {onSwitchToGroups && (
            <Button
              variant="outlined"
              size="small"
              onClick={onSwitchToGroups}
              sx={{ ml: 1 }}
            >
              Select Group
            </Button>
          )}
        </Alert>
      ) : (
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: "stretch",
            gap: 1,
            width: "100%",
            bgcolor: "background.default",
          }}
        >
          <TextField
            label="Add Guest"
            value={name}
            onChange={(e) => setName(e.target.value)}
            size="small"
            placeholder="e.g., John Doe"
            sx={{
              flex: 1,
              minWidth: 0,
            }}
            required
            disabled={!selectedGroupId}
            helperText={!selectedGroupId ? "Choose a group first" : ""}
          />
          <Button type="submit" variant="contained" disabled={!selectedGroupId}>
            Add
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default AddUserForm;
