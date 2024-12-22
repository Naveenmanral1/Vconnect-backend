import {Router} from "express";
import { togglePostLike , getLikesByPostId } from "../controllers/like.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(verifyJWT);

router.route("/toggle/:postId").post(togglePostLike);
router.route("/:postId/likes").get(getLikesByPostId);

export default router