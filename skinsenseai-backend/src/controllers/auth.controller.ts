import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt, { SignOptions} from "jsonwebtoken";
import prisma from "../config/prisma.config.js";
import { ApiResponse } from '../types/response.types.js'
import { timeStamp } from "node:console";

// Generate JWT Token
const generateToken = (userId: string): string => {
  const payload = { userId };
  const secret = process.env.JWT_SECRET as string;
  const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'];
  
  return jwt.sign(payload, secret, { expiresIn });
};

// Sign up Controller
export const signup = async (req: Request, res : Response): Promise<void> => {
  try{

    const { email, password } = req.body;

    //validate input 
    if(!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Email and password are required',
      } as ApiResponse);
      return;
    }
    
    // check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if(existingUser){
      res.status(409).json(
        {
          success: false,
          message: 'User wtih this email already exists',
        } as ApiResponse);
        return;
    }

    // Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

    // create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    });

    // Generate token
    const token = generateToken(user.id);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          createdAt: user.createdAt,
        },
        token
      },
      timeStamp: new Date().toISOString(),
    } as ApiResponse );
  } catch (error) {
    console.error('Signup error: ', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during signup',
    } as ApiResponse);
  }
};
