import mongoose,{Schema} from 'mongoose';
import mongooseAggregatePaginate  from 'mongoose-aggregate-paginate-v2';
const VideoSchema = new Schema({
    title: {
        type: String,
        required: true,
    },
    videoFile:{
        type: String, // URL to the video file from cloudinary
        required: true,
    },
    thumbnail:{
        type: String, // URL to the thumbnail image from cloudinary
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    duration:{
        type: Number, // duration in seconds
        required: true
    },
    views:{
        type: Number,
        default: 0,
    },
    isPunlished:{
        type: Boolean,
        default: true,
    },
    owner:{
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    }
}, { timestamps: true });

const Video = mongoose.model('Video', VideoSchema);