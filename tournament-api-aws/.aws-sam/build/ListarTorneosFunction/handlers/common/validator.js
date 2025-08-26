// src/handlers/common/validator.js
// Utilidades para validar request bodies y parámetros

/**
 * Error de validación personalizado
 */
class ValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

/**
 * Valida y parsea el request body según un esquema
 * @param {object} event - Evento Lambda de API Gateway
 * @param {object} schema - Esquema de validación
 * @returns {object} Request body parseado y validado
 * @throws {ValidationError} Si la validación falla
 */
function validateRequestBody(event, schema) {
  // Validar que existe body
  if (!event.body) {
    throw new ValidationError('Request body es requerido');
  }

  // Parsear JSON
  let requestBody;
  try {
    requestBody = typeof event.body === 'string' 
      ? JSON.parse(event.body) 
      : event.body;
  } catch (error) {
    throw new ValidationError('Request body debe ser JSON válido');
  }

  // Validar contra esquema
  const validatedBody = {};
  
  for (const [field, rules] of Object.entries(schema)) {
    const value = requestBody[field];
    
    // Validar campo requerido
    if (rules.required && (value === undefined || value === null)) {
      throw new ValidationError(`Campo '${field}' es requerido`, field);
    }
    
    // Si el campo no es requerido y no está presente, continuar
    if (!rules.required && (value === undefined || value === null)) {
      continue;
    }
    
    // Validar tipo
    if (rules.type && typeof value !== rules.type) {
      throw new ValidationError(`Campo '${field}' debe ser de tipo ${rules.type}`, field);
    }
    
    // Validaciones específicas por tipo
    if (rules.type === 'string') {
      validateStringField(field, value, rules);
    } else if (rules.type === 'number') {
      validateNumberField(field, value, rules);
    } else if (rules.type === 'array') {
      validateArrayField(field, value, rules);
    }
    
    validatedBody[field] = value;
  }
  
  return validatedBody;
}

/**
 * Valida campos de tipo string
 * @param {string} field - Nombre del campo
 * @param {string} value - Valor a validar
 * @param {object} rules - Reglas de validación
 * @throws {ValidationError} Si la validación falla
 */
function validateStringField(field, value, rules) {
  if (rules.minLength && value.length < rules.minLength) {
    throw new ValidationError(
      `Campo '${field}' debe tener al menos ${rules.minLength} caracteres`, 
      field
    );
  }
  
  if (rules.maxLength && value.length > rules.maxLength) {
    throw new ValidationError(
      `Campo '${field}' no puede exceder ${rules.maxLength} caracteres`, 
      field
    );
  }
  
  if (rules.pattern && !rules.pattern.test(value)) {
    throw new ValidationError(
      `Campo '${field}' no cumple el formato requerido`, 
      field
    );
  }
  
  if (rules.enum && !rules.enum.includes(value)) {
    throw new ValidationError(
      `Campo '${field}' debe ser uno de: ${rules.enum.join(', ')}`, 
      field
    );
  }
}

/**
 * Valida campos de tipo number
 * @param {string} field - Nombre del campo
 * @param {number} value - Valor a validar
 * @param {object} rules - Reglas de validación
 * @throws {ValidationError} Si la validación falla
 */
function validateNumberField(field, value, rules) {
  if (rules.min !== undefined && value < rules.min) {
    throw new ValidationError(
      `Campo '${field}' debe ser mayor o igual a ${rules.min}`, 
      field
    );
  }
  
  if (rules.max !== undefined && value > rules.max) {
    throw new ValidationError(
      `Campo '${field}' debe ser menor o igual a ${rules.max}`, 
      field
    );
  }
  
  if (rules.integer && !Number.isInteger(value)) {
    throw new ValidationError(
      `Campo '${field}' debe ser un número entero`, 
      field
    );
  }
}

/**
 * Valida campos de tipo array
 * @param {string} field - Nombre del campo
 * @param {Array} value - Valor a validar
 * @param {object} rules - Reglas de validación
 * @throws {ValidationError} Si la validación falla
 */
function validateArrayField(field, value, rules) {
  if (!Array.isArray(value)) {
    throw new ValidationError(`Campo '${field}' debe ser un array`, field);
  }
  
  if (rules.minItems && value.length < rules.minItems) {
    throw new ValidationError(
      `Campo '${field}' debe tener al menos ${rules.minItems} elementos`, 
      field
    );
  }
  
  if (rules.maxItems && value.length > rules.maxItems) {
    throw new ValidationError(
      `Campo '${field}' no puede tener más de ${rules.maxItems} elementos`, 
      field
    );
  }
}

/**
 * Valida parámetros de path
 * @param {object} event - Evento Lambda de API Gateway
 * @param {object} schema - Esquema de validación para parámetros
 * @returns {object} Parámetros validados
 * @throws {ValidationError} Si la validación falla
 */
function validatePathParameters(event, schema) {
  const pathParameters = event.pathParameters || {};
  const validatedParams = {};
  
  for (const [param, rules] of Object.entries(schema)) {
    const value = pathParameters[param];
    
    if (rules.required && !value) {
      throw new ValidationError(`Parámetro de path '${param}' es requerido`, param);
    }
    
    if (value && rules.pattern && !rules.pattern.test(value)) {
      throw new ValidationError(`Parámetro '${param}' tiene formato inválido`, param);
    }
    
    validatedParams[param] = value;
  }
  
  return validatedParams;
}

/**
 * Valida query parameters
 * @param {object} event - Evento Lambda de API Gateway
 * @param {object} schema - Esquema de validación para query params
 * @returns {object} Query parameters validados
 * @throws {ValidationError} Si la validación falla
 */
function validateQueryParameters(event, schema) {
  const queryParameters = event.queryStringParameters || {};
  const validatedQuery = {};
  
  for (const [param, rules] of Object.entries(schema)) {
    let value = queryParameters[param];
    
    if (rules.required && !value) {
      throw new ValidationError(`Query parameter '${param}' es requerido`, param);
    }
    
    if (value) {
      // Convertir tipos
      if (rules.type === 'number') {
        value = Number(value);
        if (isNaN(value)) {
          throw new ValidationError(`Query parameter '${param}' debe ser un número`, param);
        }
      } else if (rules.type === 'boolean') {
        value = value.toLowerCase() === 'true';
      }
      
      validatedQuery[param] = value;
    }
  }
  
  return validatedQuery;
}

module.exports = {
  ValidationError,
  validateRequestBody,
  validatePathParameters,
  validateQueryParameters
};