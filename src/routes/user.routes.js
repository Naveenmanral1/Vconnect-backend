import {Router} from "express";
import { 
    registerUser,
    loginUser,
    logOutUser,
    refreshAccessToken,
    getCurrentUser,
    changeCurrentPassword
 } from "../controllers/user.controller.js";

 import { verifyJWT } from "../middlewares/auth.middleware.js";
 import { upload } from "../middlewares/multer.middleware.js";

const router = Router()

router.route("/register").post(upload.none(),registerUser)
router.route("/login").post(upload.none(),loginUser)
router.route("/logout").post(verifyJWT,logOutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/current-user").get(verifyJWT,getCurrentUser)
router.route("/update-password").patch(verifyJWT,changeCurrentPassword)

export default router