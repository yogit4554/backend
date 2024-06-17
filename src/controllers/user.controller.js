import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/apiError.js"
import {User} from "../models/user.models.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse } from "../utils/apiResponse.js"

const registerUser = asyncHandler(async(req,res)=>{
    // get user details from frontend 
    // validation- not empty 
    // check of user alredy exists: by username and email
    // check for images, check for avatar
    // if available upload them to cloudinary
    // create user object - create entry in db 
    // remove password and refresh token field from response
    // check for user creation 
    // return result

    ///  getting data 
    const {fullName,email,username,password}=req.body // will get data by req.body
    console.log("email: ",email);
    /*if(fullName===""){
        throw new ApiError(400,"fullname is required")
    }*/// by using this method check we have to check all the i f cases 

    if([fullName,email,username,password].some((field)=>field?.trim()==="")){
        throw new ApiError(400,"fullname is required")
    }

    // checking alredy exist or not 
    const existedUser = User.findOne({
        $or:[{username},{email}]
    })
    
    if(existedUser ){
        throw new ApiError(409,"User with email or username alredy exists!!")
    }

    ///check for image || check for avatar
    const avatarLocalPath= req.files?.avatar[0]?.path;
    const coverImageLocalPath= req.files?.coverImage[0]?.path;

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400,"Avatar file is required")
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const CreatedUser= await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!CreatedUser){
        throw new ApiError(500, "Something went wrong while registering the user!!!")
    }

    return res.status(201).json(
        new ApiResponse(200,CreatedUser,"User Registered Succesfully")
    )

});

export {registerUser}

