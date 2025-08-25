// src/domain/shared/errors/ErrorDominio.js
// 🟢 GREEN PHASE - Código mínimo para hacer pasar el test

/**
 * Error específico del dominio de negocio
 * Se usa para validaciones de reglas de negocio que no deben ser violadas
 */
class ErrorDominio extends Error {
  constructor(message) {
    super(message);
    this.name = 'ErrorDominio';
    
    // Mantener stack trace en V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ErrorDominio);
    }
  }
}

module.exports = { ErrorDominio };