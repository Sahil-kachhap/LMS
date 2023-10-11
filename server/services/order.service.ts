import { NextFunction, Response } from "express";
import { catchAsyncError } from "../middleware/catch_async_error";
import OrderModel from "../model/order.model";

export const newOrder = catchAsyncError(async (data: any, next: NextFunction, res: Response) => {
    const order = await OrderModel.create(data);

    res.status(201).json({
        success: true,
        order,
    });
});