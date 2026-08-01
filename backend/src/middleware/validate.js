const { ZodError } = require("zod");

function validate(schema, target = "body") {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req[target]);
      req[target] = parsed;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const messages = error.issues.map(
          (e) => `${e.path.join(".")}: ${e.message}`
        );
        return res.status(400).json({ error: messages.join("; ") });
      }
      next(error);
    }
  };
}

module.exports = { validate };

