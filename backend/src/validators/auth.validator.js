import Joi from 'joi';

const signup = Joi.object({
  name: Joi.string().min(2).max(50).required().messages({
    'string.empty': 'Name cannot be empty',
    'string.min': 'Name must be at least 2 characters',
    'string.max': 'Name cannot exceed 50 characters'
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Please enter a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string()
    .min(6)
    .pattern(/^(?=.*[a-zA-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': 'Password must be at least 6 characters long',
      'string.pattern.base': 'Password must contain at least one letter and one number',
      'any.required': 'Password is required'
    })
});

const login = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please enter a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required'
  })
});

const updateProfile = Joi.object({
  name: Joi.string().min(2).max(50).optional(),
  phone: Joi.string().pattern(/^[6-9]\d{9}$/).optional().messages({
    'string.pattern.base': 'Please provide a valid 10-digit Indian phone number'
  }),
  avatar: Joi.any().optional()
});

const sendOtp = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please enter a valid email address',
    'any.required': 'Email is required'
  })
});

const verifyOtp = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please enter a valid email address',
    'any.required': 'Email is required'
  }),
  otp: Joi.string().length(4).pattern(/^\d{4}$/).required().messages({
    'string.length': 'OTP must be exactly 4 digits',
    'string.pattern.base': 'OTP must contain only digits',
    'any.required': 'OTP is required'
  })
});

const deliveryRegister = Joi.object({
  name: Joi.string().min(2).max(50).required().messages({
    'any.required': 'Name is required'
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Please enter a valid email address',
    'any.required': 'Email is required'
  }),
  vehicleType: Joi.string().valid('Bike', 'Scooter', 'Cycle').required().messages({
    'any.only': 'Vehicle type must be Bike, Scooter, or Cycle',
    'any.required': 'Vehicle type is required'
  }),
  vehicleNumber: Joi.string().min(5).optional()
});

export default {
  signup,
  login,
  updateProfile,
  sendOtp,
  verifyOtp,
  deliveryRegister
};
