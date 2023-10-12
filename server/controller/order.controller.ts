import { NextFunction, Request, Response } from "express";
import { catchAsyncError } from "../middleware/catch_async_error";
import { IOrder } from "../model/order.model";
import userModel from "../model/user.model";
import ErrorHandler from "../utils/error_handler";
import CourseModel from "../model/course.model";
import { newOrder } from "../services/order.service";
import ejs from "ejs";
import path from "path";
import sendMail from "../utils/send_mail";
import notificationModel from "../model/notification.model";

export const createOrder = catchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { course_id, payment_info } = req.body as IOrder;
        const user = await userModel.findById(req.user?._id);

        const isCourseAlreadyPurchased = user?.courses.some((course: any) => course._id.toString() === course_id);

        if (isCourseAlreadyPurchased) {
            return next(new ErrorHandler("You have already purchased this course", 400));
        }

        const course = await CourseModel.findById(course_id);

        if (!course) {
            return next(new ErrorHandler("Course doesn't exist", 400));
        }

        const data: any = {
            course_id: course._id,
            user_id: user?._id,
            payment_info,
        };

        const mailData = {
            order: {
                _id: course._id.toString().slice(0, 6),
                userName: req.user?.name,
                course: course.name,
                price: course.price,
                date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
            }
        }

        const html = await ejs.renderFile(path.join(__dirname, '../mails/order-confirmation.ejs'), { order: mailData });

        try{
           if(user){
             await sendMail({
                email: user.email,
                subject: "Order Confirmation",
                template: "order-confirmation.ejs",
                data: mailData,
             });
           }
        }catch(error: any){
            return next(new ErrorHandler(error.message, 400));
        }

        user?.courses.push(course._id);

        await user?.save();

        await notificationModel.create({
            user: user?._id,
            title: "New Order",
            message: `You have a new order from ${course?.name}`,
        });

        if(course.purchased){
            course.purchased += 1;
        }

        course.purchased ? course.purchased += 1: course.purchased;

        await course.save();
        
        newOrder(data, res, next);
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});