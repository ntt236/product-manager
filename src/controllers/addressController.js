const AddressModel = require('../models/addressModel');

class AddressController {
  static async getAll(req, res, next) {
    try {
      const addresses = await AddressModel.findByUserId(req.user.id);
      return res.status(200).json({
        success: true,
        count: addresses.length,
        data: addresses,
      });
    } catch (error) {
      next(error);
    }
  }

  static async create(req, res, next) {
    try {
      // Support flexible field naming aliases from frontend
      const receiverName =
        req.body.receiver_name ||
        req.body.receiverName ||
        req.body.recipient_name ||
        req.body.recipientName ||
        req.body.name ||
        req.body.fullname;
      const phone = req.body.phone || req.body.phoneNumber || req.body.phone_number;
      const streetAddress =
        req.body.street_address ||
        req.body.streetAddress ||
        req.body.address_line ||
        req.body.addressLine ||
        req.body.address ||
        req.body.street;
      const ward = req.body.ward || null;
      const district = req.body.district || req.body.city || '';
      const province = req.body.province || req.body.state || req.body.city || '';
      const isDefault = req.body.is_default !== undefined ? req.body.is_default : req.body.isDefault;

      const address = await AddressModel.create({
        userId: req.user.id,
        receiverName,
        phone,
        streetAddress,
        ward,
        district,
        province,
        isDefault: Boolean(isDefault),
      });

      return res.status(201).json({
        success: true,
        message: 'Shipping address created successfully',
        data: address,
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req, res, next) {
    try {
      const { id } = req.params;
      const receiverName = req.body.receiver_name || req.body.receiverName || req.body.name;
      const phone = req.body.phone || req.body.phoneNumber || req.body.phone_number;
      const streetAddress = req.body.street_address || req.body.streetAddress || req.body.address;
      const ward = req.body.ward;
      const district = req.body.district;
      const province = req.body.province || req.body.city;
      const isDefault = req.body.is_default !== undefined ? req.body.is_default : req.body.isDefault;

      const updated = await AddressModel.update(id, req.user.id, {
        receiverName,
        phone,
        streetAddress,
        ward,
        district,
        province,
        isDefault: isDefault !== undefined ? Boolean(isDefault) : undefined,
      });

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'Shipping address not found or not owned by you',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Shipping address updated successfully',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req, res, next) {
    try {
      const { id } = req.params;
      const deleted = await AddressModel.delete(id, req.user.id);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'Shipping address not found or not owned by you',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Shipping address deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AddressController;
