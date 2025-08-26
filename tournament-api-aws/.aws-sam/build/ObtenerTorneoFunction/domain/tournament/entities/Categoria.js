// src/domain/tournament/entities/Categoria.js
// 🟢 GREEN PHASE - Entity que representa una categoría de torneo

// const { CategoriaId } = require('@domain/tournament/valueObjects/CategoriaId');
// const { ErrorDominio } = require('@domain/shared/errors/ErrorDominio');
const { CategoriaId } = require('../valueObjects/CategoriaId');
const { ErrorDominio } = require('../../shared/errors/ErrorDominio');

/**
 * Entity que representa una categoría de torneo
 * 
 * Características:
 * - Identidad única (CategoriaId)
 * - Estado mutable (activa/inactiva)
 * - Configuración de comisiones
 * - Reglas de negocio para uso en torneos
 */
class Categoria {
  constructor(id, descripcion, alias) {
    // Validaciones de construcción
    this._validarParametrosConstructor(id, descripcion, alias);
    
    // Asignar identidad
    this.id = new CategoriaId(id);
    
    // Asignar propiedades validadas
    this.descripcion = this._validarDescripcion(descripcion);
    this.alias = this._validarAlias(alias);
    
    // Estado inicial
    this.estaActiva = true;
    this.fechaCreacion = new Date();
    
    // Configuración por defecto de comisiones
    this.configuracionComisiones = {
      porcentajeBase: 5.0,
      porcentajePremium: 8.0
    };
    
    // Restricciones (para futuras extensiones)
    this.restriccionesTipoJuego = [];
  }

  // ========== BUSINESS METHODS ==========

  /**
   * Activa la categoría para ser usada en nuevos torneos
   */
  activar() {
    if (this.estaActiva) {
      return; // Ya está activa, operación idempotente
    }
    
    this.estaActiva = true;
  }

  /**
   * Desactiva la categoría (no se puede usar en nuevos torneos)
   */
  desactivar() {
    if (!this.estaActiva) {
      return; // Ya está inactiva, operación idempotente
    }
    
    this.estaActiva = false;
  }

  /**
   * Actualiza la configuración de comisiones
   * 
   * @param {number} porcentajeBase - Porcentaje base (0-20%)
   * @param {number} porcentajePremium - Porcentaje premium opcional
   */
  actualizarComisiones(porcentajeBase, porcentajePremium = null) {
    // Validar porcentaje base
    if (porcentajeBase < 0 || porcentajeBase > 20) {
      throw new ErrorDominio('Porcentaje de comisión debe estar entre 0% y 20%');
    }

    // Actualizar configuración
    this.configuracionComisiones.porcentajeBase = porcentajeBase;
    
    if (porcentajePremium !== null) {
      if (porcentajePremium < 0 || porcentajePremium > 20) {
        throw new ErrorDominio('Porcentaje de comisión debe estar entre 0% y 20%');
      }
      this.configuracionComisiones.porcentajePremium = porcentajePremium;
    }
  }

  // ========== QUERY METHODS ==========

  /**
   * Verifica si la categoría puede usarse para crear torneos
   */
  puedeUsarseEnTorneo() {
    return this.estaActiva;
  }

  /**
   * Obtiene el porcentaje de comisión para un tipo específico
   * 
   * @param {string} tipoTorneo - 'base', 'premium', etc.
   * @returns {number} Porcentaje de comisión
   */
  obtenerComisionPara(tipoTorneo = 'base') {
    return tipoTorneo === 'premium' 
      ? this.configuracionComisiones.porcentajePremium
      : this.configuracionComisiones.porcentajeBase;
  }

  // ========== PRIVATE VALIDATION METHODS ==========

  /**
   * Validar parámetros del constructor
   * @private
   */
  _validarParametrosConstructor(id, descripcion, alias) {
    if (!id) {
      throw new ErrorDominio('ID de categoría es requerido');
    }
    if (!descripcion) {
      throw new ErrorDominio('Descripción de categoría es requerido');
    }
    if (!alias) {
      throw new ErrorDominio('Alias de categoría es requerido');
    }
  }

  /**
   * Validar y normalizar descripción
   * @private
   */
  _validarDescripcion(descripcion) {
    if (typeof descripcion !== 'string') {
      throw new ErrorDominio('Descripción debe ser un string');
    }

    const descNormalizada = descripcion.trim();
    
    if (descNormalizada.length < 2) {
      throw new ErrorDominio('La descripción debe tener al menos 2 caracteres');
    }
    
    if (descNormalizada.length > 100) {
      throw new ErrorDominio('La descripción no puede exceder 100 caracteres');
    }

    return descNormalizada;
  }

  /**
   * Validar y normalizar alias
   * @private
   */
  _validarAlias(alias) {
    if (typeof alias !== 'string') {
      throw new ErrorDominio('Alias debe ser un string');
    }

    const aliasNormalizado = alias.trim();
    
    // Validar formato: solo minúsculas, números y guiones
    if (!/^[a-z0-9-]+$/.test(aliasNormalizado)) {
      if (aliasNormalizado !== aliasNormalizado.toLowerCase()) {
        throw new ErrorDominio('El alias debe estar en minúsculas');
      }
      if (aliasNormalizado.includes(' ')) {
        throw new ErrorDominio('El alias no puede contener espacios');
      }
      throw new ErrorDominio('solo letras, números y guiones');
    }

    return aliasNormalizado;
  }
}

module.exports = { Categoria };