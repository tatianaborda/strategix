const Joi = require('joi');

const strategySchema = Joi.object({
  user_id: Joi.number().integer().required(),
  name: Joi.string().max(100).required(),
  strategy_type: Joi.string().valid('LIMIT_ORDER', 'DCA', 'TWAP', 'GRID_TRADING', 'STOP_LOSS', 'CONDITIONAL').required(),
  config: Joi.object().required(),
  conditions: Joi.array().items(Joi.object()).min(1).required(),
  actions: Joi.array().items(Joi.object()).min(1).required(),
  status: Joi.string().valid('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED', 'FAILED').default('DRAFT')
});

const validateStrategy = (req, res, next) => {
  const { error, value } = strategySchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: `Faltan datos requeridos o tienen formato inválido: ${error.details[0].message}`
    });
  }
  req.body = value; // valor validado y con valores default si aplica
  next();
};

module.exports = validateStrategy;
