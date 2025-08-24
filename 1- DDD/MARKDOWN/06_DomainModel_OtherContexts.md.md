# MODELOS DE DOMINIO - OTROS CONTEXTOS
## Vista General Arquitectónica - Diseño Estratégico DDD

---

## **🎫 CONTEXTO TICKETING**

### **Raíz de Agregado: Ticket**
**Responsabilidad:** Gestionar la venta, validación y control de acceso a torneos

```javascript
class Ticket {
  constructor(id, torneoId, compradorId, precio) {
    this.id = new TicketId(id);
    this.torneoId = new TorneoId(torneoId); // Shared Kernel
    this.compradorId = new UsuarioId(compradorId);
    this.codigoQR = new CodigoQR();
    this.precio = new Dinero(precio);
    this.estado = EstadoTicket.ACTIVO;
    this.fechaCompra = new FechaHora();
    this.historialValidacion = [];
  }
  
  validar(puntoAcceso) {
    if (this.estado !== EstadoTicket.ACTIVO) {
      throw new ErrorDominio('El ticket no es válido');
    }
    
    if (this.yaFueUsado()) {
      throw new ErrorDominio('El ticket ya fue utilizado');
    }
    
    this.historialValidacion.push(new ValidacionTicket(puntoAcceso));
    this.lanzarEvento(new TicketValidado(this.id));
  }
  
  reembolsar() {
    if (!this.esReembolsable()) {
      throw new ErrorDominio('El ticket no es reembolsable');
    }
    
    this.estado = EstadoTicket.REEMBOLSADO;
    this.lanzarEvento(new TicketReembolsado(this.id, this.precio));
  }

  private yaFueUsado() {
    return this.historialValidacion.length > 0;
  }

  private esReembolsable() {
    const limiteTiempo = new FechaHora().restar(24, 'horas');
    return this.fechaCompra.esPosteriorA(limiteTiempo);
  }
}
```

### **Entidades Clave:**
```javascript
class Venta {
  constructor(id, compradorId, items, metodoPago) {
    this.id = new VentaId(id);
    this.compradorId = new UsuarioId(compradorId);
    this.items = items; // Array de ItemVenta
    this.metodoPago = metodoPago;
    this.estado = EstadoVenta.PENDIENTE;
    this.total = this.calcularTotal();
    this.comision = this.calcularComision();
  }

  confirmar() {
    this.estado = EstadoVenta.CONFIRMADA;
    this.lanzarEvento(new VentaConfirmada(this.id, this.total));
  }
}

class EtapaVenta {
  constructor(id, torneoId, nombre, fechaInicio, fechaFin, precio) {
    this.id = new EtapaVentaId(id);
    this.torneoId = new TorneoId(torneoId);
    this.nombre = nombre;
    this.fechaInicio = new FechaHora(fechaInicio);
    this.fechaFin = new FechaHora(fechaFin);
    this.precio = new Dinero(precio);
  }

  estaActiva() {
    const ahora = new FechaHora();
    return ahora.estaEntre(this.fechaInicio, this.fechaFin);
  }
}
```

### **Reglas de Negocio:**
- Cada ticket tiene código QR único e irrepetible
- Comisiones calculadas automáticamente por venta (5-10% según categoría)
- Tickets reembolsables hasta 24h antes del evento
- Validación única por ticket
- Etapas de venta con precios diferenciados

### **Eventos Publicados:**
- `TicketGenerado`, `VentaConfirmada`, `ComisionCalculada`, `TicketValidado`

---

## **📺 CONTEXTO STREAMING**

### **Raíz de Agregado: VistaTorneo**
**Responsabilidad:** Gestionar transmisiones y control de audiencia

