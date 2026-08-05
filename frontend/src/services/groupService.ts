import { apiRequest } from "../utils/api";

export const groupService = {
  async getUserGroups() {
    const response = await apiRequest("/groups/user");
    if (!response.ok) throw new Error("Failed to fetch groups");
    return response.json();
  },

  async joinGroup(inviteCode: string) {
    const response = await apiRequest("/groups/join", {
      method: "POST",
      body: JSON.stringify({ inviteCode }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to join group");
    }
    return response.json();
  },

  async getInviteInfo(groupId: string) {
    const response = await apiRequest(`/groups/${groupId}/invite`);
    if (!response.ok) throw new Error("Failed to get invite info");
    return response.json();
  },

  async createGroup(name: string, description: string) {
    const response = await apiRequest("/groups", {
      method: "POST",
      body: JSON.stringify({ name, description }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create group");
    }
    return response.json();
  },

  async updateGroup(groupId: string, name: string, description: string) {
    const response = await apiRequest(`/groups/${groupId}`, {
      method: "PUT",
      body: JSON.stringify({ name, description }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to update group");
    }
    return response.json();
  },

  async deleteGroup(groupId: string) {
    const response = await apiRequest(`/groups/${groupId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to delete group");
    }
    return response.json();
  },

  async getGroupMembers(groupId: string) {
    const response = await apiRequest(`/groups/${groupId}/members`);
    if (!response.ok) throw new Error("Failed to fetch group members");
    return response.json();
  },

  async getGroupExpenses(groupId: string) {
    const response = await apiRequest(`/groups/${groupId}/expenses`);
    if (!response.ok) throw new Error("Failed to fetch group expenses");
    return response.json();
  },
};
