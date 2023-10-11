require("dotenv").config()
import express from "express"
import cookieParser from "cookie-parser"
import cors from "cors"
import userRouter from "./routes/user.route"
import { ErrorMiddleware } from "./middleware/error"
import courseRouter from "./routes/course.route"
import orderRouter from "./routes/order.route"
export const app = express()

// request body should be of max 50 mb
app.use(express.json({limit: "50mb"}));

// cookie parser middleware
app.use(cookieParser())

// cors middleware
app.use(cors({
    origin: process.env.ORIGIN
}))

// routes
app.use('/api/v1', userRouter);
app.use('/api/v1', courseRouter);
app.use('/api/v1', orderRouter);

// test api 
app.get("/test", (req, res, next) => {
    res.status(200).json({
        'status-code': 200,
        'usage': 'tesing'
    })
});

// unknown route - if user requests using invalid api endpoint
app.all("*", (req, res, next) => {
    const error = Error(`Route ${req.originalUrl} not found`) as any;
    error.statusCode = 404;
    next(error);
})


// custom error handler middleware
app.use(ErrorMiddleware);