```javascript
class VistaTorneo {
  constructor(id, torneoId, creadorId, plataforma) {
    this.id = new VistaTorneoId(id);
    this.torneoId = new TorneoId(torneoId); // Shared Kernel
    this.creadorId = new UsuarioId(creadorId);
    this.plataforma = plataforma; // Entity
    this.limiteEspectadores = new LimiteEspectadores(100);
    this.espectadoresActuales = 0;
    this.estado = EstadoTransmision.CREADA;
    this.tipoAcceso = TipoAcceso.GRATUITO;
    this.horaInicio = null;
    this.horaFin = null;
  }
  
  unirEspectador(espectadorId) {
    if (this.espectadoresActuales >= this.limiteEspectadores.valor) {
      throw new ErrorDominio('La transmisión ha alcanzado el límite de espectadores');
    }
    
    if (this.estado !== EstadoTransmision.EN_VIVO) {
      throw new ErrorDominio('La transmisión no está en vivo');
    }

    if (this.tipoAcceso === TipoAcceso.PAGO && !this.espectadorTieneAcceso(espectadorId)) {
      throw new ErrorDominio('El espectador no tiene acceso pagado');
    }
    
    this.espectadoresActuales++;
    this.lanzarEvento(new EspectadorUnido(this.id, espectadorId));
  }
  
  iniciarTransmision() {
    if (this.estado !== EstadoTransmision.CREADA) {
      throw new ErrorDominio('La transmisión ya fue iniciada');
    }

    this.estado = EstadoTransmision.EN_VIVO;
    this.horaInicio = new FechaHora();
    this.lanzarEvento(new TransmisionIniciada(this.id, this.plataforma.nombre));
  }

  finalizarTransmision() {
    this.estado = EstadoTransmision.FINALIZADA;
    this.horaFin = new FechaHora();
    this.lanzarEvento(new TransmisionFinalizada(this.id, this.calcularDuracion()));
  }
}
```

### **Entidades Clave:**
```javascript
class Plataforma {
  constructor(id, nombre, tipoPlataforma, configuracion) {
    this.id = new PlataformaId(id);
    this.nombre = nombre; // "Twitch", "Discord", "YouTube"
    this.tipoPlataforma = tipoPlataforma; // STREAMING, CONFERENCIA, SOCIAL
    this.configuracion = configuracion; // API keys, URLs, etc.
    this.estaActiva = true;
  }

  validarConexion() {
    // Lógica para validar conectividad con la plataforma
    return this.configuracion.esValida() && this.estaActiva;
  }
}

class Espectador {
  constructor(id, usuarioId, vistaId, tipoAcceso) {
    this.id = new EspectadorId(id);
    this.usuarioId = new UsuarioId(usuarioId);
    this.vistaId = new VistaTorneoId(vistaId);
    this.tipoAcceso = tipoAcceso; // GRATUITO, PAGADO, VIP
    this.fechaIngreso = new FechaHora();
    this.tiempoVisualizacion = 0;
  }

  actualizarTiempoVisualizacion() {
    const ahora = new FechaHora();
    this.tiempoVisualizacion = ahora.diferencia(this.fechaIngreso, 'minutos');
  }
}
```

### **Reglas de Negocio:**
- Usuario registrado: máximo 1 evento gratuito
- Límite de espectadores configurable por stream
- Integración con múltiples plataformas simultáneamente
- Control de acceso pagado/gratuito
- Métricas de visualización en tiempo real

### **Eventos Publicados:**
- `VistaCreada`, `TransmisionIniciada`, `EspectadorUnido`, `CapacidadAlcanzada`

---

## **👤 CONTEXTO GESTIÓN DE USUARIOS**

### **Raíz de Agregado: Usuario**
**Responsabilidad:** Autenticación, autorización y gestión de perfiles

