import { Response } from "express";
import { IUser } from "../model/user.model";
import { redis } from "./redis";

require('dotenv').config();

interface ITokenOptions {
  expires: Date;
  maxAge: number;
  httpOnly: boolean;
  sameSite: 'lax' | 'strict' | 'none' | undefined;
  secure?: boolean;
}

export const accessTokenExpire = parseInt(process.env.ACCESS_EXPIRE || '300', 10);
export const refreshTokenExpire = parseInt(process.env.REFRESH_EXPIRE || '1200', 10);

// cookie options
export const accessTokenOptions: ITokenOptions = {
  expires: new Date(Date.now() + accessTokenExpire * 60 * 60 * 1000),
  maxAge: accessTokenExpire * 60 * 60 * 1000,
  sameSite: 'lax',
  httpOnly: true
}

export const refreshTokenOptions: ITokenOptions = {
  expires: new Date(Date.now() + refreshTokenExpire * 24 * 60 * 60 * 1000),
  maxAge: refreshTokenExpire * 24 * 60 * 60 * 1000,
  sameSite: 'lax',
  httpOnly: true
}

export const sendToken = (user: IUser, statusCode: number, res: Response) => {
  // store user session in redis once they log in
  redis.set(user._id, JSON.stringify(user) as any);

  const accessToken = user.SignAccessToken();
  const refreshToken = user.SignRefreshToken();

  if (process.env.NODE_ENV === "production") {
    accessTokenOptions.secure = true;
  }

  res.cookie("access_token", accessToken, accessTokenOptions);
  res.cookie("refresh_token", refreshToken, refreshTokenOptions);

  res.status(statusCode).json({
    success: true,
    user,
    accessToken
  });
}