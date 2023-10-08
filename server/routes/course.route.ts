import express from "express";
import { editCourse, getAllCourses, getCourseByUser, getSingleCourse, uploadCourse } from "../controller/course.controller";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
const courseRouter = express.Router();

// Add Course
courseRouter.post("/course", isAuthenticated, authorizeRoles("admin"), uploadCourse);

// Edit Course
courseRouter.put("/course/:id", isAuthenticated, authorizeRoles("admin"), editCourse);

// get single course - preview
courseRouter.get("/course/:id", getSingleCourse);

// get all courses - not purchased
courseRouter.get("/courses", getAllCourses);

courseRouter.get("/course-content/:id", isAuthenticated, getCourseByUser);

export default courseRouter;