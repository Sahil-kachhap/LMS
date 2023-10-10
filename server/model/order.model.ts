import mongoose, { Document, Model, Schema } from "mongoose";

export interface IOrder extends Document{
  course_id: string,
  user_id: string,
  payment_info: object
}

const orderScema = new Schema<IOrder>({
    course_id: {
        type: String,
        required: true
    },
    user_id: {
        type: String,
        required: true
    },
    payment_info: {
        type: Object,
    }
}, {timestamps: true});

const OrderModel: Model<IOrder> = mongoose.model("Order", orderScema);

export default OrderModel;