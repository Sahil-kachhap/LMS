import { NextFunction, Request, Response } from "express";
import { catchAsyncError } from "./catch_async_error";
import ErrorHandler from "../utils/error_handler";
import jwt, { JwtPayload } from "jsonwebtoken";
import { redis } from "../utils/redis";

export const isAuthenticated = catchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    const access_token = req.cookies.access_token as string;

    if(!access_token){
        return next(new ErrorHandler("Please Login to access this resource", 400));
    }

    const decoded = jwt.verify(access_token, process.env.ACCESS_TOKEN as string) as JwtPayload;

    if(!decoded){
        return next(new ErrorHandler("Your session got expired, Please login back to continue", 400));
    }

    const user = await redis.get(decoded.id);

    if(!user){
        return next(new ErrorHandler("user not found", 400));
    }

    req.user = JSON.parse(user);
    next();
})

// validate user roles
export const authorizeRoles = (...roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if(!roles.includes(req.user?.role || "")){
            return next(new ErrorHandler(`Role: ${req.user?.role} is not allowed to access this resource`, 400));
        }
        next();
    }
}