import {Router} from "express"
import { 
    createPost,
    updatePost,
    deletePost,
    getAllPost,
    getPostById,
    getPostsByFollowedUsers,
} from "../controllers/post.controller.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"
import { upload } from "../middlewares/multer.middleware.js"

const router = Router();
router.use(verifyJWT); 

router
    .route("/")
    .get(getAllPost)
    .post(
        upload.fields([
            {
                name: "image",
                maxCount : 1,
            },
        ]),
        createPost
    )


router.route("/following-posts").get(getPostsByFollowedUsers)

router
    .route("/:postId")
    .get(getPostById)
    .delete(deletePost)
    .patch(upload.single("image"),updatePost)


export default router
