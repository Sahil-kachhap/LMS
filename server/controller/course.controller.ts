import { NextFunction, Request, Response } from "express";
import { catchAsyncError } from "../middleware/catch_async_error";
import ErrorHandler from "../utils/error_handler";
import cloudinary from "cloudinary";
import { createCourse } from "../services/course.service";
import CourseModel from "../model/course.model";
import { redis } from "../utils/redis";
import mongoose from "mongoose";
import ejs from "ejs";
import path from "path";
import sendMail from "../utils/send_mail";

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

        if (!courseExist) {
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

// add question in course
interface IAddQuestionData {
    question: string,
    courseId: string,
    contentId: string
}

export const addQuestion = catchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { question, contentId, courseId }: IAddQuestionData = req.body;
        const course = await CourseModel.findById(courseId);

        if (!mongoose.Types.ObjectId.isValid(contentId)) {
            return next(new ErrorHandler("Invalid Content Id", 400));
        }

        const courseContent = course?.courseData.find((item: any) => item._id.equals(contentId));

        if (!courseContent) {
            return next(new ErrorHandler("Invalid Content Id", 400));
        }

        const newQuestion: any = {
            user: req.user,
            question,
            questionReplies: []
        }

        courseContent.questions.push(newQuestion);
        await course?.save();

        res.status(200).json({
            success: true,
            course
        })
    } catch (error: any) {
        next(new ErrorHandler(error.message, 400));
    }
});

// Answer or reply the questions
interface IAnswerQuestionsData {
    answer: string,
    questionId: string,
    contentId: string,
    courseId: string
}

export const answerQuestions = catchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { questionId, contentId, courseId, answer }: IAnswerQuestionsData = req.body;
        const course = await CourseModel.findById(courseId);

        if (!mongoose.Types.ObjectId.isValid(contentId)) {
            return next(new ErrorHandler("Invalid Content Id", 400));
        }

        const courseContent = course?.courseData.find((item: any) => item._id.equals(contentId));

        if (!courseContent) {
            return next(new ErrorHandler("Invalid Content Id", 400));
        }

        const question = courseContent?.questions.find((item: any) => item._id.equals(questionId));

        if (!question) {
            return next(new ErrorHandler("Invalid Question Id", 400));
        }

        const newAnswer: any = {
            user: req.user,
            answer
        }

        question.questionReplies?.push(newAnswer);
        await course?.save();

        if (req.user?._id === question.user._id) {
            // notification
        } else {
            const data = {
                name: question.user.name,
                title: courseContent.title
            }

            const html = await ejs.renderFile(path.join(__dirname, "../mails/question-reply.ejs"), data);
            try {
                await sendMail({
                    email: question.user.email,
                    subject: "Answer to your Question",
                    template: "question-reply.ejs",
                    data
                })
            } catch (error: any) {
                return next(new ErrorHandler(error.message, 400));
            }
        }

        res.status(200).json({
            success: true,
            course,
        })
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});

// add review
interface IReviewData {
    userId: string,
    review: string,
    rating: number
}
export const addReview = catchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        // only users who have purchased the course are eligible to write a review
        const courseList = req.user?.courses;
        const courseId = req.params.id;

        const isCourseExist = courseList?.some((item: any) => item._id.toString() === courseId.toString());

        if (!isCourseExist) {
            return next(new ErrorHandler("You are not eligible to write a review for this course", 400));
        }

        const course = await CourseModel.findById(courseId);

        const { review, rating }: IReviewData = req.body;

        const reviewData: any = {
            user: req.user,
            comment: review,
            rating,
        }

        course?.reviews.push(reviewData);

        let averageRating = 0;

        course?.reviews.forEach((review: any) => {
           averageRating += review.rating;
        });

        if(course){
            course.ratings = averageRating/course.reviews.length;
        }

        await course?.save();

        const notification = {
            title: "New Review Received",
            message: `${req.user?.name} has given a review in ${course?.name}`
        }

        res.status(200).json({
            success: true,
            course,
        })
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});

// reply to a review
interface IReplyReview{
   comment: string,
   review_id: string,
   course_id: string
}


export const replyToReview = catchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {comment, review_id, course_id}: IReplyReview = req.body;
      const course = await CourseModel.findById(course_id);

      if(!course){
        return next(new ErrorHandler("Course not found", 400));
      }

      const review = course.reviews.find((review: any) => review._id.toString() === review_id);

      if(!review){
        return next(new ErrorHandler("Review Not Found", 400));
      }

      const replyData: any = {
        user: req.user,
        comment
      }

      if(!review.commentReplies){
        review.commentReplies = [];
      }

      review.commentReplies.push(replyData);
      await course.save();

      res.status(200).json({
        success: true,
        course
      })
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});