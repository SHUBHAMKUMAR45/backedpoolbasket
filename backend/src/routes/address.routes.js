import express from 'express';
import * as addressController from '../controllers/address.controller.js';
import { authenticate } from '../middlewares/authenticate.js';

const router = express.Router();

// All address routes require authentication
router.use(authenticate);

router.get('/', addressController.getAddresses);
router.post('/', addressController.createAddress);
router.put('/:id', addressController.updateAddress);
router.delete('/:id', addressController.deleteAddress);
router.patch('/:id/default', addressController.setDefault);

export default router;
