import { Request, Response, NextFunction } from "express";
import userModel, { IUser } from "../model/user.model";
import ErrorHandler from "../utils/error_handler";
import { catchAsyncError } from "../middleware/catch_async_error";
import jwt, { Secret } from "jsonwebtoken";
import ejs from "ejs";
import path from "path";
import sendMail from "../utils/send_mail";
import { sendToken } from "../utils/jwt";
import { redis } from "../utils/redis";
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
   try{
     res.cookie("access_token", "", {maxAge: 1});
     res.cookie("refresh_token", "", {maxAge: 1});
     const userID = req.user?._id || "";
     redis.del(userID);

     res.status(200).json({
        success: true,
        message: "Logged out successfully"
     })
   }catch(error: any){
     return next(new ErrorHandler(error.message, 400));
   }
});