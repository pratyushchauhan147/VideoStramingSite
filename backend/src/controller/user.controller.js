import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from '../utils/ApiError.js'
import {User} from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinery.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const cookieOptions={
        httpOnly: true,
        secure :false,
    
    }
const generateAccessAndRefreshToken = async (userId) => {
    try{
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false});
        return {accessToken, refreshToken};

    }catch(error){
        throw new ApiError(500,"Failed to generate tokens");
    }

}

const registerUser = asyncHandler( async (req,res)=>{
    //get data from req.body
    const {username, email, password,fullname} = req.body;
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
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
     let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }
    
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar image is required");
    }
    console.log(avatarLocalPath)
    
    //Upload files to cloudinery
    const avatar = await uploadOnCloudinary(avatarLocalPath, "VideoStreamingSite/avatars");
    const coverImage = coverImageLocalPath ? await uploadOnCloudinary(coverImageLocalPath, "VideoStreamingSite/coverImages") : null;
    if(!avatar){
        throw new ApiError(500,"Failed to upload avatar image");
    }


    //Create new user
    const newUser = await User.create({
        username:username.toLowerCase(),
        fullname,
        email,
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
    });

    const createdUser = await User.findById(newUser._id).select("-password -refreshToken");
    if(!createdUser){
        throw new ApiError(500,"Failed to create user");
    }   

    res.status(200).json(
        new ApiResponse(200, createdUser, "User registered successfully"));
})

const loginUser = asyncHandler( async (req,res)=>{
    //get data from req.body
    const {email, password,username} = req.body;

    //Simple validation
    if(!username && !email)
    {
        throw new ApiError(400,"Username and Email are required");
    }
    if(!password)
    {
        throw new ApiError(400,"Password is required");
    }
    //Check if user exists
    const user = await User.findOne({$or:[{username},{email}]})
    if(!user){
        throw new ApiError(404,"User not found");
    }
    
   const isPasswordCorrect = await user.isPasswordCorrect(password)
   if(!isPasswordCorrect){
        throw new ApiError(401,"Invalid password");
   }    

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id);
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");
    const options={
        httpOnly: true,
        secure :false
    
    }
    return res.status(200)
    .cookie("refreshToken", refreshToken, options)
    .cookie("accessToken", accessToken, options).
    json(
        new ApiResponse(200, {user: loggedInUser, accessToken,refreshToken}, "User logged in successfully")
    )

})

const logoutUser = asyncHandler( async (req,res)=>{

    await User.findByIdAndUpdate(req.user._id, {
        $set:{refreshToken: undefined}
    }, {new:true});

    res.status(200)
    .clearCookie("refreshToken", cookieOptions)
    .clearCookie("accessToken", cookieOptions)
    .json(
        new ApiResponse(200, null, "User logged out successfully")
    );

})

const refreshAccessToken = asyncHandler( async (req,res)=>{
try {
        
    const incomeingRefreshToken = req.cookies.refreshToken;
    if(!incomeingRefreshToken){
        throw new ApiError(401,"Refresh token is missing");     
    }
    
    const decoded = jwt.verify(incomeingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    
    const user = await User.findById(decoded?.id)
    if(!user){
        throw new ApiError(404,"User not found");
    }
    
    if(user?.refreshToken !== incomeingRefreshToken){
        throw new ApiError(401,"Invalid refresh token");
    }
    
    const {accessToken, newrefreshToken} = await generateAccessAndRefreshToken(user._id);
    
    return res.status(200)
    .cookie("refreshToken", newrefreshToken, cookieOptions)
    .cookie("accessToken", accessToken, cookieOptions).
    json(
        new ApiResponse(200, {accessToken , newrefreshToken}, "Access token refreshed successfully")
    )
    
    
} catch (error) { 
    res.json(error)
    throw new ApiError(500,"Failed to refresh access token");
    
}})

export  {registerUser,loginUser,logoutUser, refreshAccessToken};