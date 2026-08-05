import { Router } from "express";
import GroupController from "../controllers/groupController";
import { authenticateToken } from "../middleware/auth";

const groupController = new GroupController();

export function setGroupRoutes(app: Router) {
  app.post(
    "/groups",
    authenticateToken,
    groupController.createGroup.bind(groupController)
  );
  app.get(
    "/groups/user",
    authenticateToken,
    groupController.getUserGroups.bind(groupController)
  );
  app.get(
    "/groups/:groupId/members",
    authenticateToken,
    groupController.getGroupMembers.bind(groupController)
  );
  app.post(
    "/groups/join",
    authenticateToken,
    groupController.joinGroup.bind(groupController)
  );
  app.get(
    "/groups/:groupId/invite",
    authenticateToken,
    groupController.getInviteInfo.bind(groupController)
  );
  app.post(
    "/groups/:groupId/rotate-invite",
    authenticateToken,
    groupController.rotateInviteCode.bind(groupController)
  );
  app.put(
    "/groups/:groupId",
    authenticateToken,
    groupController.updateGroup.bind(groupController)
  );
  app.delete(
    "/groups/:groupId",
    authenticateToken,
    groupController.deleteGroup.bind(groupController)
  );
  app.post(
    "/groups/:groupId/leave",
    authenticateToken,
    groupController.leaveGroup.bind(groupController)
  );
}
