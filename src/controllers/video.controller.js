import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadOnCloudinary } from "../utils/Cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination

    const findQuery = {};
    if (query) {
        // Assuming you have a 'title' field in your Video model
        findQuery.title = { $regex: new RegExp(query, 'i') };
    }

    // Use Mongoose isValidObject to check if userId is a valid ObjectId
    if (userId && isValidObjectId(userId)) {
        findQuery.userId = userId;
    }

    // Define the sort query based on parameters
    const sortQuery = {};
    if (sortBy) {
        sortQuery[sortBy] = sortType === 'desc' ? -1 : 1;
    }

    // Execute the query with pagination and sorting
    const videos = await Video.find(findQuery)
        .sort(sortQuery)
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

    if (!videos) {
        throw new ApiError(404, "something went wrong while fetching videos using query")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, videos, "video fetched successfully using query"))

});

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body

    if (!(title || description)) {
        throw new ApiError(401, "title and description both are required")
    }

    // TODO: get video, upload to cloudinary, create video
    const videoFilePath = req.files?.videoFile[0]?.path
    const thumbnailFilePath = req.files?.thumbnail[0]?.path

    if (!videoFilePath) {
        throw new ApiError(400, "video is required")
    }

    if (!thumbnailFilePath) {
        throw new ApiError(400, "thumbnail is required")
    }

    const videoFile = await uploadOnCloudinary(videoFilePath)
    const thumbnail = await uploadOnCloudinary(thumbnailFilePath)

    const duration = videoFile?.duration

    const owner = await User.findOne({ username: req.user?.username })

    if (!owner) {
        throw new ApiError(404, "user not found")
    }

    const video = await Video.create({
        videoFile: videoFile.url,
        thumbnail: thumbnail.url,
        title,
        description,
        duration,
        owner
    })

    if (!video) {
        throw new ApiError(404, "video not published")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, video, "video published successfully"))
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id

    if (!videoId || !mongoose.isValidObjectId(videoId)) {
        throw new ApiError(404, "videoId is required")
    }

    const video = await Video.findOne({ _id: videoId })

    if (!video) {
        throw new ApiError(401, "no video found by this Id")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, video, "video fetched successfully"))

})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!videoId || !mongoose.isValidObjectId(videoId)) {
        throw new ApiError(404, "videoId is required")
    }

    //TODO: update video details like title, description, thumbnail

    const { title, description } = req.body

    let thumbnailFilePath
    let thumbnail

    if (req.file && Array.isArray(req.file.thumbnail) && req.file.thumbnail.length > 0) {
        thumbnailFilePath = req.file?.thumbnail[0]?.path
        thumbnail = await uploadOnCloudinary(thumbnailFilePath)
        if (!thumbnail) {
            throw new ApiError(400, "error updating thumbnail")
        }
    }

    const video = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title,
                description,
                thumbnail
            }
        },
        {
            new: true
        }
    )

    if (!video) {
        throw new ApiError(500, "error updating video details")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, video, "video details updated successfully"))

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video

    if (!videoId || !mongoose.isValidObjectId(videoId)) {
        throw new ApiError(401, "valid videoId is required")
    }

    const video = await Video.findByIdAndDelete(videoId)

    if (!video) {
        throw new ApiError(404, "error deleting video try again")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "video deleted successfully"))

})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!videoId || !mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "valid videoId is required");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "video not found");
    }

    // Toggle the isPublished status
    video.isPublished = !video.isPublished;

    const updatedVideo = await video.save();


    return res
        .status(200)
        .json(new ApiResponse(200, updatedVideo, "video publish status updated successfully"))

})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}