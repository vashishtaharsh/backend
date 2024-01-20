import mongoose, { isValidObjectId } from "mongoose"
import { Tweet } from "../models/tweet.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const { content } = req.body

    if (!content || content.trim() === "") {
        throw new ApiError(401, "enter a valid content")
    }

    const owner = await User.findOne({ username: req.user?.username })

    if (!owner) {
        throw new ApiError(401, "user not found enter correct username")
    }

    const tweet = await Tweet.create({
        content,
        owner
    })

    if (!tweet) {
        throw new ApiError(401, "error creating tweet try again")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, tweet, "tweet created successfully"))

})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets

    const { userId } = req.params

    console.log(userId);

    if (!userId) {
        throw new ApiError(404, "invalid userId please enter valid userId")
    }

    const allTweets = await Tweet.find({ owner: userId })

    console.log(allTweets);

    if (!allTweets) {
        throw new ApiError(401, "no tweets found try again")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, allTweets, "tweets fetched successfully"))

})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet

    const { tweetId } = req.params

    const { content } = req.body

    if (!tweetId) {
        throw new ApiError(401, "enter valid tweetId")
    }
    if (!content || content.trim() === "") {
        throw new ApiError(401, "please enter the content you want to update")
    }

    const tweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set: {
                content
            }
        },
        {
            new: true
        }
    )

    return res
        .status(200)
        .json(new ApiResponse(200, tweet, "tweet updated successfully"))

})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet

    const { tweetId } = req.params

    if (!tweetId) {
        throw new ApiError(401, "enter valid tweetId")
    }

    const tweet = await Tweet.findByIdAndDelete(tweetId)

    if (!tweet) {
        throw new ApiError(404, "error deleting tweet try again")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "tweet deleted successfully"))

})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}