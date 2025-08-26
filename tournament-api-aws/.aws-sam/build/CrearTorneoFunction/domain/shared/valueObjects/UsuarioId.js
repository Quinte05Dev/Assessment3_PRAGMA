// src/domain/shared/valueObjects/UsuarioId.js
// Value Object para identificadores de usuario - Compartido across bounded contexts

const { ErrorDominio } = require('../errors/ErrorDominio');

/**
 * Value Object que representa la identidad única de un usuario
 * 
 * Usado para:
 * - Organizadores de torneos  
 * - Participantes
 * - Subadministradores
 * 
 * Formato: UUID v4 de Cognito o identificador alfanumérico
 */
class UsuarioId {
  constructor(valor) {
    // Validaciones básicas
    this._validarRequerido(valor);
    this._validarTipo(valor);
    
    // Normalizar valor
    const valorNormalizado = valor.trim();
    
    // Validaciones de formato
    this._validarFormato(valorNormalizado);
    
    // Asignar valor
    this._valor = valorNormalizado;
    
    // Hacer inmutable
    Object.freeze(this);
  }

  /**
   * Getter para acceder al valor
   */
  get valor() {
    return this._valor;
  }

  /**
   * Setter que previene modificación
   */
  set valor(nuevoValor) {
    throw new Error("Cannot modify immutable UsuarioId");
  }

  /**
   * Método equals para comparar identidades
   */
  equals(other) {
    if (!other) return false;
    if (!(other instanceof UsuarioId)) return false;
    return this._valor === other._valor;
  }

  /**
   * Método toString
   */
  toString() {
    return this._valor;
  }

  /**
   * Verifica si es un UUID de Cognito
   */
  esCognitoUUID() {
    const cognitoUuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return cognitoUuidRegex.test(this._valor);
  }

  // ========== MÉTODOS PRIVADOS ==========

  /**
   * Validar que el valor no sea nulo o vacío
   * @private
   */
  _validarRequerido(valor) {
    if (valor === null || valor === undefined) {
      throw new ErrorDominio('UsuarioId no puede ser nulo');
    }
    
    if (typeof valor === 'string' && valor.trim() === '') {
      throw new ErrorDominio('UsuarioId no puede ser nulo');
    }
  }

  /**
   * Validar tipo string
   * @private
   */
  _validarTipo(valor) {
    if (typeof valor !== 'string') {
      throw new ErrorDominio('UsuarioId debe ser un string');
    }
  }

  /**
   * Validar formato del identificador
   * @private
   */
  _validarFormato(valor) {
    // Debe tener al menos 3 caracteres
    if (valor.length < 3) {
      throw new ErrorDominio('UsuarioId debe tener al menos 3 caracteres');
    }

    // Máximo 50 caracteres (límite razonable)
    if (valor.length > 50) {
      throw new ErrorDominio('UsuarioId no puede exceder 50 caracteres');
    }

    // Formato: UUID de Cognito o identificador alfanumérico con guiones/underscores
    const formatoValido = /^[a-zA-Z0-9_-]+$/;
    if (!formatoValido.test(valor)) {
      throw new ErrorDominio('UsuarioId contiene caracteres no válidos');
    }
  }
}

module.exports = { UsuarioId };