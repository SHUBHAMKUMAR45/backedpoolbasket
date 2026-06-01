import Joi from 'joi';

// Helper for Mongo Object ID validation
const objectId = (value, helpers) => {
  if (!value.match(/^[0-9a-fA-F]{24}$/)) {
    return helpers.message('"{{#label}}" must be a valid Mongo ObjectId');
  }
  return value;
};

const create = Joi.object({
  name: Joi.string().min(2).max(100).required().messages({
    'any.required': 'Category name is required'
  }),
  description: Joi.string().max(500).optional().allow(''),
  parentCategory: Joi.string().custom(objectId).optional().allow('', null)
});

const update = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  description: Joi.string().max(500).optional().allow(''),
  parentCategory: Joi.string().custom(objectId).optional().allow('', null),
  isActive: Joi.boolean().optional(),
  order: Joi.number().integer().min(0).optional()
});

export default {
  create,
  update
};
