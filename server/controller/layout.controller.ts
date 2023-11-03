import { NextFunction, Request, Response } from "express";
import { catchAsyncError } from "../middleware/catch_async_error";
import ErrorHandler from "../utils/error_handler";
import LayoutModel from "../model/layout.model";
import cloudinary from "cloudinary";

export const createLayout = catchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { type } = req.body;
        const isTypeExist = await LayoutModel.findOne({ type });

        if (isTypeExist) {
            return next(new ErrorHandler(`${isTypeExist} already exists.`, 500));
        }

        if (type === "Banner") {
            const { image, title, subtitle } = req.body;
            const cloud = await cloudinary.v2.uploader.upload(image, { folder: "layout", });
            const banner = {
                image: {
                    public_id: cloud.public_id,
                    url: cloud.url,
                },
                title,
                subtitle,
            }
            await LayoutModel.create(banner);
        }
        if (type === "FAQ") {
            const { faq } = req.body;
            const faqItems = await Promise.all(
                faq.map(async (item: any) => {
                    return {
                        question: item.question,
                        answer: item.answer
                    };
                })
            );
            await LayoutModel.create({ type: "FAQ", faq: faqItems });
        }
        if (type === "Categories") {
            const { categories } = req.body;
            const categoryItems = await Promise.all(
                categories.map(async (item: any) => {
                    return {
                        title: item.title
                    };
                })
            );
            await LayoutModel.create({ type: "Categories", categories: categoryItems });
        }

        res.status(200).json({
            success: true,
            message: "Layout created successfully"
        });
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});

// edit layout
export const editLayout = catchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const bannerData: any = await LayoutModel.findOne({type: "Banner"});
        const { type } = req.body;
        if (type === "Banner") {
            const { image, title, subtitle } = req.body;
            await cloudinary.v2.uploader.destroy(bannerData?.image.public_id)
            const cloud = await cloudinary.v2.uploader.upload(image, {folder: "layout"});
            const banner = {
                image: {
                    public_id: cloud.public_id,
                    url: cloud.url,
                },
                title,
                subtitle,
            }
            await LayoutModel.findByIdAndUpdate(bannerData?._id, {banner});
        }
        if (type === "FAQ") {
            const { faq } = req.body;
            const faqItem = await LayoutModel.findOne({type: "FAQ"})
            const faqItems = await Promise.all(
                faq.map(async (item: any) => {
                    return {
                        question: item.question,
                        answer: item.answer
                    };
                })
            );
            await LayoutModel.findByIdAndUpdate(faqItem?._id, { type: "FAQ", faq: faqItems });
        }
        if (type === "Categories") {
            const { categories } = req.body;
            const categoriesData = await LayoutModel.findOne({type: "Categories"})

            const categoryItems = await Promise.all(
                categories.map(async (item: any) => {
                    return {
                        title: item.title
                    };
                })
            );
            await LayoutModel.create(categoriesData?._id,{ type: "Categories", categories: categoryItems });
        }

        res.status(200).json({
            success: true,
            message: "Layout updated successfully"
        });
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 500));
    }
});

export const getLayoutByType = catchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try{
      const {type} = req.body;
      const layout = await LayoutModel.findOne({type});

      res.status(201).json({
        success: true,
        layout,
      })
    }catch(error: any){
        return next(new ErrorHandler(error.message, 500));
    }
})