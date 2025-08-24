# DOCUMENTACIÓN TÉCNICA - CONTEXTO GESTIÓN DE TORNEOS
## Especificación Completa del Domain Model 

---

## **🎯 VISIÓN GENERAL DEL CONTEXTO**

### **Responsabilidad Principal:**
El contexto Gestión de Torneos es el **corazón del negocio** de la plataforma de e-sports. Su responsabilidad es gestionar el ciclo de vida completo de un torneo, desde su concepción hasta su finalización, manteniendo la integridad y consistencia de todas las reglas de negocio relacionadas con competencias de videojuegos.

### **Bounded Context Scope:**
- ✅ **Incluye:** Creación, configuración, gestión de participantes, estados de torneo, reglas de competencia
- ❌ **Excluye:** Procesamiento de pagos, streaming, notificaciones, métricas detalladas
- 🔗 **Colabora con:** Ticketing (para acceso pagado), Usuarios (validación), Streaming (datos evento)

### **Business Value:**
- **Automatización** de procesos manuales de organización
- **Escalabilidad** para soportar miles de torneos simultáneos
- **Consistencia** en aplicación de reglas de negocio
- **Trazabilidad** completa de actividades del torneo

---

## **🏗️ ARQUITECTURA DEL AGREGADO**

### **📊 Diseño del Aggregate Root - Torneo**

