// src/handlers/categorias/listarCategorias.js
// Handler para GET /api/categorias - Listar categorías disponibles

const { successResponse, errorResponse } = require('../common/responses');
const { categoriaService } = require('../../services/categoriaService');
const { logger } = require('../../utils/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Handler para listar categorías disponibles
 * 
 * Path: /api/categorias
 * Method: GET
 * Auth: No requerido
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "categorias": [
 *       {
 *         "id": "cat-profesional-001",
 *         "descripcion": "Profesional",
 *         "alias": "profesional",
 *         "estaActiva": true
 *       }
 *     ],
 *     "total": 3
 *   },
 *   "requestId": "..."
 * }
 */
exports.handler = async (event) => {
  const requestId = event.requestContext?.requestId || uuidv4();
  const contextLogger = logger.withContext({ requestId, handler: 'listarCategorias' });

  try {
    contextLogger.info('Iniciando listado de categorías', {
      httpMethod: event.httpMethod,
      path: event.path
    });

    // 1. Obtener categorías activas
    const startTime = Date.now();
    const categorias = await categoriaService.listarActivas();
    const duration = Date.now() - startTime;

    contextLogger.metric('listarCategorias', duration, { total: categorias.length });

    // 2. Formatear respuesta
    const response = {
      categorias: categorias.map(c => ({
        id: c.id.valor,
        descripcion: c.descripcion,
        alias: c.alias,
        estaActiva: c.estaActiva
      })),
      total: categorias.length
    };

    contextLogger.info('Categorías listadas exitosamente', {
      total: categorias.length
    });

    contextLogger.audit('CATEGORIAS_LISTADAS', 'anonymous', {
      total: categorias.length
    });

    return successResponse(200, { success: true, data: response }, requestId);

  } catch (error) {
    contextLogger.error('Error interno del servidor', {
      message: error.message,
      stack: error.stack
    });

    return errorResponse(500, 'Error interno del servidor', requestId);
  }
};