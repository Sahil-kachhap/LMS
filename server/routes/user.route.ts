import express from "express";
import { activateUser, loginUser, logoutUser, registerUser } from "../controller/user.controller";
const userRouter = express.Router();

userRouter.post('/register', registerUser);
userRouter.post('/activate', activateUser);
userRouter.post('/login', loginUser);
userRouter.post('/logout', logoutUser);

export default userRouter;