```javascript
/**
 * AGGREGATE ROOT: Torneo
 * 
 * Responsabilidad: Mantener consistencia de todas las reglas de negocio
 * relacionadas con un torneo específico de e-sports.
 * 
 * Invariantes principales:
 * - Un torneo siempre tiene exactamente un organizador
 * - Máximo 2 subadministradores por torneo
 * - El límite de participantes no puede ser menor que los ya registrados
 * - Los estados siguen una progresión válida
 */
class Torneo {
  constructor(id, nombre, categoria, tipoJuego, organizadorId) {
    // Validaciones de construcción
    this._validarParametrosConstructor(id, nombre, categoria, tipoJuego, organizadorId);
    
    // Value Objects para identidad e invariantes
    this.id = new TorneoId(id);
    this.nombre = new NombreTorneo(nombre);
    this.categoria = categoria; // Entity reference - validated externally
    this.tipoJuego = tipoJuego; // Entity reference - validated externally
    this.organizadorId = new UsuarioId(organizadorId);
    
    // Collections y estado interno
    this.participantes = new ColeccionParticipantes();
    this.subAdministradores = [];
    this.estado = EstadoTorneo.BORRADOR;
    this.limiteParticipantes = new LimiteParticipantes(0);
    this.etapasVenta = [];
    
    // Metadata y auditoría
    this.fechaCreacion = new FechaHora();
    this.fechaUltimaModificacion = new FechaHora();
    this.version = 1;
    
    // Domain Events queue
    this.eventosDelDominio = [];
    
    // Auto-raise creation event
    this.lanzarEvento(new TorneoCreado(
      this.id, 
      this.organizadorId, 
      this.categoria.id, 
      this.tipoJuego.id,
      this.fechaCreacion
    ));
  }

  // ========== BUSINESS METHODS - PARTICIPANT MANAGEMENT ==========
  
  /**
   * Agrega un participante al torneo
   * 
   * Pre-condiciones:
   * - Torneo debe estar en estado ABIERTO_REGISTRO
   * - No debe exceder el límite de participantes
   * - Usuario no debe estar ya registrado
   * 
   * Post-condiciones:
   * - Participante agregado a la colección
   * - Evento ParticipanteRegistrado disparado
   * - Version del agregado incrementada
   */
  agregarParticipante(participante) {
    // Validaciones de pre-condición
    this._validarEstadoParaRegistro();
    this._validarCapacidadDisponible();
    this._validarParticipanteNoExiste(participante.usuarioId);
    
    // Business logic execution
    this.participantes.agregar(participante);
    this.fechaUltimaModificacion = new FechaHora();
    this.version++;
    
    // Domain event
    this.lanzarEvento(new ParticipanteRegistrado(
      this.id,
      participante.id,
      participante.usuarioId,
      this.fechaUltimaModificacion
    ));
    
    // Post-condition validation
    this._validarInvariantesPost();
  }

  /**
   * Remueve un participante del torneo
   * 
   * Casos de uso:
   * - Cancelación voluntaria del participante
   * - Descalificación por parte del organizador
   * - Cancelación administrativa
   */
  removerParticipante(participanteId, razon = 'CANCELACION_VOLUNTARIA') {
    const participante = this.participantes.buscarPorId(participanteId);
    if (!participante) {
      throw new ErrorDominio(`Participante ${participanteId} no encontrado en torneo ${this.id.valor}`);
    }

    // Validar que el torneo no esté en progreso
    if (this.estado === EstadoTorneo.EN_PROGRESO) {
      throw new ErrorDominio('No se puede remover participantes durante torneo en progreso');
    }

    this.participantes.remover(participanteId);
    this.fechaUltimaModificacion = new FechaHora();
    this.version++;

    // Event específico según la razón
    const evento = razon === 'DESCALIFICACION' 
      ? new ParticipanteDescalificado(this.id, participanteId, razon)
      : new ParticipanteCancelado(this.id, participanteId, razon);
    
    this.lanzarEvento(evento);
  }

  // ========== BUSINESS METHODS - ADMINISTRATION ==========

  /**
   * Agrega un subadministrador al torneo
   * 
   * Reglas de negocio:
   * - Máximo 2 subadministradores por torneo
   * - Subadministrador no puede ser el organizador principal
   * - Solo el organizador puede agregar subadministradores
   */
  agregarSubAdministrador(usuarioId) {
    // Validaciones de negocio
    if (this.subAdministradores.length >= 2) {
      throw new ErrorDominio('Máximo 2 subadministradores permitidos por torneo');
    }

    if (this.organizadorId.equals(new UsuarioId(usuarioId))) {
      throw new ErrorDominio('El organizador no puede ser su propio subadministrador');
    }

    // Validar duplicados
    const yaExiste = this.subAdministradores.some(subAdmin => 
      subAdmin.equals(new UsuarioId(usuarioId))
    );
    
    if (yaExiste) {
      throw new ErrorDominio('El usuario ya es subadministrador de este torneo');
    }

    // Operación exitosa
    this.subAdministradores.push(new UsuarioId(usuarioId));
    this.fechaUltimaModificacion = new FechaHora();
    this.version++;

    this.lanzarEvento(new SubAdministradorAgregado(
      this.id, 
      new UsuarioId(usuarioId),
      this.fechaUltimaModificacion
    ));
  }

  /**
   * Remueve un subadministrador
   */
  removerSubAdministrador(usuarioId) {
    const index = this.subAdministradores.findIndex(subAdmin => 
      subAdmin.equals(new UsuarioId(usuarioId))
    );

    if (index === -1) {
      throw new ErrorDominio('Usuario no es subadministrador de este torneo');
    }

    this.subAdministradores.splice(index, 1);
    this.fechaUltimaModificacion = new FechaHora();
    this.version++;

    this.lanzarEvento(new SubAdministradorRemovido(
      this.id,
      new UsuarioId(usuarioId),
      this.fechaUltimaModificacion
    ));
  }

  // ========== BUSINESS METHODS - TOURNAMENT LIFECYCLE ==========

  /**
   * Abre el torneo para registro de participantes
   * 
   * Pre-condiciones:
   * - Estado actual debe ser BORRADOR
   * - Debe tener configuración mínima completa
   */
  abrirParaRegistro() {
    if (this.estado !== EstadoTorneo.BORRADOR) {
      throw new ErrorDominio(`No se puede abrir para registro desde estado ${this.estado}`);
    }

    // Validar configuración mínima
    this._validarConfiguracionMinima();

    this.estado = EstadoTorneo.ABIERTO_REGISTRO;
    this.fechaUltimaModificacion = new FechaHora();
    this.version++;

    this.lanzarEvento(new TorneoAbiertoParaRegistro(
      this.id,
      this.fechaUltimaModificacion
    ));
  }

  /**
   * Cierra el registro de participantes
   */
  cerrarRegistro() {
    if (this.estado !== EstadoTorneo.ABIERTO_REGISTRO) {
      throw new ErrorDominio('Solo se puede cerrar registro si está abierto');
    }

    this.estado = EstadoTorneo.REGISTRO_CERRADO;
    this.fechaUltimaModificacion = new FechaHora();
    this.version++;

    this.lanzarEvento(new RegistroTorneoCerrado(
      this.id,
      this.participantes.contar(),
      this.fechaUltimaModificacion
    ));
  }

  /**
   * Inicia el torneo (competencia activa)
   * 
   * Pre-condiciones:
   * - Mínimo 2 participantes confirmados
   * - Estado REGISTRO_CERRADO o ABIERTO_REGISTRO
   * - Configuración completa validada
   */
  iniciarTorneo() {
    // Validaciones críticas
    this._validarMinimoParticipantes();
    this._validarEstadoParaInicio();
    this._validarConfiguracionCompleta();

    // State transition
    this.estado = EstadoTorneo.EN_PROGRESO;
    this.fechaInicio = new FechaHora();
    this.fechaUltimaModificacion = this.fechaInicio;
    this.version++;

    // Domain event with rich information
    this.lanzarEvento(new TorneoIniciado(
      this.id,
      this.participantes.contar(),
      this.categoria.id,
      this.tipoJuego.id,
      this.fechaInicio
    ));
  }

  /**
   * Finaliza el torneo
   * 
   * @param {UsuarioId} ganadorId - ID del participante ganador
   * @param {Array<ResultadoFinal>} rankingFinal - Ranking completo
   */
  finalizarTorneo(ganadorId, rankingFinal = []) {
    if (this.estado !== EstadoTorneo.EN_PROGRESO) {
      throw new ErrorDominio('Solo se puede finalizar un torneo en progreso');
    }

    // Validar que el ganador sea un participante válido
    if (ganadorId && !this.participantes.tieneUsuario(ganadorId)) {
      throw new ErrorDominio('El ganador debe ser un participante del torneo');
    }

    this.estado = EstadoTorneo.FINALIZADO;
    this.ganadorId = ganadorId;
    this.rankingFinal = rankingFinal;
    this.fechaFinalizacion = new FechaHora();
    this.fechaUltimaModificacion = this.fechaFinalizacion;
    this.version++;

    this.lanzarEvento(new TorneoFinalizado(
      this.id,
      ganadorId,
      rankingFinal,
      this.calcularDuracion(),
      this.fechaFinalizacion
    ));
  }

  /**
   * Cancela el torneo (puede ocurrir en cualquier estado pre-finalización)
   */
  cancelarTorneo(razon) {
    if (this.estado === EstadoTorneo.FINALIZADO) {
      throw new ErrorDominio('No se puede cancelar un torneo ya finalizado');
    }

    const estadoAnterior = this.estado;
    this.estado = EstadoTorneo.CANCELADO;
    this.razonCancelacion = razon;
    this.fechaCancelacion = new FechaHora();
    this.fechaUltimaModificacion = this.fechaCancelacion;
    this.version++;

    this.lanzarEvento(new TorneoCancelado(
      this.id,
      razon,
      estadoAnterior,
      this.participantes.contar(),
      this.fechaCancelacion
    ));
  }

  // ========== BUSINESS METHODS - CONFIGURATION ==========

  /**
   * Actualiza el límite de participantes
   * 
   * Reglas:
   * - No puede ser menor que la cantidad actual de participantes
   * - Debe ser compatible con el tipo de juego
   */
  actualizarLimiteParticipantes(nuevoLimite) {
    const participantesActuales = this.participantes.contar();
    
    if (nuevoLimite < participantesActuales) {
      throw new ErrorDominio(
        `El nuevo límite (${nuevoLimite}) no puede ser menor que los participantes actuales (${participantesActuales})`
      );
    }

    // Validar compatibilidad con tipo de juego
    if (this.tipoJuego.cantidadJugadores.valor > nuevoLimite) {
      throw new ErrorDominio(
        `El límite debe ser al menos ${this.tipoJuego.cantidadJugadores.valor} para el tipo de juego ${this.tipoJuego.nombreCompleto}`
      );
    }

    const limiteAnterior = this.limiteParticipantes.valor;
    this.limiteParticipantes = new LimiteParticipantes(nuevoLimite);
    this.fechaUltimaModificacion = new FechaHora();
    this.version++;

    this.lanzarEvento(new LimiteParticipantesActualizado(
      this.id,
      limiteAnterior,
      nuevoLimite,
      this.fechaUltimaModificacion
    ));
  }

  /**
   * Crea una nueva etapa de venta
   */
  crearEtapaVenta(nombre, fechaInicio, fechaFin, precio) {
    // Validar que las fechas no se solapen con etapas existentes
    this._validarFechasEtapaVenta(fechaInicio, fechaFin);

    const etapa = new EtapaVenta(
      new EtapaVentaId(this._generarIdEtapa()),
      this.id,
      nombre,
      fechaInicio,
      fechaFin,
      precio
    );

    this.etapasVenta.push(etapa);
    this.fechaUltimaModificacion = new FechaHora();
    this.version++;

    this.lanzarEvento(new EtapaVentaCreada(
      this.id,
      etapa.id,
      nombre,
      fechaInicio,
      fechaFin,
      precio
    ));
  }

  // ========== QUERY METHODS ==========

  /**
   * Verifica si el torneo puede aceptar más participantes
   */
  puedeAceptarParticipantes() {
    return this.estado === EstadoTorneo.ABIERTO_REGISTRO &&
           this.participantes.contar() < this.limiteParticipantes.valor;
  }

  /**
   * Verifica si un usuario específico


/**
   * Verifica si un usuario específico puede registrarse
   */
  puedeUsuarioRegistrarse(usuarioId) {
    if (!this.puedeAceptarParticipantes()) {
      return { puede: false, razon: 'Torneo no acepta nuevos participantes' };
    }

    if (this.participantes.tieneUsuario(new UsuarioId(usuarioId))) {
      return { puede: false, razon: 'Usuario ya registrado en este torneo' };
    }

    return { puede: true, razon: null };
  }

  /**
   * Obtiene estadísticas actuales del torneo
   */
  obtenerEstadisticas() {
    return {
      participantesRegistrados: this.participantes.contar(),
      limiteParticipantes: this.limiteParticipantes.valor,
      porcentajeOcupacion: (this.participantes.contar() / this.limiteParticipantes.valor) * 100,
      diasDesdeCreacion: this.fechaCreacion.diasHasta(new FechaHora()),
      estado: this.estado,
      tieneSubAdministradores: this.subAdministradores.length > 0
    };
  }

  /**
   * Calcula la duración del torneo si está finalizado
   */
  calcularDuracion() {
    if (!this.fechaInicio || !this.fechaFinalizacion) {
      return null;
    }
    
    return this.fechaInicio.diferenciaEn(this.fechaFinalizacion, 'minutos');
  }

  // ========== PRIVATE VALIDATION METHODS ==========

  _validarParametrosConstructor(id, nombre, categoria, tipoJuego, organizadorId) {
    if (!id) throw new ErrorDominio('ID del torneo es requerido');
    if (!nombre) throw new ErrorDominio('Nombre del torneo es requerido');
    if (!categoria) throw new ErrorDominio('Categoría del torneo es requerida');
    if (!tipoJuego) throw new ErrorDominio('Tipo de juego es requerido');
    if (!organizadorId) throw new ErrorDominio('Organizador es requerido');
    
    // Validar que la categoría esté activa
    if (!categoria.estaActiva) {
      throw new ErrorDominio('No se puede crear torneo con categoría inactiva');
    }
  }

  _validarEstadoParaRegistro() {
    if (this.estado !== EstadoTorneo.ABIERTO_REGISTRO) {
      throw new ErrorDominio(`No se pueden agregar participantes en estado ${this.estado}`);
    }
  }

  _validarCapacidadDisponible() {
    if (this.participantes.contar() >= this.limiteParticipantes.valor) {
      throw new ErrorDominio('El torneo ha alcanzado su límite de participantes');
    }
  }

  _validarParticipanteNoExiste(usuarioId) {
    if (this.participantes.tieneUsuario(usuarioId)) {
      throw new ErrorDominio('El usuario ya está registrado en este torneo');
    }
  }

  _validarMinimoParticipantes() {
    const minimo = Math.max(2, this.tipoJuego.cantidadJugadores.valor);
    if (this.participantes.contar() < minimo) {
      throw new ErrorDominio(`Se requieren mínimo ${minimo} participantes para iniciar el torneo`);
    }
  }

  _validarEstadoParaInicio() {
    const estadosValidos = [EstadoTorneo.REGISTRO_CERRADO, EstadoTorneo.ABIERTO_REGISTRO];
    if (!estadosValidos.includes(this.estado)) {
      throw new ErrorDominio(`No se puede iniciar torneo desde estado ${this.estado}`);
    }
  }

  _validarConfiguracionMinima() {
    if (this.limiteParticipantes.valor <= 0) {
      throw new ErrorDominio('Debe definir un límite de participantes mayor a 0');
    }

    if (!this.categoria || !this.tipoJuego) {
      throw new ErrorDominio('Debe tener categoría y tipo de juego definidos');
    }
  }

  _validarConfiguracionCompleta() {
    this._validarConfiguracionMinima();
    
    // Validaciones adicionales para inicio
    if (this.tipoJuego.cantidadJugadores.valor > this.limiteParticipantes.valor) {
      throw new ErrorDominio('El tipo de juego requiere más jugadores que el límite configurado');
    }
  }

  _validarFechasEtapaVenta(fechaInicio, fechaFin) {
    // Validar que fechaInicio < fechaFin
    if (!fechaInicio.esAnteriorA(fechaFin)) {
      throw new ErrorDominio('La fecha de inicio debe ser anterior a la fecha de fin');
    }

    // Validar que no se solape con etapas existentes
    for (const etapa of this.etapasVenta) {
      const hayOverlap = 
        fechaInicio.estaEntre(etapa.fechaInicio, etapa.fechaFin) ||
        fechaFin.estaEntre(etapa.fechaInicio, etapa.fechaFin) ||
        (fechaInicio.esAnteriorA(etapa.fechaInicio) && fechaFin.esPosteriorA(etapa.fechaFin));

      if (hayOverlap) {
        throw new ErrorDominio(`Las fechas se solapan con la etapa existente: ${etapa.nombre}`);
      }
    }
  }

  _validarInvariantesPost() {
    // Validar que invariantes del agregado se mantienen
    if (this.participantes.contar() > this.limiteParticipantes.valor) {
      throw new ErrorDominio('INVARIANTE VIOLADA: Participantes exceden límite');
    }

    if (this.subAdministradores.length > 2) {
      throw new ErrorDominio('INVARIANTE VIOLADA: Más de 2 subadministradores');
    }
  }

  _generarIdEtapa() {
    return `etapa_${this.id.valor}_${this.etapasVenta.length + 1}`;
  }

  // ========== EVENT HANDLING ==========

  lanzarEvento(evento) {
    evento.torneoVersion = this.version;
    evento.aggregateId = this.id.valor;
    this.eventosDelDominio.push(evento);
  }

  marcarEventosComoPublicados() {
    this.eventosDelDominio = [];
  }

  obtenerEventosNoPublicados() {
    return [...this.eventosDelDominio];
  }
}
```

