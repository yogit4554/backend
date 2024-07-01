import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.models.js"
import {ApiError} from "../utils/apiError.js"
import {ApiResponse} from "../utils/apiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {Video} from "../models/video.models.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body

    if(!name){
        throw new ApiError(400,"Please enter the name of playlist.")
    }

    if(!description){
        throw new ApiError(400,"Description can not be empty.")
    }

    const userId =await req.user?._id;
    try {
        const playlist = await Playlist.create({
            name:name,
            description:description,
            owner:userId,
            videos:[]
        })

        if(!playlist){
            throw new ApiError(400,"Plylist can not created.")
        }

        return res
        .status(200)
        .json(
            new ApiResponse(200,playlist,"Playlist has been successfully created.")
        )

    } catch (error) {
        throw new ApiError(400,"Error while crearting playlist.")
    }

})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    if(!isValidObjectId(userId)){
        throw new ApiError(400,"User Id is not valid.")
    }

    try {

        const userPlaylist = await Playlist.aggregate(
            [
                //for owner of playlist
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
                                    _id: 1,
                                    username: 1,
                                    fullName: 1,
                                    avatar: 1
                                }
                            }
                        ]
                    }
                },
                {
                    $addFields: {
                        owner: {
                            $first: "$owner"
                        }
                    }
                },
                //for videos of playlist
                {
                    $lookup: {
                        from: "videos",
                        localField: "videos",
                        foreignField: "_id",
                        as: "videos",
                        pipeline: [
                            {
                                $project: {
                                    _id: 1,
                                    video: 1,
                                    thumbnail: 1,
                                    title: 1,
                                    views: 1,
                                    owner: 1
                                }
                            },
                            //for owner of videos
                            {
                                $lookup: {
                                    from: "users",
                                    localField: "owner",
                                    foreignField: "_id",
                                    as: "owner",
                                    pipeline: [
                                        {
                                            $project: {
                                                _id: 1,
                                                username: 1,
                                                fullName: 1,
                                                avatar: 1
                                            }
                                        }
                                    ]
                                }

                            },
                            {
                                $addFields: {
                                    owner: {
                                        $first: "$owner"
                                    }
                                }
                            }

                        ]
                    }
                }

            ]
        ); 
        
        if(!userPlaylist.length){
            throw new ApiError(400,"User has no playlist.")
        }

        return res
        .status(200)
        .json(
            new ApiResponse(200,userPlaylist,"Playlist has been created Successfully.")
        )
        
    } catch (error) {
        throw new ApiError(400,"Error while creating geting user playlist")
    }
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    if(!isValidObjectId(playlistId)){
        throw new ApiError(400,"Playlist Id is not valid.")
    }

    try {
        const playlist = Playlist.findById(playlistId)

        if(!playlist){
            throw new ApiError(400,"Playlist can not be fetched corresponding to id.")
        }
        return res
        .status(200)
        .json(
            new ApiResponse(200,playlist,"Playlist has been fetched Successfully.")
        )

    } catch (error) {
        throw new ApiError(400,"Error while creating get playlist by id.")
    }
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    if(!isValidObjectId(playlistId)){
        throw new ApiError(400,"Playlist Id is not valid.")
    }
    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"Video id is not valid")
    }

    try {
        const video = await Video.findById(videoId)
        if(!video) {
            throw new ApiError(400,"Video corresponding to Id is not found.")
        }

        const playlist = await Playlist.findById(playlistId)
        if(!playlist){
            throw new ApiError(400,"Playlist correspoind id is not found.")
        }

        // checking video alredy exist or not 
        const videoExists= playlist.video.find(vid => vid.toString() === videoId.toString());

        if(videoExists){
            throw new ApiError(400,"Video alredy exists in playlist.")
        }

        // checking owner
        if(playlist.owner.toString()!== req.user._id.toString()){
            throw new ApiError(400,"You are not owner of playlist so, you can not add to video.")
        }

        const updatedPlaylist = await Playlist.findByIdAndUpdate(playlistId,{
            $push:{
                video:videoId
            }
        })

        if(!updatePlaylist){
            throw new ApiError(400,"Playlist has not been updated.")
        }

        return res
        .status(200)
        .json(
            new ApiResponse(200,updatePlaylist,"Playlist has been updated Successfully.")
        )


    } catch (error) {
        throw new ApiError(400,"Error while adding video to playlist.")
    }
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    if(!isValidObjectId(playlistId)){
        throw new ApiError(400,"Playlist Id is not correct.")
    }
    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"Video Id is not correct.")
    }
    try {
        const video = await Video.findById(videoId);
        if(!video){
            throw new ApiError(400,"Video corressponding to id can not be fetched.")
        }

        const playlist = await Playlist.findById(playlistId);
        if(!playlist){
            throw new ApiError(400,"Playlist can not be fetched.")
        }

        const updatedPlaylist = await Playlist.findByIdAndUpdate(playlistId,{
            $pull:{
                video:videoId
            }
        })

        if(!updatePlaylist){
            throw new ApiError(400,"Video can not be removed.")
        }

        return res
        .status(200)
        .json(
            new ApiResponse(200,updatePlaylist,"Video has been deleted Successfully.")
        )
    } catch (error) {
        throw new ApiError(400,"Error while removing video from playlist.")
    }

})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    if(!isValidObjectId(playlistId)){
        throw new ApiError(400,"Playlist Id is not correct")
    }
    try {
        const playlist = await Playlist.findById(playlistId);
        if(!playlist){
            throw new ApiError(400,"Playlist can not be fetched.")
        }

        if(playlist.owner.toString !== req.user._id.toString){
            throw new ApiError(400,"You are not owner so, you have authorization to delete the playlist.")
        }

        const deletedPlaylist = await Playlist.findByIdAndDelete(playlistId);

        if(!deletedPlaylist){
            throw new ApiError(400,"Playlist can not be deletd.")
        }

        return res
        .status(200)
        .json(
            new ApiResponse(200,deletedPlaylist,"Playlist has been deleted Successfully.")
        )
        
    } catch (error) {
        throw new ApiError(400,"Error while deleting playlist.")
    }
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    if(!isValidObjectId(playlistId)){
        throw new ApiError(400,"Playlist Id is not correct.")
    }
    try {
        if(!name){
            throw new ApiError(400,"Name is required.")
        }

        if(!description){
            throw new ApiError(400,"Description is required.")
        }

        const playlist = await Playlist.findById(playlistId)

        if(!playlist){
            throw new ApiError(400,"Playlist can not be fetched corressponding to id.")
        }

        if(playlist.owner.toString!== req.user._id.toString){
            throw new ApiError(400,"You are not owner of playlist so, you have authorzed to updated the playlist.")
        }

        const updatedPlaylist = await findByIdAndUpdate(playlistId,{
            name:name,
            description:description
        })

        if(!updatedPlaylist){
            throw new ApiError(404,"Playlist can not updated.")
        }

        return res
        .status(200)
        .json(
            new ApiResponse(200,updatedPlaylist,"Playlist has been deleted Successfully.")
        )

    } catch (error) {
        throw new ApiError(400,"Error while deleting playlist")
    }
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}