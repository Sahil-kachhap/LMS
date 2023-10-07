import express from "express";
import { activateUser, loginUser, logoutUser, registerUser } from "../controller/user.controller";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
const userRouter = express.Router();

// user registration api endpoint
userRouter.post('/register', registerUser);

// user account activation api endpoint
userRouter.post('/activate', activateUser);

// user login api endpoint
userRouter.post('/login', loginUser);

// logout user endpoint
userRouter.get('/logout', isAuthenticated, authorizeRoles("admin"), logoutUser);

export default userRouter;