import { NextFunction, Request, Response } from "express";
import ErrorHandler from "../utils/error_handler";

export const ErrorMiddleware = (error: any, req: Request, res: Response, next: NextFunction) => {
    error.statusCode = error.statusCode || 500;
    error.message = error.message || 'Internal Server Error';

    if(error.name === 'CastError'){
        const message = `Resource not found. Invalid ${error.path}`;
        error = new ErrorHandler(message, 400);
    }

    if(error.code === 11000){
        const message = `Duplicate ${Object.keys(error.keyValue)} entered`;
        error = new ErrorHandler(message, 400);
    }

    if(error.name === 'JsonWebTokenError'){
        const message = `JWT is invalid, Please try again`;
        error = new ErrorHandler(message, 400);
    }

    if(error.name === 'TokenExpiredError'){
        const message = `JWT is expired, Please try again`;
        error = new ErrorHandler(message, 400);
    }

    res.status(error.statusCode).json({
        success: false,
        message: error.message,
    });
};