import mongoose , {Schema} from "mongoose"

const likeSchema= new Schema({
    video:{
        type:Schema.Types.ObjectId,
        ref:"Video"
    },
    comment:{
        type:Schema.type.ObjectId,
        ref:"Comment"
    },
    tweet:{
        type:Schema.type.ObjectId,
        ref:"Tweet"
    },
    likedBy:{
        type:Schema.type.ObjectId,
        ref:"User"
    }
},{timestamps:true})

export const Like= mongoose.model("Like",likeSchema)