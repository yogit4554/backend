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
    const userId = req.user?._id;

    const totalSubscribers = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $group: {
                _id: null,
                subscribersCount: {
                    $sum: 1
                }
            }
        }
    ]);

    const video = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $project: {
                totalLikes: {
                    $size: "$likes"
                },
                totalViews: "$views",
                totalVideos: 1
            }
        },
        {
            $group: {
                _id: null,
                totalLikes: {
                    $sum: "$totalLikes"
                },
                totalViews: {
                    $sum: "$totalViews"
                },
                totalVideos: {
                    $sum: 1
                }
            }
        }
    ]);

    const channelStats = {
        totalSubscribers: totalSubscribers[0]?.subscribersCount || 0,
        totalLikes: video[0]?.totalLikes || 0,
        totalViews: video[0]?.totalViews || 0,
        totalVideos: video[0]?.totalVideos || 0
    };

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                channelStats,
                "channel stats fetched successfully"
            )
        );
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