---

## **🔧 VALUE OBJECTS ESPECIALIZADOS**

### **TorneoId - Identificador Único**
```javascript
/**
 * Value Object que representa la identidad de un torneo
 * 
 * Características:
 * - Inmutable
 * - Validación de formato
 * - Comparison por valor
 */
class TorneoId {
  constructor(valor) {
    this._validar(valor);
    this._valor = valor;
    Object.freeze(this);
  }

  get valor() {
    return this._valor;
  }

  equals(otro) {
    return otro instanceof TorneoId && this._valor === otro._valor;
  }

  toString() {
    return this._valor;
  }

  _validar(valor) {
    if (!valor) {
      throw new Error('TorneoId no puede ser nulo o vacío');
    }

    if (typeof valor !== 'string') {
      throw new Error('TorneoId debe ser un string');
    }

    // Validar formato UUID v4
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(valor)) {
      throw new Error('TorneoId debe ser un UUID v4 válido');
    }
  }
}
```

### **NombreTorneo - Nombre con Validaciones de Negocio**
```javascript
/**
 * Value Object que encapsula las reglas de negocio para nombres de torneo
 */
class NombreTorneo {
  constructor(valor) {
    this._validar(valor);
    this._valor = valor.trim();
    Object.freeze(this);
  }

  get valor() {
    return this._valor;
  }

  equals(otro) {
    return otro instanceof NombreTorneo && this._valor === otro._valor;
  }

  contieneTermino(termino) {
    return this._valor.toLowerCase().includes(termino.toLowerCase());
  }

  _validar(valor) {
    if (!valor || typeof valor !== 'string') {
      throw new Error('Nombre del torneo es requerido');
    }

    const nombreLimpio = valor.trim();

    if (nombreLimpio.length < 3) {
      throw new Error('El nombre del torneo debe tener al menos 3 caracteres');
    }

    if (nombreLimpio.length > 100) {
      throw new Error('El nombre del torneo no puede exceder 100 caracteres');
    }

    // Validar caracteres permitidos (letras, números, espacios, algunos símbolos)
    const caracteresPermitidos = /^[a-zA-ZñÑáéíóúÁÉÍÓÚ0-9\s\-_.,!()]+$/;
    if (!caracteresPermitidos.test(nombreLimpio)) {
      throw new Error('El nombre contiene caracteres no permitidos');
    }

    // Validar que no contenga solo espacios o caracteres especiales
    if (!/[a-zA-ZñÑ0-9]/.test(nombreLimpio)) {
      throw new Error('El nombre debe contener al menos una letra o número');
    }

    // Lista de palabras prohibidas (contenido inapropiado)
    const palabrasProhibidas = ['spam', 'test123', 'ejemplo'];
    const nombreLower = nombreLimpio.toLowerCase();
    for (const prohibida of palabrasProhibidas) {
      if (nombreLower.includes(prohibida)) {
        throw new Error('El nombre contiene contenido no permitido');
      }
    }
  }
}
```

