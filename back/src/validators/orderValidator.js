const Joi = require('joi');

const createOrderSchema = Joi.object({
  userAddress: Joi.string().lowercase().pattern(/^0x[a-fA-F0-9]{40}$/i).required(),
  makerAsset: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/i).required(),
  takerAsset: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/i).required(),
  makingAmount: Joi.string().pattern(/^\d+$/).required(),
  takingAmount: Joi.string().pattern(/^\d+$/).required(),
  conditions: Joi.object().optional(),
  orderData: Joi.object().required(),
  strategy_id: Joi.number().required(),
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
