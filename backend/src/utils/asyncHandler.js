const asyncHandler = (requestHandlier)=>{
    (req, res, next) => {
        Promise.resolve(requestHandlier(req, res, next)).catch((err)=>{next(err)});
    }
}
export default asyncHandler;