import { Response } from "express";
import { catchAsyncError } from "../middleware/catch_async_error";
import CourseModel from "../model/course.model";

export const createCourse = catchAsyncError(async (data: any, res: Response) => {
   const course = await CourseModel.create(data);
   res.status(201).json({
     success: true,
     course,
   });
});

export const getAllCoursesService = async (res: Response) => {
  const courses = await CourseModel.find().sort({ createdAt: -1 });

  res.status(200).json({
      success: true,
      courses,
  });
}