// src/domain/tournament/valueObjects/CategoriaId.js
// 🟢 GREEN PHASE - Identificador único para categorías

const { ErrorDominio } = require('@domain/shared/errors/ErrorDominio');

/**
 * Value Object que representa la identidad única de una categoría
 * 
 * Formato esperado: cat-[nombre]-[numero] o variaciones
 * Ejemplos: cat-001, cat-profesional-2024, categoria-amateur
 */
class CategoriaId {
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
    throw new Error("Cannot modify immutable CategoriaId");
  }

  /**
   * Método equals para comparar identidades
   */
  equals(other) {
    if (!other) return false;
    if (!(other instanceof CategoriaId)) return false;
    return this._valor === other._valor;
  }

  /**
   * Método toString
   */
  toString() {
    return this._valor;
  }

  // ========== MÉTODOS PRIVADOS ==========

  /**
   * Validar que el valor no sea nulo o vacío
   * @private
   */
  _validarRequerido(valor) {
    if (valor === null || valor === undefined) {
      throw new ErrorDominio('CategoriaId no puede ser nulo');
    }
    
    if (typeof valor === 'string' && valor.trim() === '') {
      throw new ErrorDominio('CategoriaId no puede ser nulo');
    }
  }

  /**
   * Validar tipo string
   * @private
   */
  _validarTipo(valor) {
    if (typeof valor !== 'string') {
      throw new ErrorDominio('CategoriaId debe ser un string');
    }
  }

  /**
   * Validar formato del identificador
   * @private
   */
  _validarFormato(valor) {
    // Debe tener al menos 2 caracteres (permitir IDs cortos como 'id')
    if (valor.length < 2) {
      throw new ErrorDominio('CategoriaId debe tener formato inválido');
    }

    // Solo minúsculas, números, guiones y guiones bajos
    const formatoValido = /^[a-z0-9_-]+$/;
    if (!formatoValido.test(valor)) {
      throw new ErrorDominio('CategoriaId debe tener formato inválido');
    }
  }
}

module.exports = { CategoriaId };