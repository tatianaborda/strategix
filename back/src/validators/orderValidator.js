const Joi = require('joi');

const createOrderSchema = Joi.object({
  userAddress: Joi.string().lowercase().pattern(/^0x[a-fA-F0-9]{40}$/i).required(),
  makerAsset: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/i).optional(),
  takerAsset: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/i).optional(),
  makingAmount: Joi.string().pattern(/^\d+$/).optional(),
  takingAmount: Joi.string().pattern(/^\d+$/).optional(),
  conditions: Joi.object().optional(),
  orderData: Joi.object().optional(),
  strategy_id: Joi.number().optional(),
  orderHash: Joi.string().optional(),
  signature: Joi.string().optional()
});

module.exports = {
  validateOrder: (req, res, next) => {
    const { error } = createOrderSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: `invalid data: ${error.message}`,
      });
    }
    next();
  },
};