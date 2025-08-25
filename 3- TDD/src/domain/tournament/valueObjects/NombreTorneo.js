// src/domain/tournament/valueObjects/NombreTorneo.js
// 🟢 GREEN PHASE - Código para hacer pasar TODOS los tests

const { ErrorDominio } = require('@domain/shared/errors/ErrorDominio');

/**
 * Value Object que encapsula las reglas de negocio para nombres de torneo
 * 
 * Reglas de validación:
 * - Longitud: 3-100 caracteres
 * - Solo caracteres seguros (sin XSS, SQL injection, etc.)
 * - Debe contener al menos una letra o número
 * - Normalización automática de espacios
 * - Filtro de contenido prohibido
 */
class NombreTorneo {
  constructor(valor) {
    // Paso 1: Validaciones básicas
    this._validarRequerido(valor);
    
    // Paso 2: Normalizar el valor
    const valorNormalizado = this._normalizar(valor);
    
    // Paso 3: Validaciones de negocio
    this._validarLongitud(valorNormalizado);
    this._validarCaracteres(valorNormalizado);
    this._validarContenido(valorNormalizado);
    this._validarContieneTextoUtil(valorNormalizado);
    
    // Paso 4: Asignar valor normalizado
    this._valor = valorNormalizado;
    
    // Paso 5: Hacer inmutable
    Object.freeze(this);
  }

  /**
   * Getter para acceder al valor
   */
  get valor() {
    return this._valor;
  }

  /**
   * Setter que previene modificación (para TDD)
   */
  set valor(nuevoValor) {
    throw new Error("Cannot modify immutable NombreTorneo");
  }

  /**
   * Método equals para comparar Value Objects
   */
  equals(other) {
    if (!other) return false;
    if (!(other instanceof NombreTorneo)) return false;
    return this._valor === other._valor;
  }

  /**
   * Método toString para representación string
   */
  toString() {
    return this._valor;
  }

  /**
   * Verifica si el nombre contiene un término de búsqueda (case insensitive)
   */
  contieneTermino(termino) {
    if (!termino || typeof termino !== 'string') return false;
    return this._valor.toLowerCase().includes(termino.toLowerCase());
  }

  /**
   * Obtiene la longitud del nombre
   */
  longitud() {
    return this._valor.length;
  }

  // ========== MÉTODOS PRIVADOS DE VALIDACIÓN ==========

  /**
   * Validar que el valor sea requerido y tipo correcto
   * @private
   */
  _validarRequerido(valor) {
    if (valor === null || valor === undefined || typeof valor !== 'string') {
      throw new ErrorDominio('Nombre del torneo es requerido');
    }

    // Validar que no sea solo espacios
    if (valor.trim() === '') {
      throw new ErrorDominio('Nombre del torneo es requerido');
    }
  }

  /**
   * Normalizar espacios y formato
   * @private
   */
  _normalizar(valor) {
    return valor
      .trim() // Eliminar espacios al inicio/final
      .replace(/\s+/g, ' '); // Convertir múltiples espacios a uno solo
  }

  /**
   * Validar longitud según reglas de negocio
   * @private
   */
  _validarLongitud(valor) {
    if (valor.length < 3) {
      throw new ErrorDominio('El nombre del torneo debe tener al menos 3 caracteres');
    }

    if (valor.length > 100) {
      throw new ErrorDominio('El nombre del torneo no puede exceder 100 caracteres');
    }
  }

  /**
   * Validar caracteres permitidos (seguridad y usabilidad)
   * @private
   */
  _validarCaracteres(valor) {
    // Caracteres permitidos: letras (incluyendo acentos), números, espacios, y símbolos comunes
    // Incluimos () [] {} para que la validación de contenido útil tenga prioridad
    const caracteresPermitidos = /^[a-zA-ZñÑáéíóúÁÉÍÓÚ0-9\s\-_.,!():\[\]{}]+$/;
    
    if (!caracteresPermitidos.test(valor)) {
      throw new ErrorDominio('El nombre contiene caracteres no permitidos');
    }
  }

  /**
   * Validar que contenga al menos contenido útil
   * @private
   */
  _validarContieneTextoUtil(valor) {
    // Debe contener al menos una letra o número (no solo símbolos)
    const tieneContenidoUtil = /[a-zA-ZñÑáéíóúÁÉÍÓÚ0-9]/.test(valor);
    
    if (!tieneContenidoUtil) {
      throw new ErrorDominio('El nombre debe contener al menos una letra o número');
    }
  }

  /**
   * Validar contenido prohibido (anti-spam, calidad)
   * @private
   */
  _validarContenido(valor) {
    // Lista de palabras/patrones prohibidos
    const contenidoProhibido = [
      'spam',
      'test123',
      'ejemplo'
    ];
    
    const valorLower = valor.toLowerCase();
    
    for (const prohibido of contenidoProhibido) {
      if (valorLower.includes(prohibido.toLowerCase())) {
        throw new ErrorDominio('El nombre contiene contenido no permitido');
      }
    }
  }
}

module.exports = { NombreTorneo };