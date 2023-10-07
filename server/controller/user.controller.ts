import { Request, Response, NextFunction } from "express";
import cloudinary from "cloudinary";
import userModel, { IUser } from "../model/user.model";
import ErrorHandler from "../utils/error_handler";
import { catchAsyncError } from "../middleware/catch_async_error";
import jwt, { JwtPayload, Secret } from "jsonwebtoken";
import ejs from "ejs";
import path from "path";
import sendMail from "../utils/send_mail";
import { accessTokenOptions, refreshTokenOptions, sendToken } from "../utils/jwt";
import { redis } from "../utils/redis";
import { getUserById } from "../services/user.service";
require('dotenv').config();

interface IRegisteredUser {
    name: string;
    email: string;
    password: string;
    avatar?: string;
};

export const registerUser = catchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, email, password } = req.body;

        const isEmailExist = await userModel.findOne({ email });

        if (isEmailExist) {
            return next(new ErrorHandler("Email Already Exists", 400));
        }

        const user: IRegisteredUser = {
            name,
            email,
            password
        }

        // generate 4 digit activation code that will be sent to user's email id for account activation
        const { token, activationCode } = createActivationToken(user);

        const data = { user: { name: user.name }, code: activationCode };
        const html = await ejs.renderFile(path.join(__dirname, "../mails/account-activation.ejs"), data);

        try {
            await sendMail({
                email: user.email,
                subject: "Activate your account",
                template: "account-activation.ejs",
                data,
            });

            res.status(401).json({
                success: true,
                message: `Please check your mail: ${user.email} to activate your account`,
                activationToken: token
            });

        } catch (error: any) {
            return next(new ErrorHandler(error.message, 400));
        }

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});

interface IActivationToken {
    token: string;
    activationCode: string;
}

export const createActivationToken = (user: any): IActivationToken => {
    const activationCode = Math.floor(1000 + Math.random() * 9000).toString();

    const token = jwt.sign({ user, activationCode }, process.env.ACTIVATION_SECRET as Secret, { expiresIn: "5m" });
    return { token, activationCode };
}

// account activation 
interface IActivationRequest {
    activationCode: string;
    activationToken: string;
}

export const activateUser = catchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { activationToken, activationCode } = req.body as IActivationRequest;

        const newUser: { user: IUser, activationCode: string } = jwt.verify(
            activationToken,
            process.env.ACTIVATION_SECRET as string
        ) as { user: IUser, activationCode: string }

        if (newUser.activationCode !== activationCode) {
            return next(new ErrorHandler("Invalid Activation Code", 400));
        }

        const { name, email, password } = newUser.user;

        const isEmailExist = await userModel.findOne({ email });
        if (isEmailExist) {
            return next(new ErrorHandler("Email Already Exists", 400));
        }

        const user = await userModel.create({
            name,
            email,
            password,
        });

        res.status(201).json({
            success: true,
        });

    } catch (error: any) {
        return new ErrorHandler(error.message, 400);
    }
})

// login user
interface ILoginRequest {
    email: string;
    password: string;
}

export const loginUser = catchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body as ILoginRequest;

        if (!email || !password) {
            return next(new ErrorHandler("Please Enter email and password", 400));
        }

        const user = await userModel.findOne({ email }).select("+password");

        if (!user) {
            return next(new ErrorHandler("Invalid email or password", 400));
        }

        const isPasswordMatched = await user.comparePassword(password);

        if (!isPasswordMatched) {
            return next(new ErrorHandler("Invalid Email or Password", 400));
        }

        sendToken(user, 200, res);
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});

// logout user
export const logoutUser = catchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        res.cookie("access_token", "", { maxAge: 1 });
        res.cookie("refresh_token", "", { maxAge: 1 });
        const userID = req.user?._id || "";
        redis.del(userID);

        res.status(200).json({
            success: true,
            message: "Logged out successfully"
        })
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});

