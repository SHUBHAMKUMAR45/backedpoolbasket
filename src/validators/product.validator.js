import Joi from 'joi';

// Helper for Mongo Object ID validation
const objectId = (value, helpers) => {
  if (!value.match(/^[0-9a-fA-F]{24}$/)) {
    return helpers.message('"{{#label}}" must be a valid Mongo ObjectId');
  }
  return value;
};

const create = Joi.object({
  name: Joi.string().max(200).required().messages({
    'any.required': 'Product name is required'
  }),
  description: Joi.string().max(2000).required().messages({
    'any.required': 'Product description is required'
  }),
  shortDescription: Joi.string().max(300).optional().allow(''),
  price: Joi.number().min(0).required().messages({
    'any.required': 'Product price is required',
    'number.min': 'Price cannot be negative'
  }),
  compareAtPrice: Joi.number().min(0).optional(),
  category: Joi.string().required().messages({
    'any.required': 'Category ID or Slug is required'
  }),
  stock: Joi.number().integer().min(0).required().messages({
    'any.required': 'Stock quantity is required'
  }),
  sku: Joi.string().optional().allow(''),
  isExpressDelivery: Joi.boolean().optional(),
  isSameDayDelivery: Joi.boolean().optional(),
  isFeatured: Joi.boolean().optional(),
  // Support both JSON array strings and raw arrays from form data
  tags: Joi.alternatives()
    .try(Joi.array().items(Joi.string()), Joi.string())
    .optional()
});

const update = Joi.object({
  name: Joi.string().max(200).optional(),
  description: Joi.string().max(2000).optional(),
  shortDescription: Joi.string().max(300).optional().allow(''),
  price: Joi.number().min(0).optional(),
  compareAtPrice: Joi.number().min(0).optional(),
  category: Joi.string().optional(),
  stock: Joi.number().integer().min(0).optional(),
  sku: Joi.string().optional().allow(''),
  isExpressDelivery: Joi.boolean().optional(),
  isSameDayDelivery: Joi.boolean().optional(),
  isFeatured: Joi.boolean().optional(),
  tags: Joi.alternatives()
    .try(Joi.array().items(Joi.string()), Joi.string())
    .optional(),
  isActive: Joi.boolean().optional()
});

const getProducts = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(50).optional(),
  category: Joi.string().optional(),
  search: Joi.string().optional().allow(''),
  sort: Joi.string().valid('price_asc', 'price_desc', 'rating', 'newest').optional(),
  minPrice: Joi.number().min(0).optional(),
  maxPrice: Joi.number().min(0).optional(),
  isExpress: Joi.alternatives().try(Joi.boolean(), Joi.string().valid('true', 'false')).optional(),
  isSameDay: Joi.alternatives().try(Joi.boolean(), Joi.string().valid('true', 'false')).optional(),
  isFeatured: Joi.alternatives().try(Joi.boolean(), Joi.string().valid('true', 'false')).optional()
});

export default {
  create,
  update,
  getProducts
};
