import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
export const verifyJWT = asyncHandler( async (req,res,next)=>{

    try {
      const accessToken = req.cookies?.accessToken || req.headers.authorization?.replace(/^Bearer\s+/, '');
        
        if(!accessToken){
            throw new ApiError(401,"Access token not found");
        }
       const decodedToken = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
      
       const user = await User.findById(decodedToken?._id).select("-password -refreshToken");
        if(!user){
            throw new ApiError(404,"User not found");
        }
        req.user = user;
        next();
    } catch (error) {
        res.json({message:error.message})
        throw new ApiError(401,`Authentication failed ${error.message}`);
        
    }

});
