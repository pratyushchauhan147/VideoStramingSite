import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs'; //file system

cloudinary.config({ 
  cloud_name: 'dcsl643ty', 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET

});
export const uploadToCloudinary = (filePath) => {
        try{
            if(!filePath) return null;
            const response = cloudinary.uploader.upload(filePath, {
                resource_type: "auto"
            });
            // Delete the local file after upload
            //fs.unlinkSync(filePath);
            return response;
        }
        catch(error){
            console.error("Error uploading to Cloudinary:", error);
            fs.unlinkSync(filePath);
        return null;  
    
    }
}

