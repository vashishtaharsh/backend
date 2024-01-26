import mongoose, { isValidObjectId } from "mongoose"
import { User } from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params
    // TODO: toggle subscription
    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channelId");
    }

    const isSubscribed = await Subscription.findOne({
        subscriber: req.user?._id,
        channel: channelId,
    });

    if (isSubscribed) {
        await Subscription.findByIdAndDelete(isSubscribed?._id);

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    { subscribed: false },
                    "unsunscribed successfully"
                )
            );
    }

    await Subscription.create({
        subscriber: req.user?._id,
        channel: channelId,
    });

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { subscribed: true },
                "subscribed successfully"
            )
        );
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params

    if (!channelId) {
        throw new ApiError(404, "please enter a valid channelId")
    }

    const subscribers = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "subscriber",
                            foreignField: "_id",
                            as: "subscriberInfo"
                        }
                    },
                ]
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                }
            }
        },
        {
            $project: {
                _id: 0,
                subscribers: {
                    subscriber: 1,
                    subscriberInfo: {
                        fullName: 1,
                        avatar: 1,
                        username: 1
                    }
                },
                isSubscribed: {
                    $cond: {
                        if: {
                            $in: [req.user?._id,"$subscribers.subscriber"]
                        },
                        then: true,
                        else: false
                    }
                },
                subscribersCount: 1
            }
        }
    ])

    if (!subscribers) {
        throw new ApiError(500, "error fetching subscribers")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, subscribers, "subscribers fetched successfully"))

})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params

    if (!isValidObjectId(subscriberId)) {
        throw new ApiError(401, "unauthorized request, please enter valid subscriberId")
    }

    const channels = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscriptions",
                pipeline: [
                    {
                        $lookup: {
                            from: "videos",
                            localField: "_id",
                            foreignField: "owner",
                            as: "videos",
                        },
                    },
                    {
                        $addFields: {
                            latestVideo: {
                                $last: "$videos",
                            },
                        },
                    },
                ],
            }
        },
        {
            $unwind: "$subscriptions"
        },
        {
            $project: {
                _id: 0,
                subscriptions: {
                    _id: 1,
                    subscriber: 1,
                    channel: 1,
                    createdAt: 1
                }
            }
        }
    ])
    console.log(channels);

    return res
        .status(200)
        .json(new ApiResponse(200, channels, "channels fetched successfully"))

})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}