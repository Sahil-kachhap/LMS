import express from "express";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import { createOrder, getAllOrders } from "../controller/order.controller";

const orderRouter = express.Router();

// create order: purchase course
orderRouter.post("/order", isAuthenticated, createOrder);

// get all orders - admin
orderRouter.get("/admin/orders", isAuthenticated, authorizeRoles("admin"), getAllOrders);

export default orderRouter;