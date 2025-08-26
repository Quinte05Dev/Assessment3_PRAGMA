// src/handlers/torneos/cancelarTorneo.js
// Handler para DELETE /api/torneos/{id} - Cancelar torneo

const { Torneo } = require('../../domain/tournament/aggregates/Torneo');
const { TorneoId } = require('../../domain/tournament/valueObjects/TorneoId');
const { NombreTorneo } = require('../../domain/tournament/valueObjects/NombreTorneo');
const { UsuarioId } = require('../../domain/shared/valueObjects/UsuarioId');
const { ErrorDominio } = require('../../domain/shared/errors/ErrorDominio');
const { successResponse, errorResponse, notFoundResponse } = require('../common/responses');
const { validatePathParameters, validateRequestBody } = require('../common/validator');
const { categoriaService } = require('../../services/categoriaService');
const { torneoService } = require('../../services/torneoService');
const { logger } = require('../../utils/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Handler para cancelar un torneo
 * 
 * Path: /api/torneos/{id}
 * Method: DELETE
 * Auth: No requerido
 * 
 * Request Body (opcional):
 * {
 *   "razon": "Problemas técnicos impiden la realización del torneo",
 *   "organizadorId": "test-organizador-id" // opcional, default: test-organizador-id
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "torneoId": "550e8400-e29b-41d4-a716-446655440000",
 *     "nombre": "Copa de Verano 2024",
 *     "estado": "CANCELADO",
 *     "fechaCancelacion": "2025-08-26T11:01:00.000Z",
 *     "razonCancelacion": "Problemas técnicos impiden la realización del torneo",
 *     "estadoAnterior": "BORRADOR",
 *     "participantesAfectados": 0,
 *     "version": 1
 *   },
 *   "requestId": "..."
 * }
 */
exports.handler = async (event) => {
  const requestId = event.requestContext?.requestId || uuidv4();
  const contextLogger = logger.withContext({ requestId, handler: 'cancelarTorneo' });
  
  try {
    contextLogger.info('Iniciando cancelación de torneo', { 
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

    // 3. Validar request body (opcional)
    let razonCancelacion = 'Cancelado por el organizador';
    
    if (event.body) {
      const requestBody = validateRequestBody(event, {
        razon: { required: false, type: 'string', minLength: 10, maxLength: 500 },
        organizadorId: { required: false, type: 'string' }
      });
      
      if (requestBody.razon) {
        razonCancelacion = requestBody.razon;
      }
    }

    contextLogger.info('Parámetros validados', { torneoId, razonCancelacion });

    // 4. Obtener torneo existente
    const startTime = Date.now();
    const torneoData = await torneoService.obtenerPorId(torneoId);
    
    if (!torneoData) {
      contextLogger.warn('Torneo no encontrado', { torneoId });
      return notFoundResponse('Torneo', torneoId, requestId);
    }

    // 5. Verificar que el torneo no esté ya cancelado
    if (torneoData.estado === 'CANCELADO') {
      contextLogger.info('Torneo ya está cancelado', { torneoId, estado: torneoData.estado });
      
      return successResponse(200, {
        success: true,
        data: {
          torneoId: torneoData.id,
          nombre: torneoData.nombre,
          estado: torneoData.estado,
          fechaCancelacion: torneoData.fechaCancelacion,
          razonCancelacion: torneoData.razonCancelacion,
          message: 'El torneo ya estaba cancelado'
        }
      }, requestId);
    }

    // 6. Reconstruir aggregate del dominio
    const categoria = await categoriaService.obtenerPorId(torneoData.categoriaId);
    if (!categoria) {
      contextLogger.error('Categoría del torneo no encontrada', { 
        torneoId, 
        categoriaId: torneoData.categoriaId 
      });
      return errorResponse(500, 'Error de integridad de datos', requestId);
    }

    const torneo = new Torneo(
      new TorneoId(torneoData.id),
      new NombreTorneo(torneoData.nombre),
      categoria,
      new UsuarioId(torneoData.organizadorId)
    );

    // Restaurar estado del aggregate
    const estadoAnterior = torneoData.estado;
    torneo.estado = estadoAnterior;
    torneo.fechaCreacion = new Date(torneoData.fechaCreacion);
    if (torneoData.limiteParticipantes) {
      torneo.limiteParticipantes = torneoData.limiteParticipantes;
    }
    torneo.participantesActuales = torneoData.participantesActuales;
    torneo.version = torneoData.version;

    contextLogger.info('Aggregate reconstruido', { 
      torneoId, 
      estado: torneo.estado,
      participantes: torneo.participantesActuales 
    });

    // 7. Aplicar cancelación usando lógica del dominio
    torneo.cancelar(razonCancelacion);
    
    contextLogger.info('Torneo cancelado via dominio', { 
      torneoId,
      estadoAnterior,
      estadoNuevo: torneo.estado,
      razon: razonCancelacion 
    });

    // 8. Persistir cambios
    await torneoService.guardar(torneo);
    
    const duration = Date.now() - startTime;
    contextLogger.metric('cancelarTorneo', duration, { torneoId });

    // 9. Generar respuesta
    const response = {
      torneoId: torneo.id.valor,
      nombre: torneo.nombre.valor,
      estado: torneo.estado,
      fechaCancelacion: torneo.fechaCancelacion.toISOString(),
      razonCancelacion: torneo.razonCancelacion,
      estadoAnterior,
      participantesAfectados: torneo.participantesActuales,
      version: torneo.version
    };

    contextLogger.info('Torneo cancelado exitosamente', { 
      torneoId,
      estadoAnterior,
      participantesAfectados: torneo.participantesActuales 
    });

    contextLogger.audit('TORNEO_CANCELADO', organizadorId, { 
      torneoId,
      estadoAnterior,
      razon: razonCancelacion,
      participantesAfectados: torneo.participantesActuales
    });

    return successResponse(200, { success: true, data: response }, requestId);

  } catch (error) {
    if (error instanceof ErrorDominio) {
      contextLogger.warn('Error de dominio', { 
        message: error.message,
        stack: error.stack 
      });
      return errorResponse(400, error.message, requestId);
    }

    if (error.name === 'ValidationError') {
      contextLogger.warn('Error de validación', { 
        message: error.message,
        field: error.field 
      });
      return errorResponse(422, error.message, requestId);
    }

    contextLogger.error('Error interno del servidor', { 
      message: error.message,
      stack: error.stack 
    });

    return errorResponse(500, 'Error interno del servidor', requestId);
  }
};