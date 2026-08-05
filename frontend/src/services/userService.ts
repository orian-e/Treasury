import { apiRequest } from "../utils/api";

export const userService = {
  // Fetch all users, Admin only
  async getUsers() {
    const response = await apiRequest("/users");
    if (!response.ok) throw new Error("Failed to fetch users");
    return response.json();
  },

  async getGroupMembers(groupId: string) {
    const response = await apiRequest(`/groups/${groupId}/members`);
    if (!response.ok) throw new Error("Failed to fetch group members");
    return response.json();
  },

  async createUser(userData: {
    name: string;
    email?: string;
    groupId?: string;
  }) {
    const requestData: any = { name: userData.name };

    // Only include email if it exists AND is not empty
    if (userData.email && userData.email.trim()) {
      requestData.email = userData.email.trim();
    }

    // Include groupId if provided
    if (userData.groupId) {
      requestData.groupId = userData.groupId;
    }

    const response = await apiRequest("/users", {
      method: "POST",
      body: JSON.stringify(requestData),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create user");
    }
    return response.json();
  },

  async updateUser(id: string, userData: { name: string; email?: string }) {
    const requestData: any = { name: userData.name };

    // Only include email if it exists AND is not empty
    if (userData.email && userData.email.trim()) {
      requestData.email = userData.email.trim();
    }

    const response = await apiRequest(`/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(requestData),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to update user");
    }
    return response.json();
  },

  async deleteUser(id: string, groupId?: string) {
    const requestData: any = {};

    // If groupId is provided, this is a "remove from group" operation
    if (groupId) {
      requestData.groupId = groupId;
    }

    const response = await apiRequest(`/users/${id}`, {
      method: "DELETE",
      body: groupId ? JSON.stringify(requestData) : undefined,
    });

    if (!response.ok) {
      const error = await response.json();
      const action = groupId
        ? "remove user from group"
        : "delete user completely";
      throw new Error(error.error || `Failed to ${action}`);
    }

    // Return response for settled removal (status 200) or complete deletion
    if (response.status === 200) {
      return response.json();
    }
  },
};
