// src/handlers/torneos/actualizarTorneo.js
// Handler para PUT /api/torneos/{id} - Actualizar configuración del torneo

const { Torneo } = require('../../domain/tournament/aggregates/Torneo');
const { TorneoId } = require('../../domain/tournament/valueObjects/TorneoId');
const { NombreTorneo } = require('../../domain/tournament/valueObjects/NombreTorneo');
const { UsuarioId } = require('../../domain/shared/valueObjects/UsuarioId');
const { ErrorDominio } = require('../../domain/shared/errors/ErrorDominio');
const { successResponse, errorResponse, notFoundResponse } = require('../common/responses');
const { validateRequestBody, validatePathParameters } = require('../common/validator');
const { categoriaService } = require('../../services/categoriaService');
const { torneoService } = require('../../services/torneoService');
const { logger } = require('../../utils/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Handler para actualizar un torneo existente
 * 
 * Path: /api/torneos/{id}
 * Method: PUT
 * Auth: No requerido
 * 
 * Request Body:
 * {
 *   "limiteParticipantes": 64,
 *   "nombre": "Copa de Verano 2024 - Actualizada", // opcional
 *   "organizadorId": "org-123" // opcional, default: test-organizador-id
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "torneoId": "550e8400-e29b-41d4-a716-446655440000",
 *     "nombre": "Copa de Verano 2024 - Actualizada",
 *     "estado": "BORRADOR",
 *     "limiteParticipantes": 64,
 *     "participantesActuales": 0,
 *     "version": 2,
 *     "fechaActualizacion": "2025-08-26T10:49:00.000Z",
 *     "cambiosAplicados": [...]
 *   },
 *   "requestId": "..."
 * }
 */
exports.handler = async (event) => {
  const requestId = event.requestContext?.requestId || uuidv4();
  const contextLogger = logger.withContext({ requestId, handler: 'actualizarTorneo' });
  
  try {
    contextLogger.info('Iniciando actualización de torneo', { 
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

    // 3. Validar request body
    const requestBody = validateRequestBody(event, {
      limiteParticipantes: { required: false, type: 'number', min: 2, max: 1000 },
      nombre: { required: false, type: 'string', minLength: 3, maxLength: 100 },
      organizadorId: { required: false, type: 'string' }
    });

    contextLogger.info('Parámetros validados', { torneoId, updates: Object.keys(requestBody) });

    // 4. Obtener torneo existente
    const startTime = Date.now();
    const torneoData = await torneoService.obtenerPorId(torneoId);
    
    if (!torneoData) {
      contextLogger.warn('Torneo no encontrado', { torneoId });
      return notFoundResponse('Torneo', torneoId, requestId);
    }

    // 5. Reconstruir aggregate del dominio desde los datos persistidos
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
    torneo.estado = torneoData.estado;
    torneo.fechaCreacion = new Date(torneoData.fechaCreacion);
    if (torneoData.limiteParticipantes) {
      torneo.limiteParticipantes = torneoData.limiteParticipantes;
    }
    torneo.participantesActuales = torneoData.participantesActuales;
    torneo.version = torneoData.version;

    contextLogger.info('Aggregate reconstruido', { 
      torneoId, 
      estado: torneo.estado,
      version: torneo.version 
    });

    // 6. Aplicar actualizaciones usando lógica del dominio
    let cambiosAplicados = [];

    // Actualizar límite de participantes
    if (requestBody.limiteParticipantes !== undefined) {
      const limiteAnterior = torneo.limiteParticipantes;
      torneo.actualizarLimiteParticipantes(requestBody.limiteParticipantes);
      
      cambiosAplicados.push({
        campo: 'limiteParticipantes',
        valorAnterior: limiteAnterior,
        valorNuevo: torneo.limiteParticipantes
      });
      
      contextLogger.info('Límite de participantes actualizado', { 
        torneoId,
        limiteAnterior,
        limiteNuevo: torneo.limiteParticipantes 
      });
    }

    // Actualizar nombre (requiere reconstrucción del value object)
    if (requestBody.nombre !== undefined) {
      const nombreAnterior = torneo.nombre.valor;
      const nuevoNombre = new NombreTorneo(requestBody.nombre);
      
      if (torneo.puedeConfigurar()) {
        torneo.nombre = nuevoNombre;
        torneo.version++;
        
        cambiosAplicados.push({
          campo: 'nombre',
          valorAnterior: nombreAnterior,
          valorNuevo: nuevoNombre.valor
        });
        
        contextLogger.info('Nombre del torneo actualizado', { 
          torneoId,
          nombreAnterior,
          nombreNuevo: nuevoNombre.valor 
        });
      } else {
        throw new ErrorDominio('No se puede modificar el nombre del torneo en estado ' + torneo.estado);
      }
    }

    // 7. Persistir cambios
    await torneoService.guardar(torneo);
    
    const duration = Date.now() - startTime;
    contextLogger.metric('actualizarTorneo', duration, { 
      torneoId,
      cambios: cambiosAplicados.length 
    });

    // 8. Generar respuesta
    const response = {
      torneoId: torneo.id.valor,
      nombre: torneo.nombre.valor,
      estado: torneo.estado,
      limiteParticipantes: torneo.limiteParticipantes,
      participantesActuales: torneo.participantesActuales,
      version: torneo.version,
      fechaActualizacion: new Date().toISOString(),
      cambiosAplicados
    };

    contextLogger.info('Torneo actualizado exitosamente', { 
      torneoId,
      version: torneo.version,
      cambios: cambiosAplicados.length 
    });

    contextLogger.audit('TORNEO_ACTUALIZADO', organizadorId, { 
      torneoId,
      cambios: cambiosAplicados.map(c => c.campo)
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