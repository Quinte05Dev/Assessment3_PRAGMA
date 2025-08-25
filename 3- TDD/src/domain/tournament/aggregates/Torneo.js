// src/domain/tournament/aggregates/Torneo.js
// 🟢 GREEN PHASE - Aggregate Root básico para API

const { ErrorDominio } = require('@domain/shared/errors/ErrorDominio');
const { EstadoTorneo } = require('@domain/tournament/enums/EstadoTorneo');

/**
 * Aggregate Root: Torneo
 * 
 * Versión básica enfocada en API - contiene lo mínimo necesario para:
 * - Crear torneos via API
 * - Validar reglas de negocio fundamentales  
 * - Serializar para respuestas HTTP
 * 
 * Responsabilidades:
 * - Mantener identidad e información básica
 * - Validar categoría activa al crear
 * - Proveer datos para APIs REST
 */
class Torneo {
  constructor(id, nombre, categoria, organizadorId) {
    // Validaciones de construcción
    this._validarParametrosRequeridos(id, nombre, categoria, organizadorId);
    this._validarCategoriaActiva(categoria);
    
    // Asignar propiedades core
    this.id = id;
    this.nombre = nombre;
    this.categoria = categoria;
    this.organizadorId = organizadorId;
    
    // Estado inicial y metadata
    this.estado = EstadoTorneo.BORRADOR;
    this.fechaCreacion = new Date();
    
    // Propiedades para futuras extensiones
    this.limiteParticipantes = null;
    this.participantesActuales = 0;
    
    // Metadata de auditoría
    this.version = 1;
  }

  // ========== API METHODS ==========

  /**
   * Obtiene resumen del torneo para respuestas de API
   * Formato optimizado para listados y consultas
   */
  obtenerResumenParaAPI() {
    return {
      torneoId: this.id.valor,
      nombre: this.nombre.valor,
      categoria: this.categoria.descripcion,
      organizadorId: this.organizadorId.valor,
      estado: this.estado,
      fechaCreacion: this.fechaCreacion.toISOString(),
      participantesActuales: this.participantesActuales,
      limiteParticipantes: this.limiteParticipantes
    };
  }

  /**
   * Obtiene datos específicos para respuesta de creación
   * Formato para POST /torneos response
   */
  obtenerDatosCreacion() {
    return {
      torneoId: this.id.valor,
      nombre: this.nombre.valor,
      estado: this.estado,
      organizadorId: this.organizadorId.valor,
      fechaCreacion: this.fechaCreacion.toISOString()
    };
  }

  /**
   * Verifica si el torneo puede ser configurado
   * Usado por endpoints de actualización
   */
  puedeConfigurar() {
    return this.estado === EstadoTorneo.BORRADOR;
  }

  /**
   * Obtiene detalles completos para GET /torneos/{id}
   */
  obtenerDetallesCompletos() {
    return {
      torneoId: this.id.valor,
      nombre: this.nombre.valor,
      categoria: {
        id: this.categoria.id.valor,
        descripcion: this.categoria.descripcion,
        alias: this.categoria.alias
      },
      organizadorId: this.organizadorId.valor,
      estado: this.estado,
      fechaCreacion: this.fechaCreacion.toISOString(),
      participantesActuales: this.participantesActuales,
      limiteParticipantes: this.limiteParticipantes,
      version: this.version
    };
  }

  // ========== BUSINESS METHODS ==========

  /**
   * Actualiza el límite de participantes
   * Usado por endpoint PUT /torneos/{id}
   */
  actualizarLimiteParticipantes(nuevoLimite) {
    if (!this.puedeConfigurar()) {
      throw new ErrorDominio('No se puede modificar torneo en estado ' + this.estado);
    }

    if (nuevoLimite < 2) {
      throw new ErrorDominio('El límite debe ser al menos 2 participantes');
    }

    if (nuevoLimite > 1000) {
      throw new ErrorDominio('El límite máximo es 1000 participantes');
    }

    this.limiteParticipantes = nuevoLimite;
    this.version++;
  }

  /**
   * Cancela el torneo
   * Usado por endpoint DELETE /torneos/{id}
   */
  cancelar(razon = 'Cancelado por organizador') {
    if (this.estado === EstadoTorneo.FINALIZADO) {
      throw new ErrorDominio('No se puede cancelar un torneo finalizado');
    }

    if (this.estado === EstadoTorneo.CANCELADO) {
      return; // Ya cancelado, operación idempotente
    }

    this.estado = EstadoTorneo.CANCELADO;
    this.razonCancelacion = razon;
    this.fechaCancelacion = new Date();
    this.version++;
  }

  // ========== VALIDATION METHODS ==========

  /**
   * Validar parámetros requeridos del constructor
   * @private
   */
  _validarParametrosRequeridos(id, nombre, categoria, organizadorId) {
    if (!id) {
      throw new ErrorDominio('ID del torneo es requerido');
    }
    if (!nombre) {
      throw new ErrorDominio('Nombre del torneo es requerido');
    }
    if (!categoria) {
      throw new ErrorDominio('Categoría del torneo es requerido');
    }
    if (!organizadorId) {
      throw new ErrorDominio('Organizador es requerido');
    }
  }

  /**
   * Validar que la categoría esté activa
   * @private
   */
  _validarCategoriaActiva(categoria) {
    if (!categoria.estaActiva) {
      throw new ErrorDominio('No se puede crear torneo con categoría inactiva');
    }
  }
}

module.exports = { Torneo };