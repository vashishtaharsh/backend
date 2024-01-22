import mongoose, { isValidObjectId } from "mongoose"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Tweet } from "../models/tweet.model.js"
import { User } from "../models/user.model.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: toggle like on video

    if (!videoId) {
        throw new ApiError(404, "invalid request, please enter valid videoId")
    }

    const existingLike = await Like.findOne({ video: videoId, likedBy: req.user?._id })

    const like = existingLike ? await Like.deleteOne(existingLike) : await Like.create({ video: videoId, likedBy: req.user.id });

    return res
        .status(200)
        .json(new ApiResponse(200, like, "video like toggled successfully"))

})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params
    //TODO: toggle like on comment

    if (!commentId) {
        throw new ApiError(404, "invalid request, please enter valid commentId")
    }

    const existingLike = await Like.findOne({ comment: commentId, likedBy: req.user?._id })

    const like = existingLike ? await Like.deleteOne(existingLike) : await Like.create({ comment: commentId, likedBy: req.user.id });

    return res
        .status(200)
        .json(new ApiResponse(200, like, "comment like toggled successfully"))

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params
    //TODO: toggle like on tweet

    if (!tweetId) {
        throw new ApiError(404, "invalid request, please enter valid tweetId")
    }

    const existingLike = await Like.findOne({ tweet: tweetId, likedBy: req.user?._id })

    const like = existingLike ? await Like.deleteOne(existingLike) : await Like.create({ tweet: tweetId, likedBy: req.user.id });

    return res
        .status(200)
        .json(new ApiResponse(200, like, "tweet like toggled successfully"))

})

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos

    const likedVideosAggegate = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user?._id),
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "likedVideo",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "ownerDetails",
                        },
                    },
                    {
                        $unwind: "$ownerDetails",
                    },
                ],
            },
        },
        {
            $unwind: "$likedVideo",
        },
        {
            $sort: {
                createdAt: -1,
            },
        },
        {
            $project: {
                _id: 0,
                likedVideo: {
                    _id: 1,
                    videoFile: 1,
                    thumbnail: 1,
                    owner: 1,
                    title: 1,
                    description: 1,
                    views: 1,
                    duration: 1,
                    createdAt: 1,
                    isPublished: 1,
                    ownerDetails: {
                        username: 1,
                        fullName: 1,
                        avatar: 1,
                    },
                },
            },
        },
    ]);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                likedVideosAggegate,
                "liked videos fetched successfully"
            )
        );

})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}