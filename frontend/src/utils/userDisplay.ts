import { User } from "../models/Users";

export const getUserDisplayName = (user: User | undefined, allUsers: User[] = []): string => {
  // Handle case where user is undefined
  if (!user) {
    return 'Unknown User';
  }

  // If it's a guest user (no email), just return name
  if (!user.email) {
    return user.name || 'Guest User';
  }

  // Filter out any undefined users from allUsers
  const validUsers = allUsers.filter(u => u !== undefined && u !== null);
  
  // Check if there are other account users with the same name
  const sameNameAccountUsers = validUsers.filter(
    (u) => u.name === user.name && u.email && u.id !== user.id
  );

  // If there are duplicate names among account users, show email
  if (sameNameAccountUsers.length > 0) {
    return `${user.name} (${user.email})`;
  }

  // Otherwise, just show the name or a default if name is not available
  return user.name || user.email || 'Unknown User';
};
