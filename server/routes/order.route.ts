import express from "express";
import { isAuthenticated } from "../middleware/auth";
import { createOrder } from "../controller/order.controller";

const orderRouter = express.Router();

// create order: purchase course
orderRouter.post("/order", isAuthenticated, createOrder);

export default orderRouter;