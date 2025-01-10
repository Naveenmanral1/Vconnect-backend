import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
  extractPublicIdFromUrl,
} from "../utils/cloudinary.js";
import { Post } from "../models/post.model.js";
import { Like } from "../models/like.model.js";
import { User } from "../models/user.model.js";
import mongoose, { isValidObjectId } from "mongoose";

const createPost = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  if ([title, description].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All fields are required");
  }

  const imageLocalPath = req.files?.image?.[0]?.path;

  if (!imageLocalPath) {
    throw new ApiError(400, "Image file is required");
  }

  const image = await uploadOnCloudinary(imageLocalPath);

  if (!image) {
    throw new ApiError(400, "Image file is required");
  }

  const post = await Post.create({
    title,
    description,
    image: image?.secure_url || "",
    owner: req.user?._id,
  });

  return res
    .status(201)
    .json(new ApiResponse(200, post, "Post created successfully"));
});

const updatePost = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  const { postId } = req.params;

  if (!title?.trim() && !description?.trim() && !req.file) {
    throw new ApiError(
      400,
      "At least one field (title, description, or image) is required"
    );
  }

  const post = await Post.findById(postId);
  if (!post) {
    throw new ApiError(400, "Post not found");
  }

  if (post.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(400, "You or not owner of this post");
  }

  let image;
  if (req.file?.path) {
    const imageLocalPath = req.file.path;

    image = await uploadOnCloudinary(imageLocalPath);
    if (!image.secure_url) {
      throw new ApiError(400, "Error while uploading image");
    }

    if (post.image) {
      const oldImagePublicId = extractPublicIdFromUrl(post.image);
      await deleteFromCloudinary(oldImagePublicId);
    }
  }

  const updateFields = {};
  if (title?.trim()) updateFields.title = title;
  if (description?.trim()) updateFields.description = description;
  if (image?.secure_url) updateFields.image = image.secure_url;

  const updatePost = await Post.findByIdAndUpdate(
    postId,
    { $set: updateFields },
    { new: true }
  );

  if (!post) {
    throw new ApiError(400, "Post not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatePost, "Post updated successfully"));
});

const deletePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const post = await Post.findById(postId);
  if (!post) {
    throw new ApiError(400, "Post not found");
  }

  if (post.image) {
    const result = await deleteFromCloudinary(post.image);
    if (!result) {
      throw new ApiError(500, "Error while deleting the associated image");
    }
  }

  await Post.findByIdAndDelete(postId);

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Post deleted successfully"));
});

const getAllPost = asyncHandler(async (req, res) => {
  const { sort = "-createdAt" } = req.query;

  const posts = await Post.aggregate([
    { $sort: { createdAt: sort === "-createdAt" ? -1 : 1 } },

    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "post",
        as: "likes",
      },
    },

    {
      $lookup: {
        from: "profiles",
        localField: "owner",
        foreignField: "owner",
        as: "profileData",
      },
    },

    {
      $addFields: {
        likesCount: { $size: { $ifNull: ["$likes", []] } },
        isLiked: {
          $cond: {
            if: { $in: [req.user?._id, "$likes.likedBy"] },
            then: true,
            else: false,
          },
        },
        ownerAvatar: { $arrayElemAt: ["$profileData.avatar", 0] },
        ownerName: { $arrayElemAt: ["$profileData.firstName", 0] },
      },
    },

    {
      $project: {
        image: 1,
        title: 1,
        description: 1,
        createdAt: 1,
        likesCount: 1,
        isLiked: 1,
        ownerAvatar: 1,
        ownerName: 1,
        owner: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, posts, "Posts retrieved successfully"));
});

const getPostById = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  if (!isValidObjectId(postId)) {
    throw new ApiError(400, "Invalid postId");
  }

  if (!isValidObjectId(req.user?._id)) {
    throw new ApiError(400, "Invalid userId");
  }

  const post = await Post.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(postId),
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "post",
        as: "likes",
      },
    },
    {
      $addFields: {
        likesCount: {
          $size: "$likes",
        },
        // owner: {
        //     $first: "$owner"
        // },
        isLiked: {
          $cond: {
            if: { $in: [req.user?._id, "$likes.likedBy"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        image: 1,
        title: 1,
        description: 1,
        createdAt: 1,
        owner: 1,
        likesCount: 1,
        isLiked: 1,
      },
    },
  ]);

  if (!post) {
    throw new ApiError(404, "Post not found ");
  }

  return res.status(200).json(new ApiResponse(200, post[0], "Post found "));
});

const getPostsByFollowedUsers = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user ID");
  }

  const posts = await Post.aggregate([
    {
      $lookup: {
        from: "follows",
        let: { userId: new mongoose.Types.ObjectId(userId) },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ["$follower", "$$userId"] },
            },
          },
          {
            $project: { _id: 0, page: 1 },
          },
        ],
        as: "following",
      },
    },
    {
      $set: {
        followingPages: {
          $map: { input: "$following", as: "follow", in: "$$follow.page" },
        },
      },
    },
    {
      $match: {
        $expr: {
          $in: ["$owner", "$followingPages"],
        },
      },
    },
  ]);

  if (!posts || posts.length === 0) {
    return res
      .status(200)
      .json(new ApiResponse(200, [], "No posts found from followed users"));
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        posts,
        "Posts from followed users fetched successfully"
      )
    );
});

export {
  createPost,
  updatePost,
  deletePost,
  getAllPost,
  getPostById,
  getPostsByFollowedUsers,
};
