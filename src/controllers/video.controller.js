import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadOnCloudinary } from "../utils/Cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
    console.log(userId);
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
                            avatar: 1
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

    // const video = await Video.findOne({ _id: videoId })

    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId)
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
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "channel",
                as: "owner",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribers"
                        }
                    },
                    {
                        $addFields: {
                            subscribersCount: {
                                $size: "$subscribers"
                            },
                            isSubscribed: {
                                $cond: {
                                    if: {
                                        $in: [req.user?._id, "$subscribers._id"]
                                    },
                                    then: true,
                                    else: false
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            username: 1,
                            avatar: 1,
                            subscribersCount: 1,
                            isSubscribed: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                likes: {
                    $size: "$likes"
                },
                owner: {
                    $first: "$owner"
                },
                isLiked: {
                    $cond: {
                        if: {
                            $in: [req.user?._id, "$likes.likedBy"]
                        },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                videoFile: 1,
                title: 1,
                description: 1,
                views: 1,
                createdAt: 1,
                duration: 1,
                comments: 1,
                owner: 1,
                likes: 1,
                isLiked: 1
            }
        }
    ])

    if (!video) {
        throw new ApiError(500, "failed to fetch video")
    }

    await Video.findByIdAndUpdate(videoId,{
        $inc: {
            views: 1
        }
    })

    await User.findByIdAndUpdate(req.user?._id, {
        $addToSet: {
            watchHistory: videoId
        }
    })

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