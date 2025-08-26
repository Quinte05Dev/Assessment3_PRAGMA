// src/handlers/torneos/obtenerTorneo.js
// Handler para GET /api/torneos/{id} - Obtener detalles de un torneo específico

const { successResponse, errorResponse, notFoundResponse } = require('../common/responses');
const { validatePathParameters } = require('../common/validator');
const { torneoService } = require('../../services/torneoService');
const { logger } = require('../../utils/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Handler para obtener un torneo por ID
 * 
 * Path: /api/torneos/{id}
 * Method: GET
 * Auth: No requerido
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "torneoId": "550e8400-e29b-41d4-a716-446655440000",
 *     "nombre": "Copa de Verano 2024",
 *     "categoria": {
 *       "id": "cat-profesional-001",
 *       "descripcion": "Profesional",
 *       "alias": "profesional"
 *     },
 *     "organizadorId": "org-123",
 *     "estado": "BORRADOR",
 *     "fechaCreacion": "2024-01-20T10:30:00.000Z",
 *     "participantesActuales": 0,
 *     "limiteParticipantes": 32,
 *     "version": 1
 *   },
 *   "requestId": "..."
 * }
 */
exports.handler = async (event) => {
  const requestId = event.requestContext?.requestId || uuidv4();
  const contextLogger = logger.withContext({ requestId, handler: 'obtenerTorneo' });
  
  try {
    contextLogger.info('Iniciando obtención de torneo', { 
      httpMethod: event.httpMethod,
      path: event.path 
    });

    // 1. Obtener organizadorId (para auditoría, sin autenticación)
    const requestBodyRaw = event.body ? JSON.parse(event.body) : {};
    const organizadorId = requestBodyRaw.organizadorId || 'test-organizador-id';
    contextLogger.info('Organizador identificado', { organizadorId });

    // 2. Validar parámetros de path
    const pathParams = validatePathParameters(event, {
      id: { 
        required: true, 
        pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i 
      }
    });

    const torneoId = pathParams.id;
    contextLogger.info('Parámetros validados', { torneoId });

    // 3. Obtener torneo del service
    const startTime = Date.now();
    const torneoData = await torneoService.obtenerPorId(torneoId);
    const duration = Date.now() - startTime;
    
    contextLogger.metric('obtenerTorneo', duration, { torneoId });

    // 4. Verificar existencia
    if (!torneoData) {
      contextLogger.warn('Torneo no encontrado', { torneoId });
      return notFoundResponse('Torneo', torneoId, requestId);
    }

    // 5. Formatear respuesta usando estructura del dominio
    const response = {
      torneoId: torneoData.id,
      nombre: torneoData.nombre,
      categoria: {
        id: torneoData.categoriaId,
        descripcion: torneoData.categoria,
        alias: torneoData.categoria.toLowerCase()
      },
      organizadorId: torneoData.organizadorId,
      estado: torneoData.estado,
      fechaCreacion: torneoData.fechaCreacion,
      participantesActuales: torneoData.participantesActuales,
      limiteParticipantes: torneoData.limiteParticipantes,
      version: torneoData.version
    };

    // Agregar campos adicionales si existen
    if (torneoData.fechaCancelacion) {
      response.fechaCancelacion = torneoData.fechaCancelacion;
      response.razonCancelacion = torneoData.razonCancelacion;
    }

    contextLogger.info('Torneo obtenido exitosamente', { 
      torneoId,
      estado: torneoData.estado,
      participantes: torneoData.participantesActuales 
    });

    contextLogger.audit('TORNEO_CONSULTADO', organizadorId, { torneoId });

    return successResponse(200, { success: true, data: response }, requestId);

  } catch (error) {
    if (error.name === 'ValidationError') {
      contextLogger.warn('Error de validación', { 
        message: error.message,
        field: error.field 
      });
      return errorResponse(400, error.message, requestId);
    }

    contextLogger.error('Error interno del servidor', { 
      message: error.message,
      stack: error.stack 
    });

    return errorResponse(500, 'Error interno del servidor', requestId);
  }
};