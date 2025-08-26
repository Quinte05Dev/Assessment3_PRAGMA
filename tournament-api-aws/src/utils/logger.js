// src/utils/logger.js
// Utilidad de logging estructurado para CloudWatch

/**
 * Logger estructurado para Lambda functions
 * Genera logs en formato JSON para mejor integración con CloudWatch Insights
 */
class Logger {
  constructor() {
    this.level = process.env.LOG_LEVEL || 'INFO';
    this.levels = {
      ERROR: 0,
      WARN: 1, 
      INFO: 2,
      DEBUG: 3
    };
  }

  /**
   * Log de error
   * @param {string} message - Mensaje de error
   * @param {object} metadata - Datos adicionales
   */
  error(message, metadata = {}) {
    if (this.levels[this.level] >= this.levels.ERROR) {
      this._log('ERROR', message, metadata);
    }
  }

  /**
   * Log de warning
   * @param {string} message - Mensaje de advertencia
   * @param {object} metadata - Datos adicionales
   */
  warn(message, metadata = {}) {
    if (this.levels[this.level] >= this.levels.WARN) {
      this._log('WARN', message, metadata);
    }
  }

  /**
   * Log de información
   * @param {string} message - Mensaje informativo
   * @param {object} metadata - Datos adicionales
   */
  info(message, metadata = {}) {
    if (this.levels[this.level] >= this.levels.INFO) {
      this._log('INFO', message, metadata);
    }
  }

  /**
   * Log de debug
   * @param {string} message - Mensaje de debug
   * @param {object} metadata - Datos adicionales
   */
  debug(message, metadata = {}) {
    if (this.levels[this.level] >= this.levels.DEBUG) {
      this._log('DEBUG', message, metadata);
    }
  }

  /**
   * Log de métricas de performance
   * @param {string} operation - Nombre de la operación
   * @param {number} duration - Duración en ms
   * @param {object} metadata - Datos adicionales
   */
  metric(operation, duration, metadata = {}) {
    this._log('METRIC', `${operation} completed in ${duration}ms`, {
      ...metadata,
      operation,
      duration,
      type: 'performance'
    });
  }

  /**
   * Log de auditoría para acciones importantes
   * @param {string} action - Acción realizada
   * @param {string} userId - ID del usuario que realizó la acción
   * @param {object} metadata - Datos adicionales
   */
  audit(action, userId, metadata = {}) {
    this._log('AUDIT', action, {
      ...metadata,
      userId,
      action,
      type: 'audit'
    });
  }

  /**
   * Método interno para escribir logs
   * @private
   */
  _log(level, message, metadata) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      stage: process.env.STAGE || 'dev',
      service: 'torneo-api',
      version: process.env.VERSION || '1.0.0',
      ...metadata
    };

    // En desarrollo, usar formato más legible
    if (process.env.STAGE === 'dev') {
      console.log(`[${level}] ${message}`, metadata);
    } else {
      // En producción, usar JSON estructurado para CloudWatch
      console.log(JSON.stringify(logEntry));
    }
  }

  /**
   * Crea un logger con contexto específico
   * @param {object} context - Contexto a agregar a todos los logs
   * @returns {Logger} Nueva instancia con contexto
   */
  withContext(context) {
    const contextLogger = new Logger();
    contextLogger.level = this.level;
    
    // Override del método _log para incluir contexto
    const originalLog = contextLogger._log.bind(contextLogger);
    contextLogger._log = (level, message, metadata) => {
      originalLog(level, message, { ...context, ...metadata });
    };
    
    return contextLogger;
  }
}

// Instancia singleton
const logger = new Logger();

module.exports = { logger, Logger };