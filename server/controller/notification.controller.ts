import { NextFunction, Request, Response } from "express";
import { catchAsyncError } from "../middleware/catch_async_error";
import ErrorHandler from "../utils/error_handler";
import notificationModel from "../model/notification.model";
import cron from "node-cron";


// get latest notifications
export const getNotifications = catchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const notifications = await notificationModel.find().sort({ createdAt: -1 }); // sorted in reverse order: latest notifications will be arranged first

        res.status(200).json({
            success: true,
            notifications
        });
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});

// update notification
export const updateNotifications = catchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const notification = await notificationModel.findById(req.params.id);

        if (!notification) {
            return next(new ErrorHandler("Notification not found", 400));
        } else {
            notification.status ? notification.status = 'read' : notification.status;
        }

        await notification.save();

        // get updated notifications list
        const notifications = await notificationModel.find().sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            notifications,
        });
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});

// delete notifications after 30 days {if they are read then only}
cron.schedule("0 0 0 * * *", async () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await notificationModel.deleteMany({status: "read", createdAt: {$lt: thirtyDaysAgo}});
})

