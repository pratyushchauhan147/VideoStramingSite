const asyncHandler = (requestHandlier)=>{
   return (req, res, next) => {
        Promise.resolve(requestHandlier(req, res, next)).catch((err)=>{next(err)});
    }
}
export  {asyncHandler};