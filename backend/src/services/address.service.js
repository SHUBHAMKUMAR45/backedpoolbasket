import Address from '../models/Address.js';
import ApiError from '../utils/ApiError.js';

export const getAddresses = async (userId) => {
  return await Address.find({ user: userId }).sort({ isDefault: -1, createdAt: -1 });
};

export const createAddress = async (userId, addressData) => {
  const addressCount = await Address.countDocuments({ user: userId });
  
  // First address or explicit default flag sets this as default
  const isDefault = addressCount === 0 || addressData.isDefault === true;

  const address = await Address.create({
    ...addressData,
    user: userId,
    isDefault
  });

  return address;
};

export const updateAddress = async (userId, addressId, updates) => {
  const address = await Address.findOne({ _id: addressId, user: userId });
  if (!address) {
    throw new ApiError(404, 'Address not found or unauthorized');
  }

  // Update only allowed fields
  const fields = [
    'label',
    'fullName',
    'phone',
    'street',
    'addressLine2',
    'city',
    'state',
    'zipCode',
    'landmark',
    'isDefault'
  ];

  fields.forEach((f) => {
    if (updates[f] !== undefined) address[f] = updates[f];
  });

  await address.save();
  return address;
};

export const deleteAddress = async (userId, addressId) => {
  const address = await Address.findOne({ _id: addressId, user: userId });
  if (!address) {
    throw new ApiError(404, 'Address not found or unauthorized');
  }

  const wasDefault = address.isDefault;
  await Address.findByIdAndDelete(addressId);

  // If the deleted address was default, promote the newest remaining address to default
  if (wasDefault) {
    const newestAddress = await Address.findOne({ user: userId }).sort({ createdAt: -1 });
    if (newestAddress) {
      newestAddress.isDefault = true;
      await newestAddress.save();
    }
  }
};

export const setDefaultAddress = async (userId, addressId) => {
  const address = await Address.findOne({ _id: addressId, user: userId });
  if (!address) {
    throw new ApiError(404, 'Address not found or unauthorized');
  }

  // Reset defaults for all other addresses
  await Address.updateMany(
    { user: userId, _id: { $ne: addressId } },
    { isDefault: false }
  );

  address.isDefault = true;
  await address.save();

  return address;
};
