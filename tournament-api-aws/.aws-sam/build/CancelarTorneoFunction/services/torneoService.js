// src/services/torneoService.js
// Service mock para gestión de torneos - Simula persistencia backend

const { EstadoTorneo } = require('../domain/tournament/enums/EstadoTorneo');

/**
 * Service mock que simula un repositorio de torneos
 * En implementación real conectaría a DynamoDB con patrón single-table
 */
class TorneoService {
  constructor() {
    this.torneos = new Map();
    this.contadorTorneos = 0;
  }

  /**
   * Guarda un torneo (crear o actualizar)
   * @param {Torneo} torneo - Aggregate root del torneo
   * @returns {Promise<void>}
   * @throws {Error} Si torneo es inválido
   */
  async guardar(torneo) {
    if (!torneo?.id?.valor || !torneo?.nombre?.valor || !torneo?.organizadorId?.valor || !torneo?.categoria?.id?.valor) {
      throw new Error('Torneo inválido: faltan propiedades requeridas');
    }
    try {
      await this._simularLatencia(200);
      const torneoData = this._serializarTorneo(torneo);
      this.torneos.set(torneo.id.valor, torneoData);
      this.contadorTorneos++;
      console.log(`Torneo ${torneo.id.valor} guardado exitosamente`);
    } catch (error) {
      throw new Error(`Error al guardar torneo: ${error.message}`);
    }
  }

  /**
   * Obtiene un torneo por su ID
   * @param {string} torneoId - ID del torneo
   * @returns {Promise<object|null>} Datos del torneo o null si no existe
   * @throws {Error} Si torneoId es inválido
   */
  async obtenerPorId(torneoId) {
    if (!torneoId || typeof torneoId !== 'string') {
      throw new Error('torneoId debe ser un string no vacío');
    }
    try {
      await this._simularLatencia(100);
      const torneoData = this.torneos.get(torneoId);
      return torneoData || null;
    } catch (error) {
      throw new Error(`Error al obtener torneo ${torneoId}: ${error.message}`);
    }
  }

  /**
   * Lista torneos por organizador
   * @param {string} organizadorId - ID del organizador
   * @param {object} filtros - Filtros opcionales (estado, etc.)
   * @returns {Promise<Array<object>>} Array de torneos del organizador
   * @throws {Error} Si organizadorId es inválido
   */
  async listarPorOrganizador(organizadorId, filtros = {}) {
    if (!organizadorId || typeof organizadorId !== 'string') {
      throw new Error('organizadorId debe ser un string no vacío');
    }
    try {
      await this._simularLatencia(150);
      let torneos = Array.from(this.torneos.values())
        .filter(torneo => torneo.organizadorId === organizadorId);
      if (filtros.estado) {
        torneos = torneos.filter(torneo => torneo.estado === filtros.estado);
      }
      if (filtros.fechaDesde) {
        torneos = torneos.filter(torneo => 
          new Date(torneo.fechaCreacion) >= new Date(filtros.fechaDesde)
        );
      }
      torneos.sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion));
      return torneos;
    } catch (error) {
      throw new Error(`Error al listar torneos del organizador: ${error.message}`);
    }
  }

  /**
   * Verifica si existe un torneo con el ID especificado
   * @param {string} torneoId - ID del torneo
   * @returns {Promise<boolean>} True si existe, false caso contrario
   * @throws {Error} Si torneoId es inválido
   */
  async existe(torneoId) {
    if (!torneoId || typeof torneoId !== 'string') {
      throw new Error('torneoId debe ser un string no vacío');
    }
    try {
      await this._simularLatencia(50);
      return this.torneos.has(torneoId);
    } catch (error) {
      throw new Error(`Error al verificar existencia del torneo: ${error.message}`);
    }
  }

  /**
   * Elimina un torneo (cancelación física)
   * @param {string} torneoId - ID del torneo a eliminar
   * @returns {Promise<boolean>} True si se eliminó, false si no existía
   * @throws {Error} Si torneoId es inválido
   */
  async eliminar(torneoId) {
    if (!torneoId || typeof torneoId !== 'string') {
      throw new Error('torneoId debe ser un string no vacío');
    }
    try {
      await this._simularLatencia(100);
      const eliminado = this.torneos.delete(torneoId);
      if (eliminado) {
        console.log(`Torneo ${torneoId} eliminado físicamente`);
      }
      return eliminado;
    } catch (error) {
      throw new Error(`Error al eliminar torneo: ${error.message}`);
    }
  }

  /**
   * Obtiene estadísticas generales de torneos
   * @returns {Promise<object>} Estadísticas de torneos
   */
  async obtenerEstadisticas() {
    try {
      await this._simularLatencia(250);
      const todos = Array.from(this.torneos.values());
      const estadisticas = {
        total: todos.length,
        porEstado: {},
        porCategoria: {},
        promedioPorDia: 0
      };
      Object.values(EstadoTorneo.valores()).forEach(estado => {
        estadisticas.porEstado[estado] = todos.filter(t => t.estado === estado).length;
      });
      todos.forEach(torneo => {
        const categoria = torneo.categoria;
        estadisticas.porCategoria[categoria] = (estadisticas.porCategoria[categoria] || 0) + 1;
      });
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() - 30);
      const torneosRecientes = todos.filter(t => 
        new Date(t.fechaCreacion) >= fechaLimite
      );
      estadisticas.promedioPorDia = Math.round((torneosRecientes.length / 30) * 100) / 100;
      return estadisticas;
    } catch (error) {
      throw new Error(`Error al obtener estadísticas: ${error.message}`);
    }
  }

  // ========== MÉTODOS PRIVADOS ==========

  /**
   * Serializa el aggregate Torneo para persistencia
   * @private
   */
  _serializarTorneo(torneo) {
    if (!torneo?.id?.valor || !torneo?.nombre?.valor || !torneo?.organizadorId?.valor || !torneo?.categoria?.id?.valor) {
      throw new Error('Torneo inválido: faltan propiedades requeridas');
    }
    return {
      id: torneo.id.valor,
      nombre: torneo.nombre.valor,
      organizadorId: torneo.organizadorId.valor,
      categoria: torneo.categoria.descripcion,
      categoriaId: torneo.categoria.id.valor,
      estado: torneo.estado,
      fechaCreacion: torneo.fechaCreacion.toISOString(),
      limiteParticipantes: torneo.limiteParticipantes,
      participantesActuales: torneo.participantesActuales,
      version: torneo.version,
      fechaCancelacion: torneo.fechaCancelacion?.toISOString(),
      razonCancelacion: torneo.razonCancelacion,
      _gsi1pk: `ORG#${torneo.organizadorId.valor}`,
      _gsi1sk: `TORNEO#${torneo.fechaCreacion.toISOString()}`,
      _type: 'TORNEO'
    };
  }

  /**
   * Simula latencia de base de datos
   * @private
   */
  async _simularLatencia(milisegundos) {
    return new Promise(resolve => setTimeout(resolve, milisegundos));
  }

  /**
   * Limpia todos los torneos (solo para testing)
   * @private
   */
  _limpiarTodos() {
    this.torneos.clear();
    this.contadorTorneos = 0;
  }
}

// Singleton para uso en toda la aplicación
const torneoService = new TorneoService();

module.exports = { torneoService, TorneoService };