### **LimiteParticipantes - Límite con Reglas de Negocio**
```javascript
/**
 * Value Object que maneja límites de participantes con validaciones específicas
 */
class LimiteParticipantes {
  constructor(valor) {
    this._validar(valor);
    this._valor = parseInt(valor, 10);
    Object.freeze(this);
  }

  get valor() {
    return this._valor;
  }

  equals(otro) {
    return otro instanceof LimiteParticipantes && this._valor === otro._valor;
  }

  seAlcanzo(cantidadActual) {
    return cantidadActual >= this._valor;
  }

  cuposRestantes(cantidadActual) {
    return Math.max(0, this._valor - cantidadActual);
  }

  porcentajeOcupacion(cantidadActual) {
    if (this._valor === 0) return 0;
    return Math.min(100, (cantidadActual / this._valor) * 100);
  }

  puedeAceptar(cantidadAdicional, cantidadActual) {
    return (cantidadActual + cantidadAdicional) <= this._valor;
  }

  _validar(valor) {
    const numero = parseInt(valor, 10);

    if (isNaN(numero)) {
      throw new Error('Límite de participantes debe ser un número');
    }

    if (numero < 0) {
      throw new Error('Límite de participantes no puede ser negativo');
    }

    if (numero > 10000) {
      throw new Error('Límite máximo de 10,000 participantes por torneo');
    }

    // Límites específicos según tipo de torneo (podrían ser configurables)
    if (numero > 0 && numero < 2) {
      throw new Error('Si se define límite, debe ser de al menos 2 participantes');
    }
  }
}
```

### **FechaHora - Manejo Temporal Especializado**
```javascript
/**
 * Value Object para manejo consistente de fechas y tiempos
 */
class FechaHora {
  constructor(valor = new Date()) {
    this._fecha = new Date(valor);
    this._validar();
    Object.freeze(this);
  }

  get valor() {
    return new Date(this._fecha);
  }

  equals(otra) {
    return otra instanceof FechaHora && this._fecha.getTime() === otra._fecha.getTime();
  }

  esPosteriorA(otra) {
    return this._fecha > otra._fecha;
  }

  esAnteriorA(otra) {
    return this._fecha < otra._fecha;
  }

  estaEntre(fechaInicio, fechaFin) {
    return this._fecha >= fechaInicio._fecha && this._fecha <= fechaFin._fecha;
  }

  diferenciaEn(otra, unidad = 'minutos') {
    const diferenciaMilisegundos = Math.abs(this._fecha.getTime() - otra._fecha.getTime());
    
    switch (unidad) {
      case 'segundos':
        return Math.floor(diferenciaMilisegundos / 1000);
      case 'minutos':
        return Math.floor(diferenciaMilisegundos / (1000 * 60));
      case 'horas':
        return Math.floor(diferenciaMilisegundos / (1000 * 60 * 60));
      case 'dias':
        return Math.floor(diferenciaMilisegundos / (1000 * 60 * 60 * 24));
      default:
        throw new Error(`Unidad no soportada: ${unidad}`);
    }
  }

  diasHasta(otra) {
    return this.diferenciaEn(otra, 'dias');
  }

  agregar(cantidad, unidad) {
    const nuevaFecha = new Date(this._fecha);
    
    switch (unidad) {
      case 'minutos':
        nuevaFecha.setMinutes(nuevaFecha.getMinutes() + cantidad);
        break;
      case 'horas':
        nuevaFecha.setHours(nuevaFecha.getHours() + cantidad);
        break;
      case 'dias':
        nuevaFecha.setDate(nuevaFecha.getDate() + cantidad);
        break;
      default:
        throw new Error(`Unidad no soportada: ${unidad}`);
    }
    
    return new FechaHora(nuevaFecha);
  }

  restar(cantidad, unidad) {
    return this.agregar(-cantidad, unidad);
  }

  formatoISO() {
    return this._fecha.toISOString();
  }

  formatoLocal() {
    return this._fecha.toLocaleString();
  }

  _validar() {
    if (isNaN(this._fecha.getTime())) {
      throw new Error('Fecha inválida');
    }

    // Validar rango razonable (no muy en el pasado, no muy en el futuro)
    const ahora = new Date();
    const hace100Años = new Date(ahora.getFullYear() - 100, 0, 1);
    const en100Años = new Date(ahora.getFullYear() + 100, 0, 1);

    if (this._fecha < hace100Años || this._fecha > en100Años) {
      throw new Error('Fecha fuera del rango válido (100 años hacia atrás/adelante)');
    }
  }
}
```

