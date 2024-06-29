import mongoose from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/apiError.js"
import {ApiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { User } from "../models/user.models.js"

const getVideoComments = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    const pageLimit = parseInt(limit);
    const pageNumber = parseInt(page)
    const offset = (pageNumber - 1 ) * pageLimit;
    const skip = offset;

    const comments = await Comment.aggregate([
        {
            $match:{
                video : new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            from:"users",
            localField:"owner",
            foreignField:"_id",
            as:"owner",
            pipeline:[
                {
                    $project:{
                        fullName:1,
                        username:1,
                        avatar:1
                    }
                }
            ]
        },
        {
            $addFields:{
                owner:{
                    $first:"$owner"
                }
            }
        },
        {
            $skip:skip
        },
        {
            $limit:pageLimit
        }
    ])

    const totalComments = await Comment.countDocuments({video:videoId})
    const totalPages = Math.ceil(totalComments/pageLimit)

    return res
    .status(200)
    .json(
        new ApiResponse(200,{comments,totalComments,totalPages},"All Comments are fetched !!")
    )
})

const addComment = asyncHandler(async (req, res) => {
    try {
        const{videoId}=req.params
        const { newContent}=req.body
        const userId= await req.user._id;

    } catch (error) {
        throw new ApiError(400,error.message)
    }

    const comment = await Comment.create({
        content:newContent,
        video:videoId,
        owner: User
    })

    if(comment === ""){
        throw new ApiError(400,"Comment can not be empty")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200,comment,"Comment has been added!!!")
    )
})

const updateComment = asyncHandler(async (req, res) => {
    try {
        const {commentId}=req.params
        const {newComment}=req.body
    
        if(!newComment){
            throw new ApiError(400,"Please add new Comment")  
        }
    
        const updatedComment=await Comment.findByIdAndUpdate(commentId,{content:newComment});
    
        if(updatedComment){
            throw new ApiError(400,"Comment can not be updated")
        }
    
        return res
        .status(200)
        .json(
            new ApiResponse(200,updatedComment,"Comment has been updated Successfully")
        )
    } catch (error) {
        throw new ApiError(400,error.message)
    }
})

const deleteComment = asyncHandler(async (req, res) => {
    try {
        const {commentId}=req.params
        const userId=await req.user._id

        const comment=await Comment.findByIdAndDelete(commentId)

        if(!comment){
            throw new ApiError(404,"Comment not found!!")
        }

        return res
        .status(200)
        .json(
            new ApiResponse(200,{},"Comment deleted Successfully")
        )


    } catch (error) {
        throw new ApiError(500,error.message)
    }
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }