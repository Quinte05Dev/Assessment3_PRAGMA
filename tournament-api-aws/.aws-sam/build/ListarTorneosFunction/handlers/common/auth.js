// src/handlers/common/auth.js
// Manejo de autenticación con Cognito JWT

const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

/**
 * Error de autorización personalizado
 */
class UnauthorizedError extends Error {
  constructor(message = 'Token de acceso inválido o expirado') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Cliente JWKS para validar tokens de Cognito
 */
const client = jwksClient({
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 5,
  jwksUri: `https://cognito-idp.${process.env.AWS_REGION}.amazonaws.com/${process.env.USER_POOL_ID}/.well-known/jwks.json`
});

/**
 * Obtiene la clave pública para validar el JWT
 * @param {object} header - Header del JWT
 * @param {function} callback - Callback para obtener la clave
 */
function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
    } else {
      const signingKey = key.publicKey || key.rsaPublicKey;
      callback(null, signingKey);
    }
  });
}

/**
 * Extrae y valida el token JWT del evento Lambda
 * @param {object} event - Evento Lambda de API Gateway
 * @returns {Promise<string>} ID del usuario autenticado
 * @throws {UnauthorizedError} Si el token es inválido
 */
async function extractUserFromToken(event) {
  try {
    // Extraer token del header Authorization
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    
    if (!authHeader) {
      throw new UnauthorizedError('Header Authorization es requerido');
    }

    // Validar formato Bearer
    const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/);
    if (!tokenMatch) {
      throw new UnauthorizedError('Token debe usar formato Bearer');
    }

    const token = tokenMatch[1];

    // Validar token con Cognito
    return new Promise((resolve, reject) => {
      jwt.verify(token, getKey, {
        issuer: `https://cognito-idp.${process.env.AWS_REGION}.amazonaws.com/${process.env.USER_POOL_ID}`,
        audience: process.env.USER_POOL_CLIENT_ID
      }, (err, decoded) => {
        if (err) {
          reject(new UnauthorizedError('Token JWT inválido'));
        } else {
          // Extraer user ID del token decodificado
          const userId = decoded.sub || decoded['cognito:username'];
          if (!userId) {
            reject(new UnauthorizedError('Token no contiene información de usuario válida'));
          } else {
            resolve(userId);
          }
        }
      });
    });

  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    throw new UnauthorizedError('Error al procesar token de autorización');
  }
}

/**
 * Extrae información completa del usuario del token JWT
 * @param {object} event - Evento Lambda de API Gateway
 * @returns {Promise<object>} Información del usuario
 * @throws {UnauthorizedError} Si el token es inválido
 */
async function extractUserInfoFromToken(event) {
  try {
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    
    if (!authHeader) {
      throw new UnauthorizedError('Header Authorization es requerido');
    }

    const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/);
    if (!tokenMatch) {
      throw new UnauthorizedError('Token debe usar formato Bearer');
    }

    const token = tokenMatch[1];

    return new Promise((resolve, reject) => {
      jwt.verify(token, getKey, {
        issuer: `https://cognito-idp.${process.env.AWS_REGION}.amazonaws.com/${process.env.USER_POOL_ID}`,
        audience: process.env.USER_POOL_CLIENT_ID
      }, (err, decoded) => {
        if (err) {
          reject(new UnauthorizedError('Token JWT inválido'));
        } else {
          const userInfo = {
            userId: decoded.sub || decoded['cognito:username'],
            email: decoded.email,
            givenName: decoded.given_name,
            familyName: decoded.family_name,
            groups: decoded['cognito:groups'] || [],
            tokenUse: decoded.token_use,
            exp: decoded.exp,
            iat: decoded.iat
          };

          if (!userInfo.userId) {
            reject(new UnauthorizedError('Token no contiene información de usuario válida'));
          } else {
            resolve(userInfo);
          }
        }
      });
    });

  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    throw new UnauthorizedError('Error al procesar token de autorización');
  }
}

/**
 * Valida que el usuario tenga un rol específico
 * @param {object} userInfo - Información del usuario del token
 * @param {string} requiredRole - Rol requerido
 * @throws {UnauthorizedError} Si el usuario no tiene el rol
 */
function validateUserRole(userInfo, requiredRole) {
  if (!userInfo.groups.includes(requiredRole)) {
    throw new UnauthorizedError(`Acceso denegado. Se requiere rol: ${requiredRole}`);
  }
}

/**
 * Middleware de autenticación para Lambda functions
 * @param {Function} handler - Handler original de la función
 * @returns {Function} Handler con autenticación aplicada
 */
function withAuth(handler) {
  return async (event, context) => {
    try {
      // Extraer información del usuario
      const userInfo = await extractUserInfoFromToken(event);
      
      // Agregar información del usuario al contexto
      event.userInfo = userInfo;
      event.userId = userInfo.userId;
      
      // Ejecutar handler original
      return await handler(event, context);
      
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        return {
          statusCode: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({
            success: false,
            error: {
              message: error.message,
              code: 'UNAUTHORIZED',
              timestamp: new Date().toISOString()
            }
          })
        };
      }
      throw error;
    }
  };
}

module.exports = {
  UnauthorizedError,
  extractUserFromToken,
  extractUserInfoFromToken,
  validateUserRole,
  withAuth
};