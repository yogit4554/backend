import mongoose from "mongoose"
import {Comment} from "../models/comment.models.js"
import {ApiError} from "../utils/apiError.js"
import {ApiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { User } from "../models/user.models.js"

const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const { page = 1, limit = 10 } = req.query

    const commentsAggregate = Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner"
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "comment",
                as: "likes"
            }
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likes"
                },
                owner: {
                    $first: "$owner"
                },
                isLiked: {
                    $cond: {
                        if: { $in: [req.user?._id, "$likes.likedBy"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $project: {
                content: 1,
                createdAt: 1,
                likesCount: 1,
                owner: {
                    username: 1,
                    fullName: 1,
                    avatar: 1
                },
                isLiked: 1
            }
        }
    ]);

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    };

    const comments = await Comment.aggregatePaginate(
        commentsAggregate,
        options
    );

    // const totalComments = await Comment.countDocuments({ video: videoId })
    // const totalPages = Math.ceil(totalComments / pageLimit)

    return res
    .status(200)
    .json(
        new ApiResponse(200,comments,"All Comments are fetched !!")
    )
})

const addComment = asyncHandler(async (req, res) => {
    try {
        const{videoId}=req.params
        const { newContent }=req.body
        const userId= await req.user._id;

        console.log(newContent)
        console.log(req.body)

        if(!newContent){
            throw new ApiError(400,"Comment can not be empty")   
        }

        const user =  await User.findById(userId)

        const comment = await Comment.create({
            content:newContent,
            video:videoId,
            owner: user
        })

        if(!comment){
            throw new ApiError(400,"Comment can not be added.")
        }

        return res
        .status(200)
        .json(
            new ApiResponse(200,comment,"Comment has been added!!!")
        )
    } catch (error) {
        throw new ApiError(400,error.message)
    }
})

const updateComment = asyncHandler(async (req, res) => {
    try {
        const {commentId}=req.params
        const {newComment}=req.body
    
        if(!newComment){
            throw new ApiError(400,"Please add new Comment")  
        }
    
        const updatedComment=await Comment.findByIdAndUpdate(commentId,{content:newComment});
    
        if(!updatedComment){
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