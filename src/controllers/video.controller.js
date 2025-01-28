import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.models.js"
import {User} from "../models/user.models.js"
import {ApiError} from "../utils/apiError.js"
import {ApiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {v2 as cloudinary} from "cloudinary"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
    const pipeline = [];

    // for using Full Text based search u need to create a search index in mongoDB atlas
    // you can include field mapppings in search index eg.title, description, as well
    // Field mappings specify which fields within your documents should be indexed for text search.
    // this helps in seraching only in title, desc providing faster search results
    // here the name of search index is 'search-videos'
    if (query) {
        pipeline.push({
            $search: {
                index: "search-videos",
                text: {
                    query: query,
                    path: ["title", "description"] //search only on title, desc
                }
            }
        });
    }

    if (userId) {
        if (!isValidObjectId(userId)) {
            throw new ApiError(400, "Invalid userId");
        }

        pipeline.push({
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        });
    }

    // fetch videos only that are set isPublished as true
    pipeline.push({ $match: { isPublished: true } });

    //sortBy can be views, createdAt, duration
    //sortType can be ascending(-1) or descending(1)
    if (sortBy && sortType) {
        pipeline.push({
            $sort: {
                [sortBy]: sortType === "asc" ? 1 : -1
            }
        });
    } else {
        pipeline.push({ $sort: { createdAt: -1 } });
    }

    pipeline.push(
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            "avatar": 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$ownerDetails"
        }
    )

    const videoAggregate = Video.aggregate(pipeline);

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    };

    const video = await Video.aggregatePaginate(videoAggregate, options);

    return res
        .status(200)
        .json(new ApiResponse(200, video, "Videos fetched successfully"));
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body

    try {
        const userId = await req.user._id
        const videoLocalPath = req.files?.videoFile[0].path;
        const thumbnailLocalPath = req.files?.videoFile[0].path;

        const video = await uploadOnCloudinary(videoLocalPath)
        const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

        if(!video || !thumbnail){
            throw new ApiError(400,"Error while uploading video or thumbnail to cloudinary ")
        }

        const newVideo= await Video.create({
            title:title,
            description:description,
            thumbnail:thumbnail.url,
            videoFile:video.url,
            publicId:video.public_id,
            duration:video.duration,
            owner:userId,  /// this might casuse error 
            isPublished:true
        })
        
        if(!newVideo){
            throw new ApiError(400,"Error while  creating new video.")
        }

        return res
        .status(200)
        .json(
            new ApiResponse(200,newVideo,"Video has been published Successfully.")
        )

    } catch (error) {
        throw new ApiError(400,`Error while publishing :) ${error.message}`)
    }
})

const getVideoById = asyncHandler(async (req, res) => {
    try {
        const { videoId } = req.params

        if(isValidObjectId(videoId)){
            throw new ApiError(400,"Video Id  is not correct")
        }

        const video= await Video.findById(videoId);

        if(!video){
            throw new ApiError(404,"Video not found")
        }

        //incrementing the view of video 
        await Video.findByIdAndUpdate(videoId,{$inc:{views:1}},{new : true})

        // adding the video  to the watch history of the viewer
        await User.findByIdAndUpdate(req.user._id,{$push:{ watchHistory: videoId}},{new:true})

        return res
        .status(200)
        .json(
            new ApiResponse(200,video, "video fetched successfully!!")
        )


    } catch (error) {
        throw new ApiError(400,error.message)
    }
})

const updateVideo = asyncHandler(async (req, res) => { // only updating thumbnail,description and title 
    const { videoId } = req.params;
    const { title, description } = req.body;

    try {

        const video = await Video.findById(videoId);

        if(!video) {
            throw new ApiError(404, "Video not found while updating video");
        }

        // delete the thumbnail from cloudinary
        const publicId = await video.thumbnail.public_id;

        if(publicId) { // deleting old thumbnail
            try {
                await cloudinary.uploader.destroy(publicId, {resource_type: "image"});
            } catch (error) {
                throw new ApiError(400, "Error while deleting old thumbnail");
            }
        }

        const thumbnailLocalPath = req.file?.path;

        if(!thumbnailLocalPath) {
            throw new ApiError(400, "Error while uploading thumbnail to cloudinary");
        }

        const newThumbnail = await uploadOnCloudinary(thumbnailLocalPath);


        const updatedVideo = await Video.findByIdAndUpdate(videoId, {
            $set: {
                thumbnail: newThumbnail.url,
                title,
                description
            }
        }, { new: true });


        if(!updatedVideo) {
            throw new ApiError(404, "Video not found while updating video");
        }

        return res
        .status(200)
        .json(
            new ApiResponse(200, updatedVideo, "Video updated successfully")
        )

        
    } catch (error) {
        throw new ApiError(400, `Error while updating video ${error.message}`);
    }
})

const deleteVideo = asyncHandler(async (req, res) => {
    try {
        const { videoId } = req.params

        if(!isValidObjectId(videoId)){
            throw new ApiError(400,"Video ID is not correct")
        }

        const video = await Video.findById(videoId)

        if(!video){
            throw new ApiError(400,"Video not found")
        }

        const publicId=video.publicId

        if(!publicId){
            throw new ApiError(400,"PubicId not getting from Video")
        }

        if(publicId){
            try {
                await cloudinary.uploader.destroy(publicId,{resource_type:"video"})
                await Video.findByIdAndDelete(videoId)
            } catch (error) {
                throw new ApiError(400,`Error while deleting video ${error.message}`)
            }
        }

        return res
        .status(200)
        .json(
            new ApiResponse(200,null,"Video deleted successfully")
        )

    } catch (error) {
        throw new ApiError(400,`Error while deleting video ${error.message}`)
    }

})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"Video Id is not correct.")
    }

    try {
        const video = await Video.findById(videoId)

        if(!video){
            throw new ApiError(400,"Video did not find while toggling Publish Status")
        }

        const updateVideo=await Video.findByIdAndUpdate(videoId,{
            $set:{
                isPublished:!video.isPublished
            }
        },{new:true}).select("-video -thumbnail  -title -description");

        if(!updateVideo){
            throw new ApiError(404,"Video did not found")
        }

        return res
        .status(200)
        .json(
            new ApiResponse(200,updateVideo,"Publish Toggled successfuly!!!")
        )

    } catch (error) {
        throw new ApiError(400,error.message)
    }
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}