import mongoose,{ Schema } from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
const UserSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true,
        lowercase: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    fullname:{
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    avatar:{
        type: String,// URL to the avatar image from cloudinary
        required: true,
    },
    coverImage:{
        type: String,// URL to the cover image from cloudinary
    },
    watchHistory:[{
        type: Schema.Types.ObjectId,
        ref: 'Video',
    }],
    password: {
        type: String,
        required: true,
    },
    refreshToken: {
        type: String,
    },
}, { timestamps: true });

UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

UserSchema.methods.isPasswordCorrect = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.generateAccessToken = function () {
    const payload = {
        id: this._id,
        username: this.username,
        email: this.email,
        fullname: this.fullname
    }
    const token = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' });
    return token;
}
UserSchema.methods.generateRefreshToken = function () {
    const payload = {
        id: this._id,
    }
    const token = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '10d' });
    return token;
}

export const  User = mongoose.model('User', UserSchema);