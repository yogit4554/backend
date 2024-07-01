import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.models.js"
import { Subscription } from "../models/subscriptons.models.js"
import {ApiError} from "../utils/apiError.js"
import {ApiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    if(!isValidObjectId(channelId)){
        throw new ApiError(400,"Channel Id is not valid")
    }
    try {
        const userId = await req.user._id
        
        let subscriptionStatus;

        const subscription  = await Subscription.findOne({
            subscriber:userId,
            channel:channelId
        })

        if(!subscription){
            await Subscription.create(
                {
                    subscriber:userId,
                    channelId:channelId
                }
            );
            subscriptionStatus = {isSubscribed: true} // this might cause error 
        }
        else{
            await Subscription.deleteOne(
                {   
                    subscriber:userId,
                    channel:channelId
                }
            )

            subscriptionStatus= {isSubscribed : false} // this might cause error 
        }

        return res
        .status(200)
        .json(
            new ApiResponse(200,subscriptionStatus,"Subsscription status has been updated.")
        )

    } catch (error) {
        throw new ApiError(400,`Error while toggle Subscription and the error is this ${error.message}`)
    }
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    if(!isValidObjectId(channelId)){
        throw new ApiError(400,"Channel Id is not valid.")
    }
    try {
       
        const userSubscribers = await Subscription.aggregate(
            [
                {
                    $match: {
                        channel: new mongoose.Types.ObjectId(channelId),
                    }
                },
                //One More way to count subscribers without lookup            
                {
                    $group: {
                        _id: null,
                        totalSubscribers: {
                            $sum: 1
                        }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        totalSubscribers: 1
                    }
                }
            ]
        );

        if(!userSubscribers.length){
            throw new ApiError(400,"Channel has no subscriber")
        }

        return res
        .status(200)
        .json(
            new ApiResponse(200,subscribers,"Subscriber fetched successfully.")  /// this might cause error 
        )

    } catch (error) {
        throw new ApiError(400,`error while getting subscriber count and error is this ${error.message}`)
    }
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const userId = await req.user._id;

    try {

        const subscribedChannels = await Subscription.aggregate(
            [
                {
                    $match: {
                        subscriber: new mongoose.Types.ObjectId(subscriberId)
                    }
                },

                {
                    $lookup: {
                        from: "users",
                        localField: "channel",
                        foreignField: "_id",
                        as: "subscribedTo",
                        pipeline: [
                            {
                                $project: {
                                    fullName: 1,
                                    username: 1,
                                    isSubscribed: 1
                                }
                            }
                        ]
                    }
                },

                {
                    $addFields: {
                        subscribedTo: {
                            $first: "$subscribedTo"
                        }
                    }
                }
            ]
        )

        if(!subscribedChannels.length) {
            throw new ApiError(404, "User has no subscribed channels");
        }

        return res
        .status(200)
        .json(
            new ApiResponse(200, subscribedChannels, "Subscribed channels fetched successfully")
        )

    } catch (error) {
        throw new ApiError(500, `error while fetching subscribed channels ${error.message}`);
    }
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}