```javascript
class Usuario {
  constructor(id, email, rol) {
    this.id = new UsuarioId(id);
    this.email = new Email(email);
    this.rol = rol; // Entity
    this.permisos = [];
    this.estaActivo = true;
    this.fechaCreacion = new FechaHora();
    this.ultimoLogin = null;
    this.intentosFallidosLogin = 0;
    this.configuracionPrivacidad = new ConfiguracionPrivacidad();
  }
  
  asignarRol(rol) {
    if (this.rol && this.rol.equals(rol)) {
      return; // No cambio necesario
    }

    this.rol = rol;
    this.permisos = rol.obtenerPermisos();
    this.lanzarEvento(new RolAsignado(this.id, rol.nombre));
  }
  
  autenticar(credenciales) {
    if (!this.estaActivo) {
      throw new ErrorDominio('La cuenta de usuario está inactiva');
    }
    
    if (this.estaBloqueado()) {
      throw new ErrorDominio('Cuenta bloqueada por múltiples intentos fallidos');
    }
    
    if (!this.validarCredenciales(credenciales)) {
      this.intentosFallidosLogin++;
      if (this.intentosFallidosLogin >= 5) {
        this.bloquearCuenta();
      }
      throw new ErrorDominio('Credenciales inválidas');
    }
    
    // Autenticación exitosa
    this.ultimoLogin = new FechaHora();
    this.intentosFallidosLogin = 0;
    this.lanzarEvento(new SesionIniciada(this.id));
  }

  private estaBloqueado() {
    return this.intentosFallidosLogin >= 5;
  }

  private bloquearCuenta() {
    this.estaActivo = false;
    this.lanzarEvento(new CuentaBloqueada(this.id));
  }
}
```

### **Entidades Clave:**
```javascript
class Rol {
  constructor(id, nombre, descripcion) {
    this.id = new RolId(id);
    this.nombre = nombre; // "Organizador", "Participante", "Espectador"
    this.descripcion = descripcion;
    this.permisos = [];
  }

  agregarPermiso(permiso) {
    if (!this.tienePermiso(permiso)) {
      this.permisos.push(permiso);
    }
  }

  obtenerPermisos() {
    return [...this.permisos]; // Copia defensiva
  }
}

class Sesion {
  constructor(id, usuarioId, token) {
    this.id = new SesionId(id);
    this.usuarioId = new UsuarioId(usuarioId);
    this.token = new TokenJWT(token);
    this.fechaCreacion = new FechaHora();
    this.fechaExpiracion = this.fechaCreacion.agregar(24, 'horas');
    this.estaActiva = true;
  }

  validar() {
    const ahora = new FechaHora();
    if (ahora.esPosteriorA(this.fechaExpiracion)) {
      this.expirar();
      throw new ErrorDominio('Sesión expirada');
    }
    return this.estaActiva;
  }
}
```

### **Reglas de Negocio:**
- Email único por usuario
- Roles diferenciados con permisos específicos
- Sesiones JWT con expiración automática
- Bloqueo automático por 5 intentos fallidos
- Configuración de privacidad personalizable

### **Patrón:** Open Host Service (API pública para todos los contextos)

---

## **📊 CONTEXTO MONITOREO**

### **Raíz de Agregado: Metrica**
**Responsabilidad:** Recolección, análisis y alertas de métricas del sistema

```javascript
class Metrica {
  constructor(id, tipoEntidad, entidadId, tipoMetrica, valor) {
    this.id = new MetricaId(id);
    this.tipoEntidad = tipoEntidad; // 'torneo', 'usuario', 'stream', 'ticket'
    this.entidadId = entidadId;
    this.tipoMetrica = tipoMetrica; // 'creacion', 'participacion', 'vista', 'venta'
    this.valor = new ValorMetrica(valor);
    this.timestamp = new FechaHora();
    this.metadatos = {};
    this.tags = [];
  }

  agregarTag(tag) {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
    }
  }

  agregarMetadato(clave, valor) {
    this.metadatos[clave] = valor;
  }
}

class Alerta {
  constructor(id, tipoMetrica, condicion, umbral) {
    this.id = new AlertaId(id);
    this.tipoMetrica = tipoMetrica;
    this.condicion = condicion; // 'mayor_que', 'menor_que', 'igual_a'
    this.umbral = umbral;
    this.estaActiva = true;
    this.ultimaEvaluacion = null;
  }

  evaluar(metrica) {
    this.ultimaEvaluacion = new FechaHora();
    
    if (!this.estaActiva || metrica.tipoMetrica !== this.tipoMetrica) {
      return false;
    }

    const cumpleCondicion = this.evaluarCondicion(metrica.valor.numero);
    
    if (cumpleCondicion) {
      this.lanzarEvento(new UmbralSuperado(this.id, metrica));
    }

    return cumpleCondicion;
  }
}
```

