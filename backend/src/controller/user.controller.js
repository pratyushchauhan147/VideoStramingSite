import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from '../utils/ApiError.js'
import {User} from "../models/user.model.js";
import {uploadOnCloudinary,deleteFromCloudinary} from "../utils/cloudinery.js"
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

const changeCurrentPassword = asyncHandler( async (req,res)=>{
    //get data from req.body
    const {oldPassword, newPassword} = req.body;
    //Simple validation
    if(!oldPassword || !newPassword){
        throw new ApiError(400,"Old password and new password are required");
    }

    const user = await User.findById(req.user._id);
    if(!user){
        throw new ApiError(404,"User not found");
    }
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    if(!isPasswordCorrect){
         throw new ApiError(401,"Old password is incorrect");
    }

    user.password = newPassword;
    await user.save({validateBeforeSave:false});
    res.status(200).json(
        new ApiResponse(200, null, "Password changed successfully")
    );
}
);

const updateUserDetails= asyncHandler( async (req,res)=>{
    // Implementation for updating user details goes here
    const {fullname , email} = req.body;

    if(!fullname || !email){
        throw new ApiError(400,"Fullname and email are required");
    }
    const user = await User.findByIdAndUpdate(req.user?._id,{
        $set:{
            fullname,
            email
        }
    },{new:true}).select("-password -refreshToken");
    res.status(200).json(
        new ApiResponse(200, user, "User details updated successfully")
    );

});

const updateUserAvatar= asyncHandler( async (req,res)=>{

    const avatarLocalPath = req.file?.path;

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar image is required");
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath, "VideoStreamingSite/avatars");
    if(!avatar){
        throw new ApiError(500,"Failed to upload avatar image");
    }
    const oldavatar= await User.findById(req.user?._id).select("avatar");

    const user = await User.findByIdAndUpdate(req.user?._id,{
        $set:{
            avatar: avatar.url
        }
    },{new:true}).select("-password -refreshToken");

    //await deleteFromCloudinary(oldavatar.avatar);
    return res.status(200).json(
        new ApiResponse(200, user, "User avatar updated successfully")
    );
});


const updateUserCoverImage= asyncHandler( async (req,res)=>{

    const coverImageLocalPath = req.file?.path;

    if(!coverImageLocalPath){
        throw new ApiError(400,"Cover image is required");
    }
    const coverImage = await uploadOnCloudinary(coverImageLocalPath, "VideoStreamingSite/coverImages");
    if(!coverImage){
        throw new ApiError(500,"Failed to upload cover image");
    }

    const user = await User.findByIdAndUpdate(req.user?._id,{
        $set:{
            coverImage: coverImage.url
        }
    },{new:true}).select("-password -refreshToken");

    return res.status(200).json(
        new ApiResponse(200, user, "User cover image updated successfully")
    );
});

const getCurrentUser= asyncHandler( async (req,res)=>{
    return res.status(200).json(
        new ApiResponse(200, req.user, "Current user fetched successfully")
    );
});

const getUserChannelProfile= asyncHandler( async (req,res)=>{

    const {username} = req.params;
    
    if(!username?.trim()){
        throw new ApiError(400,"Username is required");
    }   
    //We will use Aggregation to fetch user profile along with total videos and total views
    const channel = await User.aggregate([
        {
            $match:{
                username: username?.toLowerCase()
            }
        },
        {
            $lookup:{
                    from:"subscriptions",
                    localField:"_id",
                    foreignField:"channel",
                    as:"subscribers"
            }
        },
        {
            $lookup:{
                    from:"subscriptions",
                    localField:"_id",
                    foreignField:"subscriber",
                    as:"subscribedTo"
            }
        },
        {
            $addFields:{
                subscriberCount: { $size: "$subscribers" },
                channelsSubscribedToCount: { $size: "$subscribedTo" },
                isSubscribed: { $in:[req.user?._id,"subscribers.subscriber"] },
                then: true,
                else: false
            }
        },
        {
            $project:{
                password:0,
                refreshToken:0,
                fullname:1,
                email:1,
                username:1,
                avatar:1,
                coverImage:1,
                channelsSubscribedToCount:1,
                subscriberCount:1,
                isSubscribed:1,


            }
        }
    ]);
    console.log(channel);
    if(!channel || channel.length === 0){
        throw new ApiError(404,"Channel not found");
    }

    return res.status(200).json(
        new ApiResponse(200, channel[0], "Channel profile fetched successfully")
    );

});

const getWatchHistory = asyncHandler( async (req,res)=>{

    const user = await User.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                pipeline:[{
                    $lookup:{
                        from:"users",
                        localField:"owner",
                        foreignField:"_id",
                        as:"owner",
                        pipeline:[{
                            $project:{
                                username:1,
                                password:0,
                                avatar:1,}

                        }]
                    }
                    },{
                        $addFields:{
                            owner: { $arrayElemAt: ["$owner", 0] }

                        }
                    }]
                },
            }
        ])

        res.status(200).json(
            new ApiResponse(200, user[0]?.watchHistory || [], "Watch history fetched successfully")
        );

});

export  {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateUserDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
    

};