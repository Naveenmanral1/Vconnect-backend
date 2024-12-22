import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const togglePostLike = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  if (!isValidObjectId(postId)) {
    throw new ApiError(400, "Invalid postId");
  }

  const alreadyLiked = await Like.findOne({
    post: postId,
    likedBy: req.user?._id,
  });

  if (alreadyLiked) {
    await Like.findByIdAndDelete(alreadyLiked?._id);

    return res.status(200).json(new ApiResponse(200, { isLiked: false }));
  }

  await Like.create({
    post: postId,
    likedBy: req.user?._id,
  });

  return res.status(200).json(new ApiResponse(200, { isLiked: true }));
});

const getLikesByPostId = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  if (!isValidObjectId(postId)) {
    throw new ApiError(400, "Invalid postId");
  }

  const like = await Like.aggregate([
    {
      $match: { post: new mongoose.Types.ObjectId(postId) },
    },
    {
      $lookup: {
        from: "profiles",
        localField: "likedBy",
        foreignField: "owner",
        as: "profiles",
      },
    },
    {
      $unwind: "$profiles",
    },
    {
      $project: {
        _id: 0,
        "profiles.firstName": 1,
        "profiles.lastName": 1,
        "profiles.avatar": 1,
        "profiles.owner": 1,
      },
    },
  ]);

  if (!like.length) {
    throw new ApiError(404, "No likes found for this post");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, like, "Likes fetched successfully"));
});

export { togglePostLike, getLikesByPostId };
