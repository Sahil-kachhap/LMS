import express from "express";
import { addQuestion, addReview, answerQuestions, editCourse, getAllCourses, getCourseByUser, getSingleCourse, uploadCourse } from "../controller/course.controller";
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

// get course content
courseRouter.get("/course-content/:id", isAuthenticated, getCourseByUser);

// add questions to a course
courseRouter.put("/course/question", isAuthenticated, addQuestion);

// reply to questions
courseRouter.put("/course/answer", isAuthenticated, answerQuestions);

// add review
courseRouter.put("/review/:id", isAuthenticated, addReview);

export default courseRouter;