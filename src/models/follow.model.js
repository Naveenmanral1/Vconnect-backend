import mongoose,{Schema} from "mongoose";

const followSchema = new Schema(
    {
       follower : {
        type : Schema.Types.ObjectId,
        ref : "User"
       },
       page : {
        type : Schema.Types.ObjectId,
        ref : "User" 
       }
    },
{timestamps:true});

export const Follow = mongoose.model("Follow",followSchema);