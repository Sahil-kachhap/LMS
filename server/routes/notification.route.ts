import express from "express";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import { getNotifications, updateNotifications } from "../controller/notification.controller";

const notificationRouter = express.Router();

// get notifications -- only for admins
notificationRouter.get("/notifications", isAuthenticated, authorizeRoles("admin"), getNotifications);

// update notification
notificationRouter.put("/notification/:id", isAuthenticated, authorizeRoles("admin"), updateNotifications);

export default notificationRouter;