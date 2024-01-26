import mongoose from "mongoose"
import { Comment } from "../models/comment.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"

const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    const commentsAggregate = Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
            },
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "comment",
                as: "likes",
            },
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likes",
                },
                owner: {
                    $first: "$owner",
                },
                isLiked: {
                    $cond: {
                        if: {$in: [req.user?._id, "$likes.likedBy"]},
                        then: true,
                        else: false
                    }
                }
            },
        },
        {
            $project: {
                content: 1,
                createdAt: 1,
                likesCount: 1,
                owner: {
                    username: 1,
                    fullName: 1,
                    "avatar.url": 1,
                },
                isLiked: 1
            },
        },
    ]);

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
    };

    const comments = await Comment.aggregatePaginate(
        commentsAggregate,
        options
    );

    return res
        .status(200)
        .json(new ApiResponse(200, comments, "Comments fetched successfully"));
});

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video

    const { content } = req.body
    const { videoId } = req.params

    if (!content) {
        throw new ApiError(404, "please enter content in videoId")
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(401, "no video found by this videoId")
    }

    const comment = await Comment.create({
        content,
        video,
        owner: req.user?._id
    })

    if (!comment) {
        throw new ApiError(500, "error creating comment try again")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, comment, "comment created successfully"))

})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment

    const { content } = req.body
    const { commentId } = req.params

    if (!content) {
        throw new ApiError(404, "please enter the content you want to update")
    }

    const comment = await Comment.findByIdAndUpdate(
        commentId,
        {
            $set: {
                content
            }
        },
        { new: true }
    )

    if (!comment) {
        throw new ApiError(500, "error updating comment try again")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, comment, "comment updated successfully"))

})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment

    const { commentId } = req.params

    const comment = await Comment.findByIdAndDelete(commentId)

    if (!comment) {
        throw new ApiError(500, "error deleting comment try again")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "comment deleted successfully"))

})

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}