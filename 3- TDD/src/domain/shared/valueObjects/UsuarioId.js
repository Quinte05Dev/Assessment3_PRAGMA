// src/domain/shared/valueObjects/UsuarioId.js
// 🟢 GREEN PHASE - Identificador de usuario (Shared Kernel)

const { ErrorDominio } = require('@domain/shared/errors/ErrorDominio');

/**
 * Value Object para identificar usuarios
 * Parte del Shared Kernel - usado por todos los contextos
 */
class UsuarioId {
  constructor(valor) {
    if (!valor) {
      throw new ErrorDominio('UsuarioId no puede ser nulo');
    }
    
    if (typeof valor !== 'string') {
      throw new ErrorDominio('UsuarioId debe ser un string');
    }
    
    this._valor = valor.trim();
    Object.freeze(this);
  }

  get valor() {
    return this._valor;
  }

  set valor(nuevoValor) {
    throw new Error("Cannot modify immutable UsuarioId");
  }

  equals(other) {
    if (!other) return false;
    if (!(other instanceof UsuarioId)) return false;
    return this._valor === other._valor;
  }

  toString() {
    return this._valor;
  }
}

module.exports = { UsuarioId };