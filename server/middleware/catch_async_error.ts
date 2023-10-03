import { NextFunction, Request, Response } from "express";

export const catchAsyncError = (AsyncFunc: any) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(AsyncFunc(req, res, next)).catch(next);
};