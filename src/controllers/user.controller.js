import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/apiError.js"
import {User} from "../models/user.models.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {ApiResponse } from "../utils/apiResponse.js"

const generateAccessAndRefreshTokens= async(userId)=>{
    try{
        const user= await User.findById(userId);
        const accessToken= user.generateAccessToken()
        const refreshToken= user.generateRefreshToken()

        user.refreshToken=refreshToken
        await user.save({validateBeforeSave:false})

        return {accessToken,refreshToken}
    }
    catch(error){
        throw new ApiError(500,"Somethinf went wrong while generating refresh and  access token")
    }
}

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
    const existedUser =await User.findOne({
        $or:[{username},{email}]
    })
    
    if(existedUser ){
        throw new ApiError(409,"User with email or username alredy exists!!")
    }

    ///check for image || check for avatar
    const avatarLocalPath= req.files?.avatar[0]?.path;
    //const coverImageLocalPath= req.files?.coverImage[0]?.path;
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
        coverImageLocalPath=req.files.coverImage[0]?.path;
    }

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

const loginUser=asyncHandler(async(req,res)=>{
    // req body -> data 
    // username or email (kisi ek se login use kro ) 
    // find the user 
    // if user found check password 
    // generate access and refresh token 
    // send above token in cookies 

    const {email,username,password}=req.body
    if(!(username || email)){
        throw new ApiError(400,"username or email is required")
    }

    // this is  the way to take any data which is present either emial or user
    const user = await User.findOne({
        $or:[{username},{email}]
    })

    if(!user){
        throw new ApiError(404,"User does not exist")
    }

    const isPaswordValid = await user.isPasswordCorrect(password)

    if(!isPaswordValid){
        throw new ApiError(401,"Invalid User credentials ")
    }

    const {accessToken,refreshToken}=await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options={
        httpOnly:true,
        secure:true
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(200,{
            user:loggedInUser,accessToken,refreshToken
        },"User logged in Successfuly")
    )
})


const logoutUser= asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(req.user._id,{
        $set:{
            refreshToken:undefined
        }
    },{
        new:true
    })

    const options={
        httpOnly:true,
        secure:true
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User logged Out successfully"))
})


export {registerUser,
    loginUser,
    logoutUser
}