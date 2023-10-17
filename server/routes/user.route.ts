import express from "express";
import { activateUser, fetchAllUsers, getUserInfo, loginUser, logoutUser, registerUser, socialAuth, updateAccessToken, updateAvatar, updatePassword, updateUserInfo, updateUserRole } from "../controller/user.controller";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
const userRouter = express.Router();

// user registration api endpoint
userRouter.post('/register', registerUser);

// user account activation api endpoint
userRouter.post('/activate', activateUser);

// user login api endpoint
userRouter.post('/login', loginUser);

// logout user endpoint
userRouter.get('/logout', isAuthenticated, logoutUser);

// refresh access token
userRouter.get("/refresh-token", updateAccessToken);

// get user info
userRouter.get("/me", isAuthenticated, getUserInfo);

// social auth
userRouter.post("/social-auth", socialAuth);

// update user info
userRouter.put("/update-user-info", isAuthenticated, updateUserInfo);

// update user password
userRouter.put("/update-password", isAuthenticated, updatePassword);

// update user profile picture
userRouter.put("/update-avatar", isAuthenticated, updateAvatar);

// get all users - admin
userRouter.get("/admin/users", isAuthenticated, authorizeRoles("admin"), fetchAllUsers);

// update user role - admin
userRouter.put("/admin/role", isAuthenticated, authorizeRoles("admin"), updateUserRole);
export default userRouter;