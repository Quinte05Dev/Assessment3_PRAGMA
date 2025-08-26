// src/domain/tournament/enums/EstadoTorneo.js
// 🟢 GREEN PHASE - Estados del torneo según domain model

/**
 * Enum que define los estados válidos de un torneo
 * 
 * Flujo normal: BORRADOR → ABIERTO_REGISTRO → REGISTRO_CERRADO → EN_PROGRESO → FINALIZADO
 * Estado especial: CANCELADO (puede ocurrir desde cualquier estado pre-finalización)
 */
const EstadoTorneo = Object.freeze({
  BORRADOR: 'BORRADOR',
  ABIERTO_REGISTRO: 'ABIERTO_REGISTRO', 
  REGISTRO_CERRADO: 'REGISTRO_CERRADO',
  EN_PROGRESO: 'EN_PROGRESO',
  FINALIZADO: 'FINALIZADO',
  CANCELADO: 'CANCELADO',

  /**
   * Obtiene todos los estados disponibles
   */
  valores() {
    return Object.values(this).filter(v => typeof v === 'string');
  },

  /**
   * Valida si un estado es válido
   */
  esValido(estado) {
    return this.valores().includes(estado);
  },

  /**
   * Verifica si se puede transicionar de un estado a otro
   */
  puedeTransicionarA(estadoActual, estadoDestino) {
    const transicionesValidas = {
      [this.BORRADOR]: [this.ABIERTO_REGISTRO, this.CANCELADO],
      [this.ABIERTO_REGISTRO]: [this.REGISTRO_CERRADO, this.EN_PROGRESO, this.CANCELADO],
      [this.REGISTRO_CERRADO]: [this.EN_PROGRESO, this.CANCELADO],
      [this.EN_PROGRESO]: [this.FINALIZADO, this.CANCELADO],
      [this.FINALIZADO]: [], // Estado terminal
      [this.CANCELADO]: []   // Estado terminal
    };

    return transicionesValidas[estadoActual]?.includes(estadoDestino) || false;
  }
});

module.exports = { EstadoTorneo };