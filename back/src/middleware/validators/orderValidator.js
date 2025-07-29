const Joi = require('joi');

const createOrderSchema = Joi.object({
  userAddress: Joi.string().lowercase().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  makerAsset: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  takerAsset: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required(),
  makingAmount: Joi.string().pattern(/^\d+$/).required(),
  takingAmount: Joi.string().pattern(/^\d+$/).required(),
  conditions: Joi.object().optional(),
});

module.exports = {
  validateOrder: (req, res, next) => {
    const { error } = createOrderSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: `Datos inválidos: ${error.message}`,
      });
    }
    next();
  },
};