// update access token
export const updateAccessToken = catchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const refresh_token = req.cookies.refresh_token;
        const decodePayload = jwt.verify(refresh_token, process.env.REFRESH_TOKEN as string) as JwtPayload;

        if (!decodePayload) {
            return next(new ErrorHandler("Could not refresh token", 400));
        }

        const session = await redis.get(decodePayload.id as string);

        if (!session) {
            return next(new ErrorHandler("Could not refresh token", 400));
        }

        const user = JSON.parse(session);
        const accessToken = jwt.sign({ id: user._id }, process.env.ACCESS_TOKEN as string, { expiresIn: "5m" });
        const refreshToken = jwt.sign({ id: user._id }, process.env.REFRESH_TOKEN as string, { expiresIn: "3d" });

        req.user = user;
        res.cookie("access_token", accessToken, accessTokenOptions);
        res.cookie("refresh_token", refreshToken, refreshTokenOptions);

        res.status(200).json({
            success: true,
            accessToken
        });

    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});

// get user info
export const getUserInfo = catchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user_id = req.user?._id as string;
        getUserById(user_id, res);
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
})

// social Auth
interface ISocialAuthBody {
    name: string,
    email: string,
    avatar: string,
}

export const socialAuth = catchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, email, avatar } = req.body as ISocialAuthBody;
        const user = await userModel.findOne({ email });

        if (!user) {
            const newUser = await userModel.create({ name, email, avatar });
            sendToken(newUser, 200, res);
        } else {
            sendToken(user, 200, res);
        }
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});

// update user info
interface IUpdateUserInfoBody {
    name: string,
    email: string
}

export const updateUserInfo = catchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { name, email } = req.body as IUpdateUserInfoBody;
        const userId = req.user?._id;
        const user = await userModel.findById(userId);

        if (email && user) {
            const isEmailExist = await userModel.findOne({ email });

            if (isEmailExist) {
                return next(new ErrorHandler("Email already exists", 400));
            }
            user.email = email;
        }

        if (name && user) {
            user.name = name;
        }

        await user?.save();

        await redis.set(userId, JSON.stringify(user));

        res.status(201).json({
            success: true,
            user,
        });
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});

// update user password
interface IUpdatePasswordBody {
    oldPassword: string;
    newPassword: string;
}

export const updatePassword = catchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { newPassword, oldPassword } = req.body as IUpdatePasswordBody;

        if (!newPassword || !oldPassword) {
            return next(new ErrorHandler("Please Enter old and new password to reset", 400));
        }

        const user = await userModel.findById(req.user?._id).select("+password");

        if (user?.password === undefined) {
            return next(new ErrorHandler("password update not supported for socially authenticated users", 400));
        }

        const isPasswordMatched = await user.comparePassword(oldPassword);
        if (!isPasswordMatched) {
            return next(new ErrorHandler("Invalid Old Password", 400));
        }

        user.password = newPassword;
        await user.save();
        await redis.set(req.user?._id, JSON.stringify(user));


        res.status(201).json({
            success: true,
            message: "Password Updated Successfully.",
            user
        })
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});

// update profile picture/avatar
interface IProfileAvatar {
    avatar: string
}

export const updateAvatar = catchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { avatar } = req.body as IProfileAvatar;
        
        if(!avatar){
            return next(new ErrorHandler("Please upload a image to update profile avatar", 400));
        }

        const userId = req.user?._id;
        const user = await userModel.findById(userId);

        if (avatar && user) {
            if (user?.avatar.public_id) {
                await cloudinary.v2.uploader.destroy(user.avatar.public_id);
                const cloud = await cloudinary.v2.uploader.upload(avatar, {
                    folder: "avatars",
                    width: 150,
                });

                user.avatar = {
                    public_id: cloud.public_id,
                    url: cloud.secure_url
                }
            } else {
                const cloud = await cloudinary.v2.uploader.upload(avatar, {
                    folder: "avatars",
                    width: 150,
                });

                user.avatar = {
                    public_id: cloud.public_id,
                    url: cloud.secure_url
                }
            }
        }

        await user?.save();
        await redis.set(userId, JSON.stringify(user));

        res.status(200).json({
            success: true,
            message: "Profile Image Updated Successfully",
            user,
        })
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});