import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from '../utils/ApiError.js'
import {User} from "../models/user.model.js";
import {uploadToCloudinary} from "../utils/cloudinery.js"
import { ApiResponse } from "../utils/ApiResponse.js";
const registerUser = asyncHandler( async (req,res)=>{
    //get data from req.body
    const {username, email, password,fullname,} = req.body;
    console.log(email)
    //Simple validation
    if([fullname,username,email,password].some((field)=> field?.trim() === "")){
        throw new ApiError(400,"All fields are required");
    }
    if(password.length < 6){
        throw new ApiError(400,"Password must be at least 6 characters");
    }  
    //Check if user already exists
    const existedUser = await User.findOne({ $or:[{email},{username}] })
    if(existedUser){
        throw new ApiError(409,"User already exists with this email or username");
    }

    //Files from multer
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar image is required");
    }
    
    //Upload files to cloudinery
    const avatar = await uploadToCloudinary(avatarLocalPath, "VideoStreamingSite/avatars");
    const coverImage = coverImageLocalPath ? await uploadToCloudinary(coverImageLocalPath, "VideoStreamingSite/coverImages") : null;
    if(!avatar){
        throw new ApiError(500,"Failed to upload avatar image");
    }


    //Create new user
    const newUser = User.create({
        username:username.tolowerCase(),
        fullname,
        email,
        password,
        avatar: avatar.url,
        coverImage: coverImage?.secure_url || "",
    });

    const createdUser = await User.findById(newUser._id).select("-password -refreshToken");
    if(!createdUser){
        throw new ApiError(500,"Failed to create user");
    }   

    res.status(200).json(
        new ApiResponse(200, createdUser, "User registered successfully"));
})

export  {registerUser}