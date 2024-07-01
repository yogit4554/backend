import mongoose, { isValidObjectId } from "mongoose"
import {Video} from "../models/video.models.js"
import {Subscription} from "../models/subscriptons.models.js"
import {Like} from "../models/like.models.js"
import {ApiError} from "../utils/apiError.js"
import {ApiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {User} from "../models/user.models.js"

const getChannelStats = asyncHandler(async (req, res) => {
    // Get the channel stats like total video views, total subscribers, total videos, total likes etc.
    const userId=  req.user._id;
    if(!isValidObjectId(userId)){
        throw new ApiError(400,"User id is not correct.")
    }
    try {
        const user =await User.findById(userId);
        if(!user){
            throw new ApiError(400,"User not found")
        }

        const totalSubscribers = await Subscription.countDocuments({
            channel:userId
        })

        const totalVideos  = await Subscription.countDocuments({
            owner:userId
        })

        // total videos views
        const totalVideosViews = await Video.aggregate(
            [
                {
                    $match: {
                        owner: new mongoose.Types.ObjectId(userId)
                    }
                },
                {
                    $match: {
                        views: {
                            $gt: 0
                        }
                    }
                },
                {
                    $group: {
                        _id: "$views",
                        totalViews: {
                            $sum: "$views"
                        }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        totalViews: 1
                    }
                }
            ]
        )

        const totalVideos_Views = totalVideosViews[0].totalViews;

        if(!totalVideosViews) {
            throw new ApiError(404, "No videos found while fetching total views");
        }

        //Total Likes on Videos
        const totalVideosLikes = await Like.aggregate(
            [
                {
                    $lookup: {
                        from: "videos",
                        localField: "video",
                        foreignField: "_id",
                        as: "allVideos",
                    }
                },
                {
                    $unwind: "$allVideos" //can use addFields->first also 
                },
                {
                    $match: {
                        "allVideos.owner": new mongoose.Types.ObjectId(req.user?._id)
                    }
                },
                {
                    $group: {
                        _id: null,  //means Single group
                        totalVideosLikes: {
                            $sum: 1 //count all the Input Documents in pipeline
                        }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        totalVideosLikes: 1
                    }
                },
            ]
        )

        const totalVideos_Likes =  totalVideosLikes[0].totalVideosLikes;

        const channelStats ={
            totalSubscribers,
            totalVideos,
            totalVideos_Views,
            totalVideos_Likes
        }

        return res
        .status(200)
        .json(
        new ApiResponse(200,channelStats,"Channel Stats fetched Successfully.")
        )

    } catch (error) {
        throw new ApiError(400,"Error while getting Channel Stats")
    }
})

const getChannelVideos = asyncHandler(async (req, res) => {
    // Get all the videos uploaded by the channel
    const userId = req.user._id

    if(!isValidObjectId(userId)){
        throw new ApiError(400,"User id is not valid")
    }

    try {
        const userVideos = await Video.find({
            owner:userId
        })

        if(!userVideos.length){
            throw new ApiError(400,"Channel has no video.")
        }

        return res
        .status(200)
        .json(
        new ApiResponse(200,userVideos,"All videos are fetched successfuly.")
        )
        
    } catch (error) {
        throw new ApiError(400,"Error while getting channel videos.")
    }
})

export {
    getChannelStats, 
    getChannelVideos
    }