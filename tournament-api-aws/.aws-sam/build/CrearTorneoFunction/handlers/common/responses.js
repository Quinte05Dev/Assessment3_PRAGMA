// src/handlers/common/responses.js
// Utilidades para generar respuestas HTTP estandarizadas

/**
 * Genera una respuesta HTTP exitosa
 * @param {number} statusCode - Código de estado HTTP
 * @param {object} data - Datos a retornar
 * @param {string} requestId - ID de la petición para trazabilidad
 * @returns {object} Respuesta Lambda HTTP
 */
function successResponse(statusCode = 200, data = null, requestId = null) {
  const response = {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization'
    },
    body: JSON.stringify({
      success: true,
      data,
      requestId,
      timestamp: new Date().toISOString()
    })
  };

  return response;
}

/**
 * Genera una respuesta HTTP de error
 * @param {number} statusCode - Código de estado HTTP de error
 * @param {string} message - Mensaje de error
 * @param {string} requestId - ID de la petición
 * @param {object} details - Detalles adicionales del error
 * @returns {object} Respuesta Lambda HTTP
 */
function errorResponse(statusCode = 500, message = 'Error interno del servidor', requestId = null, details = null) {
  const response = {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',  
      'Access-Control-Allow-Headers': 'Content-Type,Authorization'
    },
    body: JSON.stringify({
      success: false,
      error: {
        message,
        code: getErrorCode(statusCode),
        details,
        requestId,
        timestamp: new Date().toISOString()
      }
    })
  };

  return response;
}

/**
 * Mapea códigos de estado HTTP a códigos de error específicos
 * @param {number} statusCode - Código de estado HTTP
 * @returns {string} Código de error
 */
function getErrorCode(statusCode) {
  const errorCodes = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED', 
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'VALIDATION_ERROR',
    429: 'RATE_LIMIT_EXCEEDED',
    500: 'INTERNAL_SERVER_ERROR',
    502: 'BAD_GATEWAY',
    503: 'SERVICE_UNAVAILABLE',
    504: 'GATEWAY_TIMEOUT'
  };

  return errorCodes[statusCode] || 'UNKNOWN_ERROR';
}

/**
 * Respuesta para errores de dominio específicos
 * @param {ErrorDominio} domainError - Error del dominio
 * @param {string} requestId - ID de la petición
 * @returns {object} Respuesta Lambda HTTP
 */
function domainErrorResponse(domainError, requestId = null) {
  return errorResponse(400, domainError.message, requestId, {
    type: 'DOMAIN_ERROR',
    codigo: domainError.codigo,
    timestamp: domainError.timestamp
  });
}

/**
 * Respuesta para errores de validación
 * @param {string} field - Campo que falló la validación
 * @param {string} message - Mensaje de error
 * @param {string} requestId - ID de la petición  
 * @returns {object} Respuesta Lambda HTTP
 */
function validationErrorResponse(field, message, requestId = null) {
  return errorResponse(422, `Error de validación en campo '${field}'`, requestId, {
    type: 'VALIDATION_ERROR',
    field,
    message
  });
}

/**
 * Respuesta para recursos no encontrados
 * @param {string} resource - Tipo de recurso no encontrado
 * @param {string} id - ID del recurso buscado
 * @param {string} requestId - ID de la petición
 * @returns {object} Respuesta Lambda HTTP  
 */
function notFoundResponse(resource, id, requestId = null) {
  return errorResponse(404, `${resource} con ID '${id}' no encontrado`, requestId, {
    type: 'NOT_FOUND',
    resource,
    resourceId: id
  });
}

/**
 * Respuesta para errores de autorización
 * @param {string} message - Mensaje de error personalizado
 * @param {string} requestId - ID de la petición
 * @returns {object} Respuesta Lambda HTTP
 */
function unauthorizedResponse(message = 'Token de acceso inválido o expirado', requestId = null) {
  return errorResponse(401, message, requestId, {
    type: 'UNAUTHORIZED'
  });
}

module.exports = {
  successResponse,
  errorResponse,
  domainErrorResponse,
  validationErrorResponse,
  notFoundResponse,
  unauthorizedResponse,
  getErrorCode
};