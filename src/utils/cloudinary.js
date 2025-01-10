import {v2 as cloudinary} from "cloudinary"
import fs from "fs"

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure : true,
  });

  const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null

        const response = await cloudinary.uploader.upload(localFilePath , {
            resource_type : "auto",
            secure : true,
        })

        fs.unlinkSync(localFilePath)
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath)
        return null;
    }
}

const deleteFromCloudinary = async(publicId) => {
    try {
        if(!publicId){
            return false;
        }

        const response = await cloudinary.uploader.destroy(publicId);

        if(response.result === "ok" || response.result === "not found"){
            return true;
        }
    } catch (error) {
        console.error("Error deleting file from cloudinary :" , error);
        return false;
    }
}

const extractPublicIdFromUrl = (url) => {
    const parts = url.split("/");
    const publicIdWithExtension = parts[parts.length - 1]; 
    return publicIdWithExtension.split(".")[0]; 
};

export {
    uploadOnCloudinary,
    deleteFromCloudinary,
    extractPublicIdFromUrl
}