---

## **🏛️ ENTITIES ESPECIALIZADAS**

### **Participante - Entity con Comportamiento Rico**
```javascript
/**
 * Entity que representa un participante específico en un torneo
 * 
 * Características:
 * - Tiene identidad propia (ParticipanteId)
 * - Mantiene estado y comportamiento
 * - Relacionado con Usuario pero no lo contiene
 */
class Participante {
  constructor(id, usuarioId, fechaRegistro = new Date()) {
    this.id = new ParticipanteId(id);
    this.usuarioId = new UsuarioId(usuarioId);
    this.fechaRegistro = new FechaHora(fechaRegistro);
    this.estado = EstadoParticipante.REGISTRADO;
    this.fechaConfirmacion = null;
    this.fechaCancelacion = null;
    this.razonCancelacion = null;
    this.notasInternas = '';
    this.puntuacionFinal = null;
    this.posicionFinal = null;
  }

  // ========== BUSINESS METHODS ==========

  confirmarParticipacion() {
    if (this.estado !== EstadoParticipante.REGISTRADO) {
      throw new ErrorDominio(`No se puede confirmar participante en estado ${this.estado}`);
    }

    this.estado = EstadoParticipante.CONFIRMADO;
    this.fechaConfirmacion = new FechaHora();
  }

  cancelarParticipacion(razon = 'Cancelación voluntaria') {
    if (this.estado === EstadoParticipante.DESCALIFICADO) {
      throw new ErrorDominio('No se puede cancelar un participante descalificado');
    }

    this.estado = EstadoParticipante.CANCELADO;
    this.fechaCancelacion = new FechaHora();
    this.razonCancelacion = razon;
  }

  descalificar(razon) {
    if (this.estado === EstadoParticipante.CANCELADO) {
      throw new ErrorDominio('No se puede descalificar un participante ya cancelado');
    }

    this.estado = EstadoParticipante.DESCALIFICADO;
    this.fechaCancelacion = new FechaHora();
    this.razonCancelacion = razon;
  }

  asignarResultadoFinal(puntuacion, posicion) {
    if (this.estado !== EstadoParticipante.CONFIRMADO) {
      throw new ErrorDominio('Solo se pueden asignar resultados a participantes confirmados');
    }

    this.puntuacionFinal = puntuacion;
    this.posicionFinal = posicion;
  }

  // ========== QUERY METHODS ==========

  estaActivo() {
    return [EstadoParticipante.REGISTRADO, EstadoParticipante.CONFIRMADO].includes(this.estado);
  }

  puedeParticipar() {
    return this.estado === EstadoParticipante.CONFIRMADO;
  }

  tiempoDesdeRegistro() {
    return this.fechaRegistro.diferenciaEn(new FechaHora(), 'horas');
  }

  obtenerResumen() {
    return {
      id: this.id.valor,
      usuarioId: this.usuarioId.valor,
      estado: this.estado,
      fechaRegistro: this.fechaRegistro.formatoISO(),
      tiempoRegistrado: this.tiempoDesdeRegistro(),
      estaConfirmado: this.estado === EstadoParticipante.CONFIRMADO,
      tieneResultado: this.puntuacionFinal !== null
    };
  }
}
```

### **Categoria - Entity Compartida**
```javascript
/**
 * Entity que representa una categoría de torneo
 * 
 * Nota: Esta entity es compartida entre múltiples torneos
 * y podría ser manejada en un contexto separado en el futuro
 */
class Categoria {
  constructor(id, descripcion, alias) {
    this.id = new CategoriaId(id);
    this.descripcion = descripcion;
    this.alias = alias;
    this.estaActiva = true;
    this.fechaCreacion = new FechaHora();
    this.configuracionComisiones = {
      porcentajeBase: 5.0,
      porcentajePremium: 8.0
    };
    this.restriccionesTipoJuego = [];
  }

  // ========== BUSINESS METHODS ==========

  activar() {
    if (this.estaActiva) {
      return; // Ya está activa, no hacer nada
    }

    this.estaActiva = true;
  }

  desactivar() {
    if (!this.estaActiva) {
      return; // Ya está inactiva
    }

    // Note: En una implementación real, verificaríamos que no hay torneos activos
    // usando esta categoría antes de permitir desactivación
    this.estaActiva = false;
  }

  actualizarComisiones(porcentajeBase, porcentajePremium = null) {
    if (porcentajeBase < 0 || porcentajeBase > 20) {
      throw new ErrorDominio('Porcentaje de comisión debe estar entre 0% y 20%');
    }

    this.configuracionComisiones.porcentajeBase = porcentajeBase;
    if (porcentajePremium !== null) {
      this.configuracionComisiones.porcentajePremium = porcentajePremium;
    }
  }

  // ========== QUERY METHODS ==========

  puedeUsarseEnTorneo() {
    return this.estaActiva;
  }

  obtenerComisionPara(tipoTorneo = 'base') {
    return tipoTorneo === 'premium' 
      ? this.configuracionComisiones.porcentajePremium
      : this.configuracionComisiones.porcentajeBase;
  }
}
```

---

## **🎯 DOMAIN SERVICES ESPECIALIZADOS**

