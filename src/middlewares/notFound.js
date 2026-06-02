import ApiError from '../utils/ApiError.js';

export default (req, res, next) => {
  next(new ApiError(404, `Route ${req.originalUrl} not found`));
};
