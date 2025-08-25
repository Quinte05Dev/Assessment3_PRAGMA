// src/domain/tournament/valueObjects/TorneoId.js
// 🟢 GREEN PHASE - Código mínimo para hacer pasar TODOS los tests

const { ErrorDominio } = require('@domain/shared/errors/ErrorDominio');

/**
 * Value Object que representa la identidad única de un torneo
 * 
 * Características:
 * - Inmutable
 * - Validación de formato UUID v4
 * - Comparison por valor
 * - Usado across todos los bounded contexts (Shared Kernel)
 */
class TorneoId {
  constructor(valor) {
    // Validación: no puede ser nulo o vacío
    if (valor === null || valor === undefined || valor === '') {
      throw new ErrorDominio('TorneoId no puede ser nulo');
    }

    // Validación: debe ser un string
    if (typeof valor !== 'string') {
      throw new ErrorDominio('TorneoId debe ser un string');
    }

    // Validación: debe ser un UUID v4 válido
    if (!this._esUUIDValido(valor)) {
      throw new ErrorDominio('TorneoId debe ser un UUID v4 válido');
    }

    // Almacenar valor internamente
    this._valor = valor;

    // Hacer inmutable - característica clave de Value Objects
    Object.freeze(this);
  }

  /**
   * Getter para acceder al valor
   */
  get valor() {
    return this._valor;
  }

  /**
   * Setter que previene modificación (para cumplir test TDD)
   */
  set valor(nuevoValor) {
    throw new Error("Cannot modify immutable TorneoId");
  }

  /**
   * Método equals para comparar Value Objects
   * Dos TorneoId son iguales si tienen el mismo valor
   */
  equals(other) {
    if (!other) return false;
    if (!(other instanceof TorneoId)) return false;
    return this._valor === other._valor;
  }

  /**
   * Método toString para representación string
   */
  toString() {
    return this._valor;
  }

  /**
   * Validador privado para formato UUID v4
   * @private
   */
  _esUUIDValido(uuid) {
    // Regex para UUID v4 estricto
    // Formato: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    // donde x es cualquier dígito hex y y es uno de [8, 9, A, B]
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}

module.exports = { TorneoId };