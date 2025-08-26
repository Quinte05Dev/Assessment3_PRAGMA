// src/handlers/torneos/listarTorneos.js
// Handler para GET /api/torneos - Listar torneos del organizador (sin autenticación requerida)

const { successResponse, errorResponse } = require('../common/responses');
const { validateQueryParameters } = require('../common/validator');
const { torneoService } = require('../../services/torneoService');
const { EstadoTorneo } = require('../../domain/tournament/enums/EstadoTorneo');
const { logger } = require('../../utils/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Handler para listar torneos del organizador
 * 
 * Path: /api/torneos
 * Method: GET
 * Auth: No requerido (para pruebas, se usa userId desde query params o valor predeterminado)
 * Query Parameters:
 *   - userId: string (opcional, para pruebas) - ID del organizador
 *   - estado: string (opcional) - Filtrar por estado específico
 *   - fechaDesde: string (opcional) - ISO date, torneos creados desde esta fecha
 *   - fechaHasta: string (opcional) - ISO date, torneos creados hasta esta fecha
 *   - limite: number (opcional) - Límite de resultados (default: 50, max: 100)
 *   - offset: number (opcional) - Offset para paginación (default: 0)
 *   - incluirCancelados: boolean (opcional) - Incluir torneos cancelados (default: true)
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "torneos": [
 *       {
 *         "torneoId": "550e8400-e29b-41d4-a716-446655440000",
 *         "nombre": "Copa de Verano 2024",
 *         "categoria": "Profesional",
 *         "estado": "BORRADOR",
 *         "fechaCreacion": "2024-01-20T10:30:00.000Z",
 *         "participantesActuales": 5,
 *         "limiteParticipantes": 32,
 *         "version": 1
 *       }
 *     ],
 *     "total": 15,
 *     "filtros": {
 *       "estado": null,
 *       "fechaDesde": null,
 *       "fechaHasta": null,
 *       "incluirCancelados": true
 *     },
 *     "paginacion": {
 *       "limite": 50,
 *       "offset": 0,
 *       "hasMore": false
 *     }
 *   },
 *   "requestId": "..."
 * }
 */
exports.handler = async (event) => {
  const requestId = event.requestContext?.requestId || uuidv4();
  const contextLogger = logger.withContext({ requestId, handler: 'listarTorneos' });
  
  try {
    contextLogger.info('Iniciando listado de torneos', { 
      httpMethod: event.httpMethod,
      path: event.path,
      queryParams: event.queryStringParameters 
    });

    // 1. Obtener userId (para pruebas, usamos query param o valor predeterminado)
    const userId = event.queryStringParameters?.userId || 'test-organizador-id';
    contextLogger.info('Usuario identificado', { userId });

    // 2. Validar query parameters
    const queryParams = validateQueryParameters(event, {
      userId: { type: 'string', required: false },
      estado: { 
        type: 'string', 
        enum: EstadoTorneo.valores(),
        required: false
      },
      fechaDesde: { type: 'string', pattern: /^\d{4}-\d{2}-\d{2}$/, required: false },
      fechaHasta: { type: 'string', pattern: /^\d{4}-\d{2}-\d{2}$/, required: false },
      limite: { type: 'number', min: 1, max: 100, default: 50 },
      offset: { type: 'number', min: 0, default: 0 },
      incluirCancelados: { type: 'boolean', default: true }
    });

    const filtros = {
      estado: queryParams.estado,
      fechaDesde: queryParams.fechaDesde,
      fechaHasta: queryParams.fechaHasta,
      incluirCancelados: queryParams.incluirCancelados
    };

    const paginacion = {
      limite: queryParams.limite,
      offset: queryParams.offset
    };

    contextLogger.info('Parámetros validados', { filtros, paginacion });

    // 3. Obtener torneos del service
    const startTime = Date.now();
    const torneos = await torneoService.listarPorOrganizador(userId, filtros);
    const duration = Date.now() - startTime;
    
    contextLogger.metric('listarTorneos', duration, { 
      organizadorId: userId,
      total: torneos.length
    });

    // 4. Filtrar cancelados si no se incluyen
    const torneosFiltrados = filtros.incluirCancelados 
      ? torneos 
      : torneos.filter(t => t.estado !== 'CANCELADO');

    // 5. Aplicar paginación manual
    const totalSinPaginar = torneosFiltrados.length;
    const torneosConPaginacion = torneosFiltrados.slice(paginacion.offset, paginacion.offset + paginacion.limite);
    const hasMore = (paginacion.offset + paginacion.limite) < totalSinPaginar;

    const durationPag = Date.now() - startTime;
    contextLogger.metric('listarTorneos', durationPag, { 
      total: totalSinPaginar,
      returned: torneosConPaginacion.length,
      organizadorId: userId
    });

    // 6. Formatear respuesta
    const torneosFormateados = torneosConPaginacion.map(torneo => ({
      torneoId: torneo.id,
      nombre: torneo.nombre,
      categoria: torneo.categoria,
      categoriaId: torneo.categoriaId,
      estado: torneo.estado,
      fechaCreacion: torneo.fechaCreacion,
      participantesActuales: torneo.participantesActuales,
      limiteParticipantes: torneo.limiteParticipantes,
      version: torneo.version,
      ...(torneo.fechaCancelacion && {
        fechaCancelacion: torneo.fechaCancelacion,
        razonCancelacion: torneo.razonCancelacion
      })
    }));

    // 7. Calcular estadísticas rápidas
    const estadisticas = {
      porEstado: {}
    };

    EstadoTorneo.valores().forEach(estado => {
      estadisticas.porEstado[estado] = torneos.filter(t => t.estado === estado).length;
    });

    // 8. Construir respuesta completa
    const response = {
      torneos: torneosFormateados,
      total: totalSinPaginar,
      filtros,
      paginacion: {
        ...paginacion,
        hasMore,
        totalPaginas: Math.ceil(totalSinPaginar / paginacion.limite),
        paginaActual: Math.floor(paginacion.offset / paginacion.limite) + 1
      },
      estadisticas
    };

    contextLogger.info('Torneos listados exitosamente', { 
      organizadorId: userId,
      total: totalSinPaginar,
      returned: torneosConPaginacion.length,
      hasMore 
    });

    contextLogger.audit('TORNEOS_LISTADOS', userId, { 
      total: totalSinPaginar,
      filtros: Object.keys(filtros).filter(k => filtros[k] !== null)
    });

    return successResponse(200, { success: true, data: response }, requestId);

  } catch (error) {
    // Manejo de errores diferenciado
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