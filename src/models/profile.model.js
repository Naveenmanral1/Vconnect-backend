import mongoose , {Schema} from "mongoose";

const profileSchema = new Schema({

    firstName : {
        type : String,
        required : [true , 'firstName is required'],
    },

    lastName : {
        type : String,
        required : [true , 'lastName is required'],
    },

    city : {
        type : String,
        required : [true , 'city is required'],
    },

    gender : {
        type : String,
        required : [true , 'gender is required'],
        enum: ['Male', 'Female'],
    },

    dateofBirth : {
        type : String,
        required : [true , 'DateOfBirth is required'],
    },

    bio : {
        type : String,
        required : [true , 'bio is required'],
    },

    avatar : {
        type : String,
        required : [true , 'Avatar is required'],
    },

    owner : {
        type : Schema.Types.ObjectId,
        ref : "User",
        required : true
    },

    cover : {
        type : String,
    },

},
{
    timestamps : true
})

export const Profile = mongoose.model("Profile" , profileSchema)