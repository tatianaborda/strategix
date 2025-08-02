const Joi = require('joi');

const strategySchema = Joi.object({
  user_id: Joi.number().integer().required(),
  name: Joi.string().max(100).required(),
  strategy_type: Joi.string()
    .valid('LIMIT_ORDER', 'DCA', 'TWAP', 'GRID_TRADING', 'STOP_LOSS', 'CONDITIONAL')
    .required(),
  config: Joi.object().required(),
  conditions: Joi.array().items(Joi.object()).min(1).required(),
  actions: Joi.array().items(Joi.object()).min(1).required(),
  status: Joi.string()
    .valid('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED', 'FAILED')
    .default('DRAFT')
});

const validateStrategy = (req, res, next) => {
  const { error, value } = strategySchema.validate(req.body, {
    abortEarly: false, // Mostrar todos los errores, no solo el primero
    allowUnknown: false // No permitir campos no definidos en el schema
  });

  if (error) {
    const errorMessages = error.details.map(detail => detail.message);
    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      errors: errorMessages
    });
  }

  req.body = value; // Asignar el valor validado
  next();
};

module.exports = validateStrategy;