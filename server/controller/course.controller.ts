import { NextFunction, Request, Response } from "express";
import { catchAsyncError } from "../middleware/catch_async_error";
import ErrorHandler from "../utils/error_handler";
import cloudinary from "cloudinary";
import { createCourse } from "../services/course.service";
import CourseModel from "../model/course.model";
import { redis } from "../utils/redis";

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

// get single course - without purchasing
export const getSingleCourse = catchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const courseID = req.params.id;

        // check if required data is available in redis cache
        const courseFromCache = await redis.get(courseID);

        if (courseFromCache) {
            // return data right from the redis cache
            const course = JSON.parse(courseFromCache);
            res.status(200).json({
                success: true,
                course,
            });
        } else {
            const courseData = await CourseModel.findById(courseID).select("-courseData.videoUrl -courseData.links -courseData.questions -courseData.suggestions");

            // store db data in redis cache
            await redis.set(courseID, JSON.stringify(courseData));

            res.status(200).json({
                success: true,
                courseData
            });
        }
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});

// get all courses - without purchasing
export const getAllCourses = catchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const isCacheExist = await redis.get("allCourses");

        if (isCacheExist) {
            const courses = JSON.parse(isCacheExist);
            res.status(200).json({
                success: true,
                courses
            });
        } else {
            const courses = await CourseModel.find().select("-courseData.videoUrl -courseData.links -courseData.questions -courseData.suggestions");
            await redis.set("allCourses", JSON.stringify(courses));
            res.status(200).json({
                success: true,
                courses,
            });
        }
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});

// get course content once purchased
export const getCourseByUser = catchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userCourseList = req.user?.courses;
        const courseID = req.params.id;

        const courseExist = userCourseList?.find((course: any) => course._id.toString() === courseID);

        if(!courseExist){
            return next(new ErrorHandler("You are not eligible to access content of this course", 404));
        }

        const course = await CourseModel.findById(courseID);
        const content = course?.courseData;

        res.status(200).json({
            success: true,
            content,
        });
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});