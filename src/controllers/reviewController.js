const ReviewModel = require('../models/reviewModel');

class ReviewController {
  static async createReview(req, res, next) {
    try {
      const { id: productId } = req.params;
      const { rating, comment, order_id } = req.body;

      const review = await ReviewModel.create({
        productId,
        userId: req.user.id,
        orderId: order_id || null,
        rating: parseInt(rating, 10),
        comment,
      });

      return res.status(201).json({
        success: true,
        message: 'Review submitted successfully',
        data: review,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getProductReviews(req, res, next) {
    try {
      const { id: productId } = req.params;
      const reviews = await ReviewModel.findByProductId(productId);

      const avgRating = reviews.length > 0
        ? parseFloat((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1))
        : 0;

      return res.status(200).json({
        success: true,
        count: reviews.length,
        averageRating: avgRating,
        data: reviews,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ReviewController;
