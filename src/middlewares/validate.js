import ApiError from '../utils/ApiError.js';

const validate = (schema) => {
  return (req, res, next) => {
    if (!schema) {
      return next();
    }

    const validateObj = {};
    if (schema.body) validateObj.body = req.body;
    if (schema.query) validateObj.query = req.query;
    if (schema.params) validateObj.params = req.params;

    // If schema is a direct Joi object, validate req.body by default
    const isJoiSchema = typeof schema.validate === 'function';
    
    if (isJoiSchema) {
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        allowUnknown: true,
        stripUnknown: true
      });

      if (error) {
        const errors = error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message.replace(/['"]/g, '')
        }));
        return next(new ApiError(422, 'Validation failed', errors));
      }
      req.body = value;
      return next();
    }

    // Otherwise validate each request component mapped in the schema object (body, query, params)
    for (const key of Object.keys(validateObj)) {
      const { error, value } = schema[key].validate(validateObj[key], {
        abortEarly: false,
        allowUnknown: true,
        stripUnknown: true
      });

      if (error) {
        const errors = error.details.map((detail) => ({
          field: `${key}.${detail.path.join('.')}`,
          message: detail.message.replace(/['"]/g, '')
        }));
        return next(new ApiError(422, 'Validation failed', errors));
      }
      req[key] = value;
    }

    next();
  };
};

export default validate;