### **ServicioValidacionTorneo - Validaciones Cross-Aggregate**
```javascript
/**
 * Domain Service que maneja validaciones complejas que involucran
 * múltiples aggregates o conceptos externos al torneo
 */
class ServicioValidacionTorneo {
  
  /**
   * Valida que un torneo puede ser creado con la configuración dada
   */
  static validarCreacionTorneo(torneo, categoria, tipoJuego) {
    // Validar categoría activa
    if (!categoria.estaActiva) {
      throw new ErrorDominio('No se puede crear torneo con categoría inactiva');
    }

    // Validar compatibilidad tipo de juego con límite
    if (tipoJuego.cantidadJugadores.valor > torneo.limiteParticipantes.valor && 
        torneo.limiteParticipantes.valor > 0) {
      throw new ErrorDominio(
        `El juego ${tipoJuego.nombreCompleto} requiere ${tipoJuego.cantidadJugadores.valor} jugadores, ` +
        `pero el límite del torneo es ${torneo.limiteParticipantes.valor}`
      );
    }

    // Validar que no exista otro torneo con mismo nombre del mismo organizador
    // (Esta validación requeriría acceso al repositorio, por eso está en el service)
    
    return true;
  }

  /**
   * Determina si un torneo puede iniciarse
   */
  static puedeIniciarTorneo(torneo) {
    // Validaciones de estado
    if (![EstadoTorneo.ABIERTO_REGISTRO, EstadoTorneo.REGISTRO_CERRADO].includes(torneo.estado)) {
      return { puede: false, razon: `Estado ${torneo.estado} no permite inicio` };
    }

    // Validar participantes mínimos
    const participantesMinimos = Math.max(2, torneo.tipoJuego.cantidadJugadores.valor);
    if (torneo.participantes.contar() < participantesMinimos) {
      return { 
        puede: false, 
        razon: `Se requieren al menos ${participantesMinimos} participantes (actual: ${torneo.participantes.contar()})` 
      };
    }

    // Validar que no haya conflictos de horario (requeriría consulta externa)
    // Esta validación se implementaría consultando otros torneos del organizador

    return { puede: true, razon: null };
  }

  /**
   * Valida límites según tipo de torneo (gratuito vs pago)
   */
  static validarLimiteParticipantes(torneo, tipoTorneo) {
    if (tipoTorneo === 'gratuito' && torneo.limiteParticipantes.valor > 50) {
      throw new ErrorDominio('Torneos gratuitos están limitados a máximo 50 participantes');
    }

    if (tipoTorneo === 'pago' && torneo.limiteParticipantes.valor > 1000) {
      throw new ErrorDominio('Límite máximo de participantes es 1,000');
    }

    return true;
  }

  /**
   * Calcula el costo estimado de infraestructura para un torneo
   */
  static calcularCostoInfraestructura(torneo) {
    const costoBasePorParticipante = 0.10; // USD
    const multiplicadorCategoria = torneo.categoria.obtenerComisionPara('base') / 5.0;
    
    const participantesEsperados = torneo.limiteParticipantes.valor || 10;
    const costoBase = participantesEsperados * costoBasePorParticipante;
    const costoFinal = costoBase * multiplicadorCategoria;

    return {
      participantesEsperados,
      costoBasePorParticipante,
      multiplicadorCategoria,
      costoTotalEstimado: Math.round(costoFinal * 100) / 100
    };
  }
}
```

### **ServicioRegistroParticipante - Lógica de Registro Especializada**
```javascript
/**
 * Domain Service para manejar la lógica compleja de registro de participantes
 */
class ServicioRegistroParticipante {
  
  /**
   * Valida si un usuario puede registrarse en un torneo específico
   * 
   * @param {UsuarioId} usuarioId - ID del usuario
   * @param {Torneo} torneo - Torneo donde se quiere registrar
   * @param {IRepositorioTorneo} repositorioTorneo - Para consultas adicionales
   */
  static async puedeUsuarioRegistrarse(usuarioId, torneo, repositorioTorneo = null) {
    // Validaciones básicas del torneo
    const validacionTorneo = torneo.puedeUsuarioRegistrarse(usuarioId.valor);
    if (!validacionTorneo.puede) {
      return validacionTorneo;
    }

    // Validar límites globales del usuario (si se proporciona repositorio)
    if (repositorioTorneo) {
      const torneosActivosUsuario = await repositorioTorneo.contarTorneosActivosPorUsuario(usuarioId);
      if (torneosActivosUsuario >= 10) {
        return { 
          puede: false, 
          razon: 'Usuario ha alcanzado el límite máximo de 10 torneos activos simultáneos' 
        };
      }

      // Validar conflictos de horario
      const hayConflictoHorario = await this._validarConflictoHorarios(usuarioId, torneo, repositorioTorneo);
      if (hayConflictoHorario) {
        return { 
          puede: false, 
          razon: 'Usuario tiene otro torneo en horario conflictivo' 
        };
      }
    }

    return { puede: true, razon: null };
  }

  /**
   * Valida si el período de registro está activo
   */
  static validarPeriodoRegistro(torneo) {
    // Si no hay etapas de venta definidas, el registro está abierto
    if (torneo.etapasVenta.length === 0) {
      return torneo.estado === EstadoTorneo.ABIERTO_REGISTRO;
    }

    // Si hay etapas, verificar que al menos una esté activa
    const ahora = new FechaHora();
    const etapaActiva = torneo.etapasVenta.find(etapa => 
      ahora.estaEntre(etapa.fechaInicio, etapa.fechaFin)
    );

    return etapaActiva !== undefined && torneo.estado === EstadoTorneo.ABIERTO_REGISTRO;
  }

  /**
   * Determina la etapa de venta actual y su precio
   */
  static obtenerEtapaVentaActual(torneo) {
    if (torneo.etapasVenta.length === 0) {
      return { etapa: null, precio: 0, esGratuito: true };
    }

    const ahora = new FechaHora();
    const etapaActiva = torneo.etapasVenta.find(etapa => 
      ahora.estaEntre(etapa.fechaInicio, etapa.fechaFin)
    );

    if (!etapaActiva) {
      return { etapa: null, precio: null, registroCerrado: true };
    }

    return { 
      etapa: etapaActiva, 
      precio: etapaActiva.precio.cantidad,
      moneda: etapaActiva.precio.moneda,
      esGratuito: etapaActiva.precio.cantidad === 0
    };
  }

  /**
   * Calcula estadísticas de registro
   */
  static calcularEstadisticasRegistro(torneo) {
    const participantesRegistrados = torneo.participantes.contar();
    const participantesConfirmados = torneo.participantes.contarPorEstado(EstadoParticipante.CONFIRMADO);
    const participantesCancelados = torneo.participantes.contarPorEstado(EstadoParticipante.CANCELADO);

    return {
      totalRegistrados: participantesRegistrados,
      confirmados: participantesConfirmados,
      cancelados: participantesCancelados,
      tasaConfirmacion: participantesRegistrados > 0 
        ? (participantesConfirmados / participantesRegistrados) * 100 
        : 0,
      cuposDisponibles: torneo.limiteParticipantes.valor - participantesRegistrados,
      porcentajeO# DOCUMENTACIÓN TÉCNICA - CONTEXTO GESTIÓN DE TORNEOS
## Especificación Completa del Domain Model - Arquitectura DDD Nivel L3

---

## **🎯 VISIÓN GENERAL DEL CONTEXTO**

### **Responsabilidad Principal:**
El contexto Gestión de Torneos es el **corazón del negocio** de la plataforma de e-sports. Su responsabilidad es gestionar el ciclo de vida completo de un torneo, desde su concepción hasta su finalización, manteniendo la integridad y consistencia de todas las reglas de negocio relacionadas con competencias de videojuegos.

### **Bounded Context Scope:**
- ✅ **Incluye:** Creación, configuración, gestión de participantes, estados de torneo, reglas de competencia
- ❌ **Excluye:** Procesamiento de pagos, streaming, notificaciones, métricas detalladas
- 🔗 **Colabora con:** Ticketing (para acceso pagado), Usuarios (validación), Streaming (datos evento)

### **Business Value:**
- **Automatización** de procesos manuales de organización
- **Escalabilidad** para soportar miles de torneos simultáneos
- **Consistencia** en aplicación de reglas de negocio
- **Trazabilidad** completa de actividades del torneo

---

## **🏗️ ARQUITECTURA DEL AGREGADO**

### **📊 Diseño del Aggregate Root - Torneo**

```javascript
/**
 * AGGREGATE ROOT: Torneo
 * 
 * Responsabilidad: Mantener consistencia de todas las reglas de negocio
 * relacionadas con un torneo específico de e-sports.
 * 
 * Invariantes principales:
 * - Un torneo siempre tiene exactamente un organizador
 * - Máximo 2 subadministradores por torneo
 * - El límite de participantes no puede ser menor que los ya registrados
 * - Los estados siguen una progresión válida
 */
