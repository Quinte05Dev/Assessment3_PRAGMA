// src/domain/shared/errors/ErrorDominio.js
// Inferido del uso en el código TDD existente

/**
 * Error de dominio personalizado para reglas de negocio
 * Usado para distinguir errores de validación/negocio de errores técnicos
 */
class ErrorDominio extends Error {
  constructor(message, codigo = null) {
    super(message);
    this.name = 'ErrorDominio';
    this.codigo = codigo;
    this.timestamp = new Date().toISOString();
    
    // Mantener stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ErrorDominio);
    }
  }

  /**
   * Serializa el error para respuestas HTTP
   */
  toJSON() {
    return {
      error: 'DOMAIN_ERROR',
      message: this.message,
      codigo: this.codigo,
      timestamp: this.timestamp
    };
  }
}

module.exports = { ErrorDominio };