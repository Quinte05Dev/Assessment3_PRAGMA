# PATRONES DE INTEGRACIÓN - BOUNDED CONTEXTS
## Estrategias de Comunicación Entre Contextos

---

## **🔄 PATRÓN 1: EVENT-DRIVEN INTEGRATION**
**Contextos:** Gestión de Torneos → Ticketing, Streaming, Notificaciones

### **Implementación:**
```javascript
// Evento de Dominio
class TorneoCreado {
  constructor(torneoId, organizadorId, categoriaId, tipoJuegoId) {
    this.torneoId = torneoId;
    this.organizadorId = organizadorId;
    this.categoriaId = categoriaId;
    this.tipoJuegoId = tipoJuegoId;
    this.fechaOcurrencia = new Date();
    this.tipoEvento = 'TorneoCreado';
  }
}

// Manejador de Eventos en Contexto Ticketing
class ManejadorTorneoCreado {
  constructor(repositorioTicket) {
    this.repositorioTicket = repositorioTicket;
  }

  async manejar(evento) {
    // Auto-crear plantilla de tickets para el torneo
    const plantillaTicket = new PlantillaTicket(
      evento.torneoId,
      evento.categoriaId,
      PrecioBase.porCategoria(evento.categoriaId)
    );
    
    await this.repositorioTicket.guardarPlantilla(plantillaTicket);
    console.log(`Plantilla de tickets creada para torneo ${evento.torneoId}`);
  }
}
```

### **Ventajas:**
- **Desacoplamiento temporal:** Los contextos no necesitan estar disponibles simultáneamente
- **Escalabilidad:** Fácil agregar nuevos consumidores de eventos
- **Resilencia:** Fallos en un contexto no afectan otros

### **Implementación AWS:**
- **SNS/SQS** para pub/sub messaging
- **EventBridge** para routing inteligente
- **Lambda** como manejadores de eventos

---

## **🛡️ PATRÓN 2: ANTI-CORRUPTION LAYER**
**Contextos:** Monitoreo ← Todos los Contextos

### **Propósito:**
Proteger el contexto de Monitoreo de cambios en los modelos de otros contextos, traduciendo eventos específicos a un modelo de métricas unificado.

### **Implementación:**
```javascript
class TraductorEventosMonitoreo {
  
  traducirEventoTorneo(eventoDominio) {
    return {
      tipoMetrica: 'actividad_torneo',
      entidadId: eventoDominio.torneoId,
      accion: this.mapearEventoAAccion(eventoDominio),
      timestamp: eventoDominio.fechaOcurrencia,
      metadatos: this.extraerMetadatos(eventoDominio),
      contextoOrigen: 'torneos'
    };
  }

  traducirEventoTicketing(eventoDominio) {
    return {
      tipoMetrica: 'actividad_venta',
      entidadId: eventoDominio.ticketId,
      accion: 'venta_realizada',
      valor: eventoDominio.precio,
      timestamp: eventoDominio.fechaOcurrencia,
      contextoOrigen: 'ticketing'
    };
  }
  
  private mapearEventoAAccion(evento) {
    const mapeo = {
      'TorneoCreado': 'creado',
      'ParticipanteRegistrado': 'participante_agregado',
      'TorneoIniciado': 'iniciado',
      'TorneoFinalizado': 'completado'
    };
    return mapeo[evento.constructor.name] || 'evento_desconocido';
  }

  private extraerMetadatos(evento) {
    return {
      organizadorId: evento.organizadorId,
      categoriaId: evento.categoriaId,
      tipoJuegoId: evento.tipoJuegoId
    };
  }
}

// Servicio de Monitoreo que usa el traductor
class ServicioMonitoreo {
  constructor(traductor, repositorioMetricas) {
    this.traductor = traductor;
    this.repositorioMetricas = repositorioMetricas;
  }

  async procesarEventoExterno(evento, contextoOrigen) {
    let metrica;
    
    switch(contextoOrigen) {
      case 'torneos':
        metrica = this.traductor.traducirEventoTorneo(evento);
        break;
      case 'ticketing':
        metrica = this.traductor.traducirEventoTicketing(evento);
        break;
      default:
        throw new Error(`Contexto no soportado: ${contextoOrigen}`);
    }
    
    await this.repositorioMetricas.guardar(metrica);
  }
}
```

### **Beneficios:**
- **Autonomía:** Monitoreo evoluciona independientemente
- **Estabilidad:** Cambios en otros contextos no rompen monitoreo
- **Modelo limpio:** Métricas unificadas sin contaminar el dominio

---

## **🌐 PATRÓN 3: SHARED KERNEL (MÍNIMO)**
**Contextos:** Gestión de Torneos ↔ Streaming y Vistas

### **Elementos Compartidos:**
```javascript
// Objetos de Valor Compartidos
export class TorneoId {
  constructor(valor) {
    if (!valor) throw new Error('TorneoId es requerido');
    this.valor = valor;
  }

  equals(otro) {
    return otro instanceof TorneoId && this.valor === otro.valor;
  }

  toString() {
    return this.valor;
  }
}

export class UsuarioId {
  constructor(valor) {
    if (!valor) throw new Error('UsuarioId es requerido');
    this.valor = valor;
  }

  equals(otro) {
    return otro instanceof UsuarioId && this.valor === otro.valor;
  }
}

export class FechaHora {
  constructor(valor = new Date()) {
    this.valor = new Date(valor);
  }

  esPosteriorA(otra) {
    return this.valor > otra.valor;
  }

  esAnteriorA(otra) {
    return this.valor < otra.valor;
  }

  formatear() {
    return this.valor.toISOString();
  }
}

// Eventos Compartidos
export class EventoBaseTorneo {
  constructor(torneoId, fechaOcurrencia = new Date()) {
    this.torneoId = new TorneoId(torneoId);
    this.fechaOcurrencia = new FechaHora(fechaOcurrencia);
  }
}
```

### **Reglas del Shared Kernel:**
- **Solo Value Objects** inmutables
- **Cambios coordinados** entre equipos
- **Versioning estricto** para evitar breaking changes
- **Documentación explícita** de elementos compartidos

---

## **🔌 PATRÓN 4: OPEN HOST SERVICE**
**Contexto:** Gestión de Usuarios → Todos los Contextos

### **Contrato de API:**
```javascript
// Interfaz pública del servicio
interface IServicioUsuario {
  validarUsuario(usuarioId: string): Promise<ResultadoValidacionUsuario>;
  obtenerPermisosUsuario(usuarioId: string): Promise<Permiso[]>;
  usuarioTieneRol(usuarioId: string, nombreRol: string): Promise<boolean>;
  obtenerPerfilUsuario(usuarioId: string): Promise<PerfilUsuario>;
}

// Adaptador que consume Cognito
class AdaptadorServicioUsuario implements IServicioUsuario {
  constructor(private servicoCognito: ServicioCognito) {}
  
  async validarUsuario(usuarioId: string): Promise<ResultadoValidacionUsuario> {
    try {
      const usuarioCognito = await this.servicoCognito.obtenerUsuario(usuarioId);
      
      return {
        esValido: usuarioCognito !== null,
        usuarioId: usuarioId,
        email: usuarioCognito.email,
        roles: usuarioCognito.groups || [],
        estaActivo: usuarioCognito.enabled
      };
    } catch (error) {
      return {
        esValido: false,
        usuarioId: usuarioId,
        error: error.message
      };
    }
  }

  async obtenerPermisosUsuario(usuarioId: string): Promise<Permiso[]> {
    const usuario = await this.servicoCognito.obtenerUsuario(usuarioId);
    const roles = usuario.groups || [];
    
    // Mapear roles de Cognito a permisos del dominio
    const permisos = [];
    for (const rol of roles) {
      permisos.push(...this.mapearRolAPermisos(rol));
    }
    
    return permisos;
  }

  private mapearRolAPermisos(nombreRol: string): Permiso[] {
    const mapeoPermisos = {
      'Organizador': [
        new Permiso('crear_torneo'),
        new Permiso('gestionar_torneo'),
        new Permiso('ver_reportes')
      ],
      'Participante': [
        new Permiso('registrarse_torneo'),
        new Permiso('ver_torneo')
      ],
      'Espectador': [
        new Permiso('ver_transmision')
      ]
    };
    
    return mapeoPermisos[nombreRol] || [];
  }
}
```