class Torneo {
  constructor(id, nombre, categoria, tipoJuego, organizadorId) {
    // Validaciones de construcción
    this._validarParametrosConstructor(id, nombre, categoria, tipoJuego, organizadorId);
    
    // Value Objects para identidad e invariantes
    this.id = new TorneoId(id);
    this.nombre = new NombreTorneo(nombre);
    this.categoria = categoria; // Entity reference - validated externally
    this.tipoJuego = tipoJuego; // Entity reference - validated externally
    this.organizadorId = new UsuarioId(organizadorId);
    
    // Collections y estado interno
    this.participantes = new ColeccionParticipantes();
    this.subAdministradores = [];
    this.estado = EstadoTorneo.BORRADOR;
    this.limiteParticipantes = new LimiteParticipantes(0);
    this.etapasVenta = [];
    
    // Metadata y auditoría
    this.fechaCreacion = new FechaHora();
    this.fechaUltimaModificacion = new FechaHora();
    this.version = 1;
    
    // Domain Events queue
    this.eventosDelDominio = [];
    
    // Auto-raise creation event
    this.lanzarEvento(new TorneoCreado(
      this.id, 
      this.organizadorId, 
      this.categoria.id, 
      this.tipoJuego.id,
      this.fechaCreacion
    ));
  }

  // ========== BUSINESS METHODS - PARTICIPANT MANAGEMENT ==========
  
  /**
   * Agrega un participante al torneo
   * 
   * Pre-condiciones:
   * - Torneo debe estar en estado ABIERTO_REGISTRO
   * - No debe exceder el límite de participantes
   * - Usuario no debe estar ya registrado
   * 
   * Post-condiciones:
   * - Participante agregado a la colección
   * - Evento ParticipanteRegistrado disparado
   * - Version del agregado incrementada
   */
  agregarParticipante(participante) {
    // Validaciones de pre-condición
    this._validarEstadoParaRegistro();
    this._validarCapacidadDisponible();
    this._validarParticipanteNoExiste(participante.usuarioId);
    
    // Business logic execution
    this.participantes.agregar(participante);
    this.fechaUltimaModificacion = new FechaHora();
    this.version++;
    
    // Domain event
    this.lanzarEvento(new ParticipanteRegistrado(
      this.id,
      participante.id,
      participante.usuarioId,
      this.fechaUltimaModificacion
    ));
    
    // Post-condition validation
    this._validarInvariantesPost();
  }

  /**
   * Remueve un participante del torneo
   * 
   * Casos de uso:
   * - Cancelación voluntaria del participante
   * - Descalificación por parte del organizador
   * - Cancelación administrativa
   */
  removerParticipante(participanteId, razon = 'CANCELACION_VOLUNTARIA') {
    const participante = this.participantes.buscarPorId(participanteId);
    if (!participante) {
      throw new ErrorDominio(`Participante ${participanteId} no encontrado en torneo ${this.id.valor}`);
    }

    // Validar que el torneo no esté en progreso
    if (this.estado === EstadoTorneo.EN_PROGRESO) {
      throw new ErrorDominio('No se puede remover participantes durante torneo en progreso');
    }

    this.participantes.remover(participanteId);
    this.fechaUltimaModificacion = new FechaHora();
    this.version++;

    // Event específico según la razón
    const evento = razon === 'DESCALIFICACION' 
      ? new ParticipanteDescalificado(this.id, participanteId, razon)
      : new ParticipanteCancelado(this.id, participanteId, razon);
    
    this.lanzarEvento(evento);
  }

  // ========== BUSINESS METHODS - ADMINISTRATION ==========

  /**
   * Agrega un subadministrador al torneo
   * 
   * Reglas de negocio:
   * - Máximo 2 subadministradores por torneo
   * - Subadministrador no puede ser el organizador principal
   * - Solo el organizador puede agregar subadministradores
   */
  agregarSubAdministrador(usuarioId) {
    // Validaciones de negocio
    if (this.subAdministradores.length >= 2) {
      throw new ErrorDominio('Máximo 2 subadministradores permitidos por torneo');
    }

    if (this.organizadorId.equals(new UsuarioId(usuarioId))) {
      throw new ErrorDominio('El organizador no puede ser su propio subadministrador');
    }

    // Validar duplicados
    const yaExiste = this.subAdministradores.some(subAdmin => 
      subAdmin.equals(new UsuarioId(usuarioId))
    );
    
    if (yaExiste) {
      throw new ErrorDominio('El usuario ya es subadministrador de este torneo');
    }

    // Operación exitosa
    this.subAdministradores.push(new UsuarioId(usuarioId));
    this.fechaUltimaModificacion = new FechaHora();
    this.version++;

    this.lanzarEvento(new SubAdministradorAgregado(
      this.id, 
      new UsuarioId(usuarioId),
      this.fechaUltimaModificacion
    ));
  }

  /**
   * Remueve un subadministrador
   */
  removerSubAdministrador(usuarioId) {
    const index = this.subAdministradores.findIndex(subAdmin => 
      subAdmin.equals(new UsuarioId(usuarioId))
    );

    if (index === -1) {
      throw new ErrorDominio('Usuario no es subadministrador de este torneo');
    }

    this.subAdministradores.splice(index, 1);
    this.fechaUltimaModificacion = new FechaHora();
    this.version++;

    this.lanzarEvento(new SubAdministradorRemovido(
      this.id,
      new UsuarioId(usuarioId),
      this.fechaUltimaModificacion
    ));
  }

