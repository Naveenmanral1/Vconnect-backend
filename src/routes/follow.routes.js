import {Router} from "express";
import { 
    getFollowedPages,
    getUserPageFollower,
    toggelFollow,
} from "../controllers/follow.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJWT);

router
   .route("/:pageId")
   .get(getUserPageFollower)
   .post(toggelFollow)

router
   .route("/:followerId/following")
   .get(getFollowedPages)

export default router;