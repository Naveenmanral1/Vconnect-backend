import { Router } from "express";
import { 
    createProfile,
    updateProfile,
    getProfileById,
 } from "../controllers/profile.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();
router.use(verifyJWT);

router.route("/").post(
    upload.fields([
        {
            name : "avatar",
            maxCount:1,
        },
        {
            name : "cover",
            maxCount : 1,
        }
    ]),
    createProfile
);

router.route("/:userId").get(getProfileById)

router.route("/:profileId").patch(upload.fields([
    {
        name : "avatar",
        maxCount:1,
    },
    {
        name : "cover",
        maxCount : 1,
    }
]),updateProfile)

export default router