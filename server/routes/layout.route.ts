import express from "express";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import { createLayout, editLayout, getLayoutByType } from "../controller/layout.controller";
const layoutRouter = express.Router();

layoutRouter.post("/layout", isAuthenticated, authorizeRoles("admin"), createLayout);

layoutRouter.put("/layout", isAuthenticated, authorizeRoles("admin"), editLayout);

layoutRouter.get("/layout", getLayoutByType);
export default layoutRouter;