### **Uso en otros contextos:**
```javascript
// En Contexto de Torneos
class ServicioCreacionTorneo {
  constructor(private servicioUsuario: IServicioUsuario) {}

  async crearTorneo(comandoCrearTorneo) {
    // Validar que el organizador existe y tiene permisos
    const validacion = await this.servicioUsuario.validarUsuario(
      comandoCrearTorneo.organizadorId
    );
    
    if (!validacion.esValido) {
      throw new Error('Organizador no válido');
    }

    const tienePermisos = await this.servicioUsuario.usuarioTieneRol(
      comandoCrearTorneo.organizadorId, 
      'Organizador'
    );

    if (!tienePermisos) {
      throw new Error('Usuario no tiene permisos para crear torneos');
    }

    // Proceder con la creación...
  }
}
```

---

## **🔗 PATRÓN 5: CUSTOMER/SUPPLIER**
**Contextos:** Gestión de Torneos (Upstream) → Ticketing (Downstream)

### **Contrato de Integración:**
```javascript
// Gestión de Torneos expone (Supplier)
interface IServicioIntegracionTorneo {
  obtenerDetallesTorneo(torneoId: string): Promise<DetallesTorneo>;
  suscribirseAEventosTorneo(callback: CallbackEvento): void;
  obtenerTorneosActivos(): Promise<ResumenTorneo[]>;
  validarCapacidadTorneo(torneoId: string): Promise<boolean>;
}

// Ticketing consume (Customer)
class AdaptadorTorneoTicketing {
  constructor(private servicioTorneo: IServicioIntegracionTorneo) {
    this.suscribirseAEventos();
  }
  
  private suscribirseAEventos() {
    this.servicioTorneo.suscribirseAEventosTorneo((evento) => {
      switch(evento.tipo) {
        case 'TorneoCreado':
          this.manejarTorneoCreado(evento);
          break;
        case 'LimiteParticipantesModificado':
          this.manejarLimiteModificado(evento);
          break;
        case 'TorneoCancel  ado':
          this.manejarTorneoCancelado(evento);
          break;
      }
    });
  }

  private async manejarTorneoCreado(evento) {
    const detalles = await this.servicioTorneo.obtenerDetallesTorneo(evento.torneoId);
    
    // Crear configuración de tickets basada en detalles del torneo
    const configuracionTicket = new ConfiguracionTicket(
      evento.torneoId,
      detalles.categoria,
      detalles.limiteParticipantes,
      this.calcularPrecioPorCategoria(detalles.categoria)
    );

    await this.repositorioConfiguracion.guardar(configuracionTicket);
  }
}
```

---

## **📊 RESUMEN DE PATRONES POR CONTEXTO**

### **Gestión de Torneos (Core):**
- **Publisher** de eventos críticos
- **Consumer** de servicios de Usuario
- **Supplier** para Ticketing y Streaming

### **Ticketing (Supporting):**
- **Consumer** de eventos de Torneos
- **Publisher** de eventos de venta

### **Streaming (Supporting):**
- **Shared Kernel** con Torneos
- **Consumer** de eventos de Torneos

### **Gestión de Usuarios (Generic):**
- **Open Host Service** para todos
- **Publisher** de eventos de autenticación

### **Monitoreo (Generic):**
- **Anti-Corruption Layer** desde todos
- **Consumer** universal de eventos

### **Notificaciones (Generic):**
- **Consumer** selectivo de eventos
- **Published Language** para transformar eventos

---

## **🚀 IMPLEMENTACIÓN EN AWS**

### **Event-Driven:**
- **SNS Topics** por tipo de evento
- **SQS Queues** para cada consumer
- **Lambda Functions** como event handlers

### **Anti-Corruption Layer:**
- **Lambda Layer** con funciones de traducción
- **Step Functions** para orquestación compleja

### **Open Host Service:**
- **API Gateway** con recursos públicos
- **Lambda Authorizers** para seguridad

### **Shared Kernel:**
- **NPM Private Package** para Value Objects compartidos
- **Lambda Layers** para código común

