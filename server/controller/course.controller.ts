import { NextFunction, Request, Response } from "express";
import { catchAsyncError } from "../middleware/catch_async_error";
import ErrorHandler from "../utils/error_handler";
import cloudinary from "cloudinary";
import { createCourse } from "../services/course.service";
import CourseModel from "../model/course.model";

export const uploadCourse = catchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = req.body;
        if (!data) {
            return next(new ErrorHandler("Server: Didn't Received Data", 400));
        }
        const thumbnail = data.thumbnail;

        if (thumbnail) {
            const cloud = await cloudinary.v2.uploader.upload(thumbnail, {
                folder: "courses"
            });

            data.thumbnail = {
                public_id: cloud.public_id,
                url: cloud.secure_url,
            }
        }

        createCourse(data, res, next);
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});

export const editCourse = catchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    const data = req.body;
    const thumbnail = data.thumbnail;

    if (thumbnail) {
        await cloudinary.v2.uploader.destroy(thumbnail.public_id);

        const cloud = await cloudinary.v2.uploader.upload(thumbnail, {
            folder: "courses",
        });

        data.thumbnail = {
            public_id: cloud.public_id,
            url: cloud.secure_url,
        };
    }

    const courseID = req.params.id;

    const course = await CourseModel.findByIdAndUpdate(courseID, { $set: data }, { new: true });
    res.status(201).json({
        success: true,
        course,
    });
});