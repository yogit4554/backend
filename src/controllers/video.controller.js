import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.models.js"
import {User} from "../models/user.models.js"
import {ApiError} from "../utils/apiError.js"
import {ApiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {v2 as cloudinary} from "cloudinary"


const getAllVideos = asyncHandler(async (req, res) => {
    try {
        const { page = 1, limit = 10, query, sortBy = "title", sortType= "asc", userId } = req.query
        const pageNumber = parseInt(page)
        const pageLimit = parseInt(limit)
        const skip = (pageNumber - 1) * pageLimit;

        const sortingDirection = sortType === "desc"?-1:1;

        const videos = await Video.aggregate([
            {
                $match:{
                    owner: new mongoose.Types.ObjectId(userId)
                }
            },
            {
                $lookup:{
                    from : "users",
                    localField : "owner",
                    foreignField : "_id",
                    as: "owner",
                    pipeline:[
                        {
                            $project:{
                                fullName:1,
                                username:1,
                                avatar:1
                            }
                        }
                    ]
                }
            },
            {
                $addFields:{
                    owner:{
                        $arrayElemAt: [ "$owner", 0 ]
                    }
                }
            },
            {
                $skip:skip
            },
            {
                $limit : pageLimit
            },
            {
                $sort:{
                    [sortBy]:sortingDirection
                }
            }
        ])

        if(!videos){
            throw new ApiError(404,"No video found")
        }

        const totalVideo = await Video.countDocuments({owner:userId})
        const totalPages = Math.ceil(totalVideo/pageLimit)

        return res
        .status(200)
        .json(
            new ApiResponse(200,videos,"Video found succesfully",{
                totalPages,
                totalVideo
            })
        )

    } catch (error) {
        throw new ApiError(400,"Error while accumulating the  video!!")
    }
    
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body

    try {

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
        throw new ApiError(400,"Error while publishing :)")
    }
})

const getVideoById = asyncHandler(async (req, res) => {
    try {
        const { videoId } = req.params

        if(!isValidObjectId(videoId)){
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
    const { videoId } = req.params
    const {title , description} = req.body

    try {
        const video = await Video.findById(videoId)

        if(!video){
            throw new ApiError(404,"Video not found")
        }

        const publicId=await video.thumbnail.public_id

        if(publicId){ // deleting old thumbnail
            try {
                await cloudinary.uploader.destroy(publicId,{resource_type:"image"})
            } catch (error) {
                throw new ApiError(400,"Error while deleting old thumbnail")
            }
        }

        const thumbnailLocalPath=req.files?.path
        if(!thumbnailLocalPath){
            throw new ApiError(400,"Error while getting file link")
        }

        const newThumbnail= await uploadOnCloudinary(thumbnailLocalPath)

        const updateVideo = await findByIdAndUpdate(videoId,{
            $set:{
                thumbnail:newThumbnail.url,
                title,
                description
            }
        },{new:true})

        if(!updateVideo){
            throw new ApiError(404,"New video not found while updating")
        }

        return res
        .status(200)
        .json(
            new ApiResponse(200,updateVideo,"Video updated Successfully!!")
        )

    } catch (error) {
        throw new ApiError(400,"Error while updating the video")
    }
})

const deleteVideo = asyncHandler(async (req, res) => {
    try {
        const { videoId } = req.params

        if(isValidObjectId(videoId)){
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
                throw new ApiError(400,"Error while deleting video")
            }
        }

        return res
        .status(200)
        .json(
            new ApiResponse(200,null,"Video deleted successfully")
        )

    } catch (error) {
        throw new ApiError(400,"Error while deleting the video")
    }

})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if(isValidObjectId(videoId)){
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