import mongoose, { connect, isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.models.js"
import {User} from "../models/user.models.js"
import {ApiError} from "../utils/apiError.js"
import {ApiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    const {content} = req.body
    const userId = await req.user._id;

    try {
        if(!content){
            throw new ApiError(400,"Content  is not available.")
        }

        const tweet = await Tweet.create(
            {
                content:content,
                owner:userId
            }
        )

        if(!tweet){
            throw new ApiError(400,"Error while creating  new tweet afterf etching content.")
        }

        return res
        .status(200)
        .json(
            new ApiResponse(200,tweet,"Tweet created successfully.")
        )

    } catch (error) {
        throw new ApiError(400,"Error while  creating tweet.")
    }

})

const getUserTweets = asyncHandler(async (req, res) => {
    const {userId} = req.params;

    if(!isValidObjectId(userId)){
        throw new ApiError(400,"user id is not correct")
    }

    try {
        const userTweets = await Tweet.aggregate([
            {
                $match: {
                    owner: new mongoose.Types.ObjectId(userId)
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    as: "owner",
                    pipeline: [
                        {
                            $project: {
                                fullName: 1,
                                username: 1,
                                avatar: 1
                            }
                        }
                    ]
                }
            },
            {
                $addFields: {
                    owner: {
                        $arrayElemAt: [ "$owner", 0 ]
                    }
                }
            }
        ])

        if(!userTweets.length){
            throw new ApiError(404,"user has not posted nay tweet.")
        }

        return res
        .status(200)
        .json(
            new ApiResponse(200,userTweets,"User's tweeet fetched successfully.")
        )

    } catch (error) {
        throw new ApiError(500,"Error while getting User tweets.")
    }
})

const updateTweet = asyncHandler(async (req, res) => { // update content
    const {content} =req.body;
    const {tweetId} = req.params

    if(!content){
        throw new ApiError(400,"Content can not be empty.")
    }

    if(!isValidObjectId(tweetId)){
        throw new ApiError(400,"tweet Id is not correct.")
    }

    try {
        const tweet = await Tweet.findById(tweetId)

        if(!tweet){
            throw new ApiError(400,"tweet not found.")
        }

        // checking whether owner want to update or any else 

        if(tweet.owner.toString()!==req.user._id.toString()){
            throw new ApiError(400,"You can not update it since you are not owner of this tweet.")
        }

        const updateTweet = await Tweet.findByIdAndUpdate(tweetId,{
            content
        })

        if(!updateTweet){
            throw new ApiError(400,"Can not be updated tweet.")
        }

        return res
        .status(200)
        .json(
            new ApiResponse(200,updateTweet,"Tweet has been updated Successfully.")
        )


    } catch (error) {
        throw new ApiError(400,"Error while  updating tweet.")
    }
})

const deleteTweet = asyncHandler(async (req, res) => {
    const {tweetId} = req.params

    if(!isValidObjectId(tweetId)){
        throw new ApiError(400,"tweet Id is not correct.")
    }

    try {
       const tweet = await Tweet.findById(tweetId)

       if(!tweet){
        throw new ApiError(400,"Tweet corressponding to tweet id can not be fetched.")
       }

       //checking owner only owner can delete 
       if(tweet.owner.toString()!==req.user._id.toString()){
        throw new ApiError(400,"you are not owner of this tweet u can not delete it.")
       }

       await Tweet.findByIdAndDelete(tweetId)

       return res
       .status(200)
       .json(
        new ApiResponse(200,{},"Tweet has been successfully deleted.")
       )
        
    } catch (error) {
        throw new ApiError(400,"error while deleting ")
    }
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}