class ApiResponse {
    constructor(statusCode, message="success",data) {
        this.success = statusCode <400;
        this.data = data
        this.message = message;
        this.statusCode = statusCode;
        