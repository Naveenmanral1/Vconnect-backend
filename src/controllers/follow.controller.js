import mongoose, { isValidObjectId } from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Follow } from "../models/follow.model.js";
import { Profile } from "../models/profile.model.js";

const toggelFollow = asyncHandler(async (req, res) => {
  const { pageId } = req.params;

  if (!isValidObjectId(pageId)) {
    throw new ApiError(400, "Invalid pageId");
  }

  const isFollowed = await Follow.findOne({
    follower: req.user?._id,
    page: pageId,
  });

  if (isFollowed) {
    await Follow.findByIdAndDelete(isFollowed?._id);

    return res
      .status(200)
      .json(new ApiResponse(200, { followed: false }, "unfollow successfully"));
  }

  await Follow.create({
    follower: req.user?._id,
    page: pageId,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, { followed: true }, "followed successfully"));
});

const getUserPageFollower = asyncHandler(async (req, res) => {
  let { pageId } = req.params;

  if (!isValidObjectId(pageId)) {
    throw new ApiError(400, "Invalid pageId");
  }

  pageId = new mongoose.Types.ObjectId(pageId);

  const followers = await Follow.aggregate([
    {
      $match: {
        page: new mongoose.Types.ObjectId(pageId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "follower",
        foreignField: "_id",
        as: "follower",
        pipeline: [
          {
            $lookup: {
              from: "profiles",
              localField: "_id",
              foreignField: "owner",
              as: "profile",
            },
          },
          {
            $unwind: {
              path: "$profile",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "follows",
              localField: "_id",
              foreignField: "page",
              as: "followedToFollower",
            },
          },
          {
            $addFields: {
              followedToFollower: {
                $cond: {
                  if: {
                    $in: [pageId, "$followedToFollower.follower"],
                  },
                  then: true,
                  else: false,
                },
              },
              followersCount: {
                $size: "$followedToFollower",
              },
            },
          },
          {
            $project: {
              _id: 1,
              fullName: 1,
              "profile.avatar": 1,
              followersCount: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$follower",
    },
    {
      $project: {
        isFollowed: 1,
        followersCount: 1,
        _id: 0,
        follower: {
          _id: 1,
          fullName: 1,
          followersCount: 1,
          avatar: "$follower.profile.avatar",
        },
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, followers, "followers fetched successfully"));
});

const getFollowedPages = asyncHandler(async (req, res) => {
  const { followerId } = req.params;

  const followedPages = await Follow.aggregate([
    {
      $match: {
        follower: new mongoose.Types.ObjectId(followerId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "page",
        foreignField: "_id",
        as: "followedPage",
        pipeline: [
          {
            $lookup: {
              from: "profiles",
              localField: "_id",
              foreignField: "owner",
              as: "profile",
            },
          },
          {
            $unwind: {
              path: "$profile",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $project: {
              _id: 1,
              firstName: "$profile.firstName",
              fullName: 1,
              email: 1,
              avatar: "$profile.avatar",
            },
          },
        ],
      },
    },
    {
      $unwind: "$followedPage",
    },
    {
      $project: {
        _id: 0,
        followedPage: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(200, followedPages, "Followed pages fetched successfully")
    );
});

export { toggelFollow, getUserPageFollower, getFollowedPages };
