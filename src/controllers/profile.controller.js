import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
  extractPublicIdFromUrl,
} from "../utils/cloudinary.js";
import { Profile } from "../models/profile.model.js";
import mongoose from "mongoose";

const createProfile = asyncHandler(async (req, res) => {
  const { dateofBirth, city, bio, firstName, lastName, gender } = req.body;
  if (
    [dateofBirth, city, bio, firstName, lastName, gender].some(
      (field) => field?.trim() === ""
    )
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const imageLocalPath = req.files?.avatar?.[0]?.path || req.file?.path;
  if (!imageLocalPath && !profileDetail?.avatar) {
    throw new ApiError(400, "Avatar file is required");
  }
  const avatar = await uploadOnCloudinary(imageLocalPath);
  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  const coverLocalPath = req.files?.cover?.[0]?.path || req.file?.path;
  if (!coverLocalPath && !profileDetail?.cover) {
    throw new ApiError(400, "Cover file is required");
  }
  const cover = await uploadOnCloudinary(coverLocalPath);
  if (!cover) {
    throw new ApiError(400, "Cover file is required");
  }

  const profile = await Profile.create({
    firstName,
    lastName,
    dateofBirth,
    city,
    bio,
    gender,
    avatar: avatar?.secure_url || "",
    cover: cover?.secure_url || "",
    owner: req.user?._id,
    fullName: req.user?.fullName,
    email: req.user?.email,
  });

  return res
    .status(201)
    .json(new ApiResponse(200, profile, "Profile created successfully "));
});

const updateProfile = asyncHandler(async (req, res) => {
  const { dateofBirth, city, bio, firstName, lastName, gender } = req.body;
  const { profileId } = req.params;

  if (
    !lastName?.trim() &&
    !gender?.trim() &&
    !firstName?.trim() &&
    !dateofBirth?.trim() &&
    !city?.trim() &&
    !bio?.trim() &&
    !req.files?.avatar &&
    !req.files?.cover
  ) {
    throw new ApiError(400, "At least one field is required");
  }

  const profileDetail = await Profile.findById(profileId);
  if (!profileDetail) {
    throw new ApiError(400, "Profile not found");
  }

  if (profileDetail.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(400, "You or not owner of this profile");
  }

  let avatar;
  if (req.files?.avatar?.[0]?.path) {
    const imageLocalPath = req.files.avatar[0].path;
    avatar = await uploadOnCloudinary(imageLocalPath);
    if (!avatar.secure_url) {
      throw new ApiError(400, "Error while uploading image");
    }

    if (profileDetail.avatar) {
      const oldAvatarPublicId = extractPublicIdFromUrl(profileDetail.avatar);
      await deleteFromCloudinary(oldAvatarPublicId);
    }
  }

  let cover;
  if (req.files?.cover?.[0]?.path) {
    const coverLocalPath = req.files.cover[0].path;
    cover = await uploadOnCloudinary(coverLocalPath);
    if (!cover.secure_url) {
      throw new ApiError(400, "Error while uploading cover image");
    }

    if (profileDetail.cover) {
      const oldCoverPublicId = extractPublicIdFromUrl(profileDetail.cover);
      await deleteFromCloudinary(oldCoverPublicId);
    }
  }

  const updateFields = {};
  if (firstName?.trim()) updateFields.firstName = firstName;
  if (lastName?.trim()) updateFields.lastName = lastName;
  if (gender?.trim()) updateFields.gender = gender;
  if (dateofBirth?.trim()) updateFields.dateofBirth = dateofBirth;
  if (city?.trim()) updateFields.city = city;
  if (bio?.trim()) updateFields.bio = bio;
  if (avatar?.secure_url) updateFields.avatar = avatar.secure_url;
  if (cover?.secure_url) updateFields.cover = cover.secure_url;

  const profile = await Profile.findByIdAndUpdate(
    profileId,
    { $set: updateFields },
    { new: true }
  );

  if (!profile) {
    throw new ApiError(400, "Profile not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, profile, "Profile updated successfully"));
});

const getProfileById = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const currentUserId = req.user._id;

  const profileData = await Profile.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "follows",
        localField: "owner",
        foreignField: "page",
        as: "followers",
      },
    },
    {
      $addFields: {
        followersCount: { $size: "$followers" },
      },
    },
    {
      $lookup: {
        from: "follows",
        localField: "owner",
        foreignField: "page",
        as: "currentUserFollowStatus",
        pipeline: [
          {
            $match: {
              follower: currentUserId,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        isFollowed: {
          $gt: [{ $size: "$currentUserFollowStatus" }, 0],
        },
      },
    },
    {
      $lookup: {
        from: "follows",
        localField: "owner",
        foreignField: "follower",
        as: "followingPages",
      },
    },
    {
      $addFields: {
        followingCount: { $size: "$followingPages" },
      },
    },
    {
      $project: {
        _id: 0,
        owner: 1,
        fullName: 1,
        followersCount: 1,
        isFollowed: 1,
        avatar: 1,
        _id: 1,
        firstName: 1,
        lastName: 1,
        gender: 1,
        city: 1,
        dateofBirth: 1,
        bio: 1,
        followingCount: 1,
        email: 1,
        cover: 1,
      },
    },
  ]);

  if (!profileData || profileData.length === 0) {
    throw new ApiError(404, "Profile not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, profileData[0], "Profile found"));
});

export { createProfile, updateProfile, getProfileById };
