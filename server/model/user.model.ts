import mongoose, { Document, Model, Schema } from "mongoose";
import bcrypt from "bcryptjs";
import { timeStamp } from "console";

export interface IUser extends Document {
    name: string;
    email: string;
    password: string;
    avatar: {
        public_id: string;
        url: string;
    },
    role: string;
    isVerified: boolean;
    courses: Array<{ course_id: string }>;
    comparePassword: (password: string) => Promise<boolean>;
};

const emailRegexPattern: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const userSchema: Schema<IUser> = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Please enter your name"],
    },
    email: {
        type: String,
        required: [true, "Please enter your email id"],
        validate: {
            validator: function (value: string) {
                return emailRegexPattern.test(value);
            },
            message: "Please enter a valid email-id",
        },
        unique: true,
    },
    password: {
        type: String,
        required: [true, 'Please enter your password'],
        minlength: [6, 'Password must be atleast 6 characters'],
        select: false,
    },
    avatar: {
        public_id: String,
        url: String,
    },
    role: {
        type: String,
        default: 'user',
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    courses: [
        {
            course_id: String,
        }
    ],
}, { timestamps: true });

// Hash Passwords before saving the data into DB
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        next();
    }

    this.password = await bcrypt.hash(this.password, 10);
    next();
})

// compare user entered password with the one stored in DB
userSchema.methods.comparePassword = async function (enteredPassword: string): Promise<boolean> {
    return await bcrypt.compare(enteredPassword, this.password);
}

// create model using the above user schema
const userModel: Model<IUser> = mongoose.model('User', userSchema);

export default userModel;