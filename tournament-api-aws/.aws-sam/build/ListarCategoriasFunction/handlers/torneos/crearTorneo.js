// src/handlers/torneos/crearTorneo.js
// Handler para POST /api/torneos - Implementa exactamente la lógica del dominio TDD

const { Torneo } = require('../../domain/tournament/aggregates/Torneo');
const { TorneoId } = require('../../domain/tournament/valueObjects/TorneoId');
const { NombreTorneo } = require('../../domain/tournament/valueObjects/NombreTorneo');
const { UsuarioId } = require('../../domain/shared/valueObjects/UsuarioId');
const { ErrorDominio } = require('../../domain/shared/errors/ErrorDominio');
const { successResponse, errorResponse } = require('../common/responses');
const { validateRequestBody } = require('../common/validator');
const { categoriaService } = require('../../services/categoriaService');
const { torneoService } = require('../../services/torneoService');
const { logger } = require('../../utils/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Handler para crear un nuevo torneo
 * 
 * Path: /api/torneos
 * Method: POST
 * Auth: No requerido
 * 
 * Request Body:
 * {
 *   "nombre": "Copa de Verano 2024",
 *   "categoriaId": "cat-profesional-001", 
 *   "limiteParticipantes": 32,
 *   "organizadorId": "org-123" // opcional, default: test-organizador-id
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "torneoId": "550e8400-e29b-41d4-a716-446655440000",
 *     "nombre": "Copa de Verano 2024",
 *     "estado": "BORRADOR",
 *     "organizadorId": "org-123",
 *     "fechaCreacion": "2024-01-20T10:30:00.000Z"
 *   },
 *   "requestId": "..."
 * }
 */
exports.handler = async (event) => {
  const requestId = event.requestContext?.requestId || uuidv4();
  
  try {
    logger.info('Iniciando creación de torneo', { 
      requestId, 
      httpMethod: event.httpMethod,
      path: event.path 
    });

    // 1. Obtener organizadorId (sin autenticación)
    const requestBodyRaw = event.body ? JSON.parse(event.body) : {};
    const organizadorId = requestBodyRaw.organizadorId || 'test-organizador-id';
    logger.info('Organizador identificado', { requestId, organizadorId });

    // 2. Validar y parsear request body
    const requestBody = validateRequestBody(event, {
      nombre: { required: true, type: 'string', minLength: 3, maxLength: 100 },
      categoriaId: { required: true, type: 'string' },
      limiteParticipantes: { required: false, type: 'number', min: 2, max: 1000 },
      organizadorId: { required: false, type: 'string' }
    });

    logger.info('Request body validado', { requestId, datos: requestBody });

    // 3. Obtener y validar categoría (usando service mock)
    const categoria = await categoriaService.obtenerPorId(requestBody.categoriaId);
    if (!categoria) {
      logger.warn('Categoría no encontrada', { requestId, categoriaId: requestBody.categoriaId });
      return errorResponse(404, 'Categoría no encontrada', requestId);
    }

    if (!categoria.puedeUsarseEnTorneo()) {
      logger.warn('Categoría inactiva', { requestId, categoriaId: requestBody.categoriaId });
      return errorResponse(400, 'No se puede crear torneo con categoría inactiva', requestId);
    }

    logger.info('Categoría validada', { requestId, categoria: categoria.descripcion });

    // 4. Crear value objects del dominio
    const torneoId = new TorneoId(uuidv4());
    const nombreTorneo = new NombreTorneo(requestBody.nombre);
    const usuarioOrganizador = new UsuarioId(organizadorId);

    logger.info('Value objects creados', { 
      requestId, 
      torneoId: torneoId.valor,
      nombre: nombreTorneo.valor 
    });

    // 5. Crear aggregate root usando exactamente la lógica TDD
    const torneo = new Torneo(torneoId, nombreTorneo, categoria, usuarioOrganizador);

    // 6. Configurar límite de participantes si se proporciona
    if (requestBody.limiteParticipantes) {
      torneo.actualizarLimiteParticipantes(requestBody.limiteParticipantes);
      logger.info('Límite de participantes configurado', { 
        requestId, 
        limite: requestBody.limiteParticipantes 
      });
    }

    // 7. Persistir usando service mock
    await torneoService.guardar(torneo);
    logger.info('Torneo guardado', { requestId, torneoId: torneo.id.valor });

    // 8. Generar respuesta usando método del dominio
    const datosRespuesta = torneo.obtenerDatosCreacion();
    
    logger.info('Torneo creado exitosamente', { 
      requestId, 
      torneoId: datosRespuesta.torneoId,
      estado: datosRespuesta.estado 
    });

    // 9. Retornar respuesta exitosa
    return successResponse(201, { success: true, data: datosRespuesta }, requestId);

  } catch (error) {
    if (error instanceof ErrorDominio) {
      logger.warn('Error de dominio', { 
        requestId, 
        message: error.message,
        stack: error.stack 
      });
      return errorResponse(400, error.message, requestId);
    }

    if (error.name === 'ValidationError') {
      logger.warn('Error de validación', { 
        requestId, 
        message: error.message 
      });
      return errorResponse(400, error.message, requestId);
    }

    logger.error('Error interno del servidor', { 
      requestId, 
      message: error.message,
      stack: error.stack 
    });

    return errorResponse(500, 'Error interno del servidor', requestId);
  }
};