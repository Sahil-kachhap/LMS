import { NextFunction, Response } from "express";
import { catchAsyncError } from "../middleware/catch_async_error";
import OrderModel from "../model/order.model";

export const newOrder = catchAsyncError(async (data: any, res: Response, next: NextFunction) => {
    const order = await OrderModel.create(data);

    res.status(201).json({
        success: true,
        order,
    });
});

// get all orders service for admins
export const getAllOrderService = async (res: Response) => {
    const orders = await OrderModel.find().sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        orders,
    });
}