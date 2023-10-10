import mongoose, { Document, Model, Schema } from "mongoose"

export interface INotification extends Document{
  title: string,
  status: string,
  message: string,
  userId: string,
}

const NotificationSchema = new Schema<INotification>({
    title: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: true,
        default: "unread"
    },
    message: {
        type: String,
        required: true,
    }
},{timestamps: true});

const notificationModel:Model<INotification> = mongoose.model("Notification", NotificationSchema);

export default notificationModel;