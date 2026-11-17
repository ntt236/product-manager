const express = require('express');
const AddressController = require('../controllers/addressController');
const { authenticateToken } = require('../middlewares/authMiddleware');
const { addressCreateValidator, idParamValidator } = require('../validators');

const router = express.Router();

// All address routes belong to the authenticated user
router.get('/', authenticateToken, AddressController.getAll);
router.post('/', authenticateToken, addressCreateValidator, AddressController.create);
router.put('/:id', authenticateToken, idParamValidator, AddressController.update);
router.delete('/:id', authenticateToken, idParamValidator, AddressController.delete);

module.exports = router;
