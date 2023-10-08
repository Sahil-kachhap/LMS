import express from "express";
import { editCourse, uploadCourse } from "../controller/course.controller";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
const courseRouter = express.Router();

// Add Course
courseRouter.post("/course", isAuthenticated, authorizeRoles("admin"), uploadCourse);

// Edit Course
courseRouter.put("/course/:id", isAuthenticated, authorizeRoles("admin"), editCourse);

export default courseRouter;