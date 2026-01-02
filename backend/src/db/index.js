import { DB_NAME } from "../constants.js";
import mongoose from "mongoose";

const connectDB = async () => {
    try {
       const connectionInstance = await mongoose.connect(`${process.env.MONGODB_LOCAL_URL}/${DB_NAME}`);
       console.log(`Connected ${process.env.MONGODB_LOCAL_URL} ${connectionInstance}`)
    }
    catch (error) {
        
        console.error("Error connecting to MongoDB: ",process.env.MONGODB_LOCAL_URL );
        process.exit(1);
    }
}

export default connectDB;