  // ========== BUSINESS METHODS - TOURNAMENT LIFECYCLE ==========

  /**
   * Abre el torneo para registro de participantes
   * 
   * Pre-condiciones:
   * - Estado actual debe ser BORRADOR
   * - Debe tener configuración mínima completa
   */
  abrirParaRegistro() {
    if (this.estado !== EstadoTorneo.BORRADOR) {
      throw new ErrorDominio(`No se puede abrir para registro desde estado ${this.estado}`);
    }

    // Validar configuración mínima
    this._validarConfiguracionMinima();

    this.estado = EstadoTorneo.ABIERTO_REGISTRO;
    this.fechaUltimaModificacion = new FechaHora();
    this.version++;

    this.lanzarEvento(new TorneoAbiertoParaRegistro(
      this.id,
      this.fechaUltimaModificacion
    ));
  }

  /**
   * Cierra el registro de participantes
   */
  cerrarRegistro() {
    if (this.estado !== EstadoTorneo.ABIERTO_REGISTRO) {
      throw new ErrorDominio('Solo se puede cerrar registro si está abierto');
    }

    this.estado = EstadoTorneo.REGISTRO_CERRADO;
    this.fechaUltimaModificacion = new FechaHora();
    this.version++;

    this.lanzarEvento(new RegistroTorneoCerrado(
      this.id,
      this.participantes.contar(),
      this.fechaUltimaModificacion
    ));
  }

  /**
   * Inicia el torneo (competencia activa)
   * 
   * Pre-condiciones:
   * - Mínimo 2 participantes confirmados
   * - Estado REGISTRO_CERRADO o ABIERTO_REGISTRO
   * - Configuración completa validada
   */
  iniciarTorneo() {
    // Validaciones críticas
    this._validarMinimoParticipantes();
    this._validarEstadoParaInicio();
    this._validarConfiguracionCompleta();

    // State transition
    this.estado = EstadoTorneo.EN_PROGRESO;
    this.fechaInicio = new FechaHora();
    this.fechaUltimaModificacion = this.fechaInicio;
    this.version++;

    // Domain event with rich information
    this.lanzarEvento(new TorneoIniciado(
      this.id,
      this.participantes.contar(),
      this.categoria.id,
      this.tipoJuego.id,
      this.fechaInicio
    ));
  }

  /**
   * Finaliza el torneo
   * 
   * @param {UsuarioId} ganadorId - ID del participante ganador
   * @param {Array<ResultadoFinal>} rankingFinal - Ranking completo
   */
  finalizarTorneo(ganadorId, rankingFinal = []) {
    if (this.estado !== EstadoTorneo.EN_PROGRESO) {
      throw new ErrorDominio('Solo se puede finalizar un torneo en progreso');
    }

    // Validar que el ganador sea un participante válido
    if (ganadorId && !this.participantes.tieneUsuario(ganadorId)) {
      throw new ErrorDominio('El ganador debe ser un participante del torneo');
    }

    this.estado = EstadoTorneo.FINALIZADO;
    this.ganadorId = ganadorId;
    this.rankingFinal = rankingFinal;
    this.fechaFinalizacion = new FechaHora();
    this.fechaUltimaModificacion = this.fechaFinalizacion;
    this.version++;

    this.lanzarEvento(new TorneoFinalizado(
      this.id,
      ganadorId,
      rankingFinal,
      this.calcularDuracion(),
      this.fechaFinalizacion
    ));
  }

  /**
   * Cancela el torneo (puede ocurrir en cualquier estado pre-finalización)
   */
  cancelarTorneo(razon) {
    if (this.estado === EstadoTorneo.FINALIZADO) {
      throw new ErrorDominio('No se puede cancelar un torneo ya finalizado');
    }

    const estadoAnterior = this.estado;
    this.estado = EstadoTorneo.CANCELADO;
    this.razonCancelacion = razon;
    this.fechaCancelacion = new FechaHora();
    this.fechaUltimaModificacion = this.fechaCancelacion;
    this.version++;

    this.lanzarEvento(new TorneoCancelado(
      this.id,
      razon,
      estadoAnterior,
      this.participantes.contar(),
      this.fechaCancelacion
    ));
  }

  // ========== BUSINESS METHODS - CONFIGURATION ==========

  /**
   * Actualiza el límite de participantes
   * 
   * Reglas:
   * - No puede ser menor que la cantidad actual de participantes
   * - Debe ser compatible con el tipo de juego
   */
  actualizarLimiteParticipantes(nuevoLimite) {
    const participantesActuales = this.participantes.contar();
    
    if (nuevoLimite < participantesActuales) {
      throw new ErrorDominio(
        `El nuevo límite (${nuevoLimite}) no puede ser menor que los participantes actuales (${participantesActuales})`
      );
    }

    // Validar compatibilidad con tipo de juego
    if (this.tipoJuego.cantidadJugadores.valor > nuevoLimite) {
      throw new ErrorDominio(
        `El límite debe ser al menos ${this.tipoJuego.cantidadJugadores.valor} para el tipo de juego ${this.tipoJuego.nombreCompleto}`
      );
    }

    const limiteAnterior = this.limiteParticipantes.valor;
    this.limiteParticipantes = new LimiteParticipantes(nuevoLimite);
    this.fechaUltimaModificacion = new FechaHora();
    this.version++;

    this.lanzarEvento(new LimiteParticipantesActualizado(
      this.id,
      limiteAnterior,
      nuevoLimite,
      this.fechaUltimaModificacion
    ));
  }

  /**
   * Crea una nueva etapa de venta
   */
  crearEtapaVenta(nombre, fechaInicio, fechaFin, precio) {
    // Validar que las fechas no se solapen con etapas existentes
    this._validarFechasEtapaVenta(fechaInicio, fechaFin);

    const etapa = new EtapaVenta(
      new EtapaVentaId(this._generarIdEtapa()),
      this.id,
      nombre,
      fechaInicio,
      fechaFin,
      precio
    );

    this.etapasVenta.push(etapa);
    this.fechaUltimaModificacion = new FechaHora();
    this.version++;

    this.lanzarEvento(new EtapaVentaCreada(
      this.id,
      etapa.id,
      nombre,
      fechaInicio,
      fechaFin,
      precio
    ));
  }

  // ========== QUERY METHODS ==========

  /**
   * Verifica si el torneo puede aceptar más participantes
   */
  puedeAceptarParticipantes() {
    return this.estado === EstadoTorneo.ABIERTO_REGISTRO &&
           this.participantes.contar() < this.limiteParticipantes.valor;
  }

  /**
   * Verifica si un usuario específico