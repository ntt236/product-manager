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
      const { receiver_name, phone, street_address, ward, district, province, is_default } = req.body;
      const address = await AddressModel.create({
        userId: req.user.id,
        receiverName: receiver_name,
        phone,
        streetAddress: street_address,
        ward,
        district,
        province,
        isDefault: Boolean(is_default),
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
      const { receiver_name, phone, street_address, ward, district, province, is_default } = req.body;

      const updated = await AddressModel.update(id, req.user.id, {
        receiverName: receiver_name,
        phone,
        streetAddress: street_address,
        ward,
        district,
        province,
        isDefault: is_default !== undefined ? Boolean(is_default) : undefined,
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