### **Reglas de Negocio:**
- Métricas en tiempo real con timestamps precisos
- Alertas configurables con múltiples condiciones
- Agregación automática por períodos (hora, día, semana)
- Retención de datos configurable por tipo de métrica

---

## **🔔 CONTEXTO NOTIFICACIONES**

### **Raíz de Agregado: Notificacion**
**Responsabilidad:** Gestionar alertas y comunicaciones multicanal

```javascript
class Notificacion {
  constructor(id, destinatarioId, tipo, canal, mensaje) {
    this.id = new NotificacionId(id);
    this.destinatarioId = new UsuarioId(destinatarioId);
    this.tipo = tipo; // 'info', 'advertencia', 'error', 'exito'
    this.canal = canal; // Entity
    this.mensaje = new MensajeNotificacion(mensaje);
    this.estado = EstadoNotificacion.PENDIENTE;
    this.fechaCreacion = new FechaHora();
    this.fechaEnvio = null;
    this.intentosEnvio = 0;
    this.configuracionPersonalizada = null;
  }

  enviar() {
    if (this.estado === EstadoNotificacion.ENVIADA) {
      throw new ErrorDominio('La notificación ya fue enviada');
    }

    if (this.intentosEnvio >= 3) {
      this.marcarComoFallida();
      throw new ErrorDominio('Máximo de intentos de envío alcanzado');
    }

    try {
      this.canal.enviar(this.mensaje, this.destinatarioId);
      this.estado = EstadoNotificacion.ENVIADA;
      this.fechaEnvio = new FechaHora();
      this.lanzarEvento(new NotificacionEnviada(this.id));
    } catch (error) {
      this.intentosEnvio++;
      this.lanzarEvento(new ErrorEnvioNotificacion(this.id, error.message));
      throw error;
    }
  }

  programar(fechaProgramada) {
    this.estado = EstadoNotificacion.PROGRAMADA;
    this.fechaProgramada = new FechaHora(fechaProgramada);
    this.lanzarEvento(new NotificacionProgramada(this.id, fechaProgramada));
  }

  private marcarComoFallida() {
    this.estado = EstadoNotificacion.FALLIDA;
    this.lanzarEvento(new NotificacionFallida(this.id));
  }
}

class Canal {
  constructor(id, nombre, tipoCanal, configuracion) {
    this.id = new CanalId(id);
    this.nombre = nombre;
    this.tipoCanal = tipoCanal; // EMAIL, SMS, PUSH, IN_APP
    this.configuracion = configuracion;
    this.estaActivo = true;
    this.limitesEnvio = new LimitesEnvio();
  }

  enviar(mensaje, destinatarioId) {
    if (!this.estaActivo) {
      throw new ErrorDominio('Canal inactivo');
    }

    if (this.limitesEnvio.seExcedio(destinatarioId)) {
      throw new ErrorDominio('Límite de envío excedido para el destinatario');
    }

    // Lógica específica por tipo de canal
    switch (this.tipoCanal) {
      case TipoCanal.EMAIL:
        return this.enviarEmail(mensaje, destinatarioId);
      case TipoCanal.SMS:
        return this.enviarSMS(mensaje, destinatarioId);
      case TipoCanal.PUSH:
        return this.enviarPushNotification(mensaje, destinatarioId);
      default:
        throw new ErrorDominio(`Tipo de canal no soportado: ${this.tipoCanal}`);
    }
  }
}
```

### **Entidades Clave:**
```javascript
class PlantillaNotificacion {
  constructor(id, nombre, tipoEvento, canalPredeterminado) {
    this.id = new PlantillaId(id);
    this.nombre = nombre;
    this.tipoEvento = tipoEvento; // 'torneo_creado', 'participante_registrado'
    this.canalPredeterminado = canalPredeterminado;
    this.plantillaMensaje = '';
    this.variables = []; // Variables que se pueden reemplazar
  }

  generarMensaje(datosEvento) {
    let mensajeFinal = this.plantillaMensaje;
    
    this.variables.forEach(variable => {
      const valor = datosEvento[variable.nombre] || variable.valorPredeterminado;
      mensajeFinal = mensajeFinal.replace(`{{${variable.nombre}}}`, valor);
    });

    return new MensajeNotificacion(mensajeFinal);
  }
}

class ConfiguracionNotificacionUsuario {
  constructor(usuarioId) {
    this.usuarioId = new UsuarioId(usuarioId);
    this.preferenciasCanal = new Map();
    this.horarioNoMolestar = null;
    this.tiposDeshabilitados = [];
  }

  configurarPreferencia(tipoEvento, canal, habilitado) {
    if (!this.preferenciasCanal.has(tipoEvento)) {
      this.preferenciasCanal.set(tipoEvento, new Map());
    }
    
    this.preferenciasCanal.get(tipoEvento).set(canal, habilitado);
  }

  puedeRecibirNotificacion(tipoEvento, canal, horaActual) {
    // Verificar si el tipo está deshabilitado
    if (this.tiposDeshabilitados.includes(tipoEvento)) {
      return false;
    }

    // Verificar horario no molestar
    if (this.horarioNoMolestar && this.horarioNoMolestar.incluye(horaActual)) {
      return false;
    }

    // Verificar preferencia específica
    const preferenciaEvento = this.preferenciasCanal.get(tipoEvento);
    return preferenciaEvento ? preferenciaEvento.get(canal) : true;
  }
}
```

### **Reglas de Negocio:**
- Múltiples canales (email, SMS, push, in-app)
- Notificaciones personalizadas por rol y preferencias
- Control anti-spam con límites por usuario
- Programación de notificaciones diferidas
- Plantillas reutilizables por tipo de evento
- Configuración de horarios "no molestar"

### **Eventos Publicados:**
- `NotificacionEnviada`, `NotificacionFallida`, `ConfiguracionActualizada`

---

## **🔗 RELACIONES ENTRE CONTEXTOS**

### **Flujos de Integración:**

#### **1. Creación de Torneo:**
```
Gestión Torneos → Eventos → {
  Ticketing: Crear plantilla tickets
  Streaming: Habilitar creación vista
  Notificaciones: Notificar seguidores organizador
}
```

#### **2. Registro de Participante:**
```
Gestión Torneos → Eventos → {
  Ticketing: Validar ticket si es pago
  Usuarios: Verificar permisos
  Notificaciones: Confirmar registro
  Monitoreo: Incrementar métrica participación
}
```

#### **3. Inicio de Transmisión:**
```
Streaming → Eventos → {
  Notificaciones: Notificar suscriptores
  Monitoreo: Métricas de audiencia
  Usuarios: Validar permisos espectadores
}
```

---

## **📋 RESUMEN ARQUITECTÓNICO**

### **Contextos por Complejidad:**
1. **Alta Complejidad:** Gestión de Torneos (implementación completa)
2. **Media Complejidad:** Ticketing, Streaming (diseño detallado)
3. **Baja Complejidad:** Usuarios, Monitoreo, Notificaciones (contratos definidos)

### **Patrones Aplicados:**
- **Event Sourcing:** En contextos que requieren auditoría completa
- **CQRS:** Separación comando/consulta en contextos complejos
- **Saga Pattern:** Para transacciones distribuidas (venta de tickets)
- **Circuit Breaker:** Para llamadas entre contextos

### **Estrategia de Implementación:**
1. **Fase 1:** Gestión de Torneos completa (TDD/BDD)
2. **Fase 2:** Interfaces y contratos de otros contextos
3. **Fase 3:** Implementación incremental por prioridad de negocio

