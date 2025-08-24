# BOUNDED CONTEXTS - ARQUITECTURA DDD
## Contextos Delimitados y Mapeo de Relaciones - Diseño Estratégico

---

## **🎯 CONTEXTO 1: GESTIÓN DE TORNEOS**
**Responsabilidad:** Gestión completa del ciclo de vida de torneos de e-sports
**Equipo Responsable:** Core Development Team
**Complejidad:** Alta

### **🏗️ Entidades Principales:**
- **Torneo** (Raíz de Agregado)
  - *Atributos:* id, nombre, categoria, tipoJuego, organizadorId, estado
  - *Comportamientos:* crear, confirmar, iniciar, finalizar, cancelar
  - *Invariantes:* mínimo 2 participantes, máximo 2 subadministradores

- **Categoria**
  - *Atributos:* id, descripcion, alias, estaActiva
  - *Comportamientos:* activar, desactivar
  - *Regla:* Solo categorías activas pueden usarse en nuevos torneos

- **TipoJuego**
  - *Atributos:* id, nombreCompleto, cantidadJugadores
  - *Comportamientos:* definir requisitos de jugadores
  - *Validación:* compatible con límite de participantes del torneo

- **Participante**
  - *Atributos:* id, usuarioId, fechaRegistro, estado
  - *Comportamientos:* registrar, confirmar, cancelar, descalificar
  - *Restricción:* un usuario no puede registrarse dos veces en el mismo torneo

- **SubAdministrador**
  - *Atributos:* id, usuarioId, torneoId, permisos
  - *Comportamientos:* asignar, remover, gestionar permisos
  - *Límite:* máximo 2 por torneo

### **📊 Reglas de Negocio Críticas:**
1. Un torneo debe tener mínimo 1 categoría asignada
2. Máximo 2 subadministradores por torneo
3. Límites de participantes según tipo: gratuito (≤50), pago (configurable)
4. Solo organizador puede iniciar/finalizar torneo
5. Estado del torneo sigue flujo: BORRADOR → ABIERTO_REGISTRO → REGISTRO_CERRADO → EN_PROGRESO → FINALIZADO

### **🔄 Eventos Publicados:**
- **TorneoCreado:** Cuando se crea nuevo torneo
- **ParticipanteRegistrado:** Cuando usuario se inscribe
- **TorneoIniciado:** Cuando comienza la competencia
- **TorneoFinalizado:** Cuando termina la competencia
- **TorneoCancelado:** Cuando se cancela antes de finalizar

### **📥 Eventos Consumidos:**
- **UsuarioValidado:** Del contexto Gestión de Usuarios
- **TicketValidado:** Del contexto Ticketing (para torneos pagos)

### **🎯 Métricas Clave:**
- Torneos creados por período
- Tasa de finalización de torneos
- Promedio de participantes por torneo
- Tiempo medio desde creación hasta inicio

---

## **🎫 CONTEXTO 2: TICKETING Y VENTAS**
**Responsabilidad:** Gestión de tickets, ventas y comisiones
**Equipo Responsable:** Payments Team
**Complejidad:** Media-Alta

### **🏗️ Entidades Principales:**
- **Ticket** (Raíz de Agregado)
  - *Atributos:* id, torneoId, compradorId, codigoQR, precio, estado
  - *Comportamientos:* generar, validar, cancelar, reembolsar
  - *Invariantes:* código QR único, una sola validación por ticket

- **Venta**
  - *Atributos:* id, compradorId, tickets, metodoPago, total
  - *Comportamientos:* iniciar, procesar pago, confirmar, cancelar
  - *Estados:* PENDIENTE, PROCESANDO, CONFIRMADA, CANCELADA

- **CodigoQR**
  - *Atributos:* codigo, ticketId, algoritmo, fechaGeneracion
  - *Comportamientos:* generar, validar, invalidar
  - *Seguridad:* algoritmo criptográfico para unicidad global

- **Comision**
  - *Atributos:* id, ventaId, porcentaje, monto, fechaCalculo
  - *Comportamientos:* calcular automáticamente
  - *Reglas:* 5% Amateur, 8% Profesional, 10% Eventos especiales

- **EtapaVenta**
  - *Atributos:* id, torneoId, nombre, fechaInicio, fechaFin, precio
  - *Comportamientos:* crear, activar, desactivar
  - *Validación:* fechas no pueden solaparse entre etapas

### **📊 Reglas de Negocio Críticas:**
1. Cada ticket tiene código QR único e irrepetible globalmente
2. Comisiones calculadas automáticamente según categoría del torneo
3. Etapas de venta con precios diferenciados y fechas no solapadas
4. Tickets reembolsables hasta 24 horas antes del evento
5. Validación única por ticket en punto de acceso

### **🔄 Eventos Publicados:**
- **TicketGenerado:** Cuando se crea nuevo ticket
- **VentaConfirmada:** Cuando pago se procesa exitosamente
- **ComisionCalculada:** Cuando se determina ganancia plataforma
- **TicketValidado:** Cuando se usa ticket para acceso
- **ReembolsoProcessado:** Cuando se cancela ticket

### **📥 Eventos Consumidos:**
- **TorneoCreado:** Para auto-generar plantilla de tickets
- **TorneoCancelado:** Para iniciar proceso de reembolsos automático
- **UsuarioValidado:** Para verificar comprador

### **🎯 Métricas Clave:**
- Revenue total y por categoría
- Tasa de conversión venta iniciada → confirmada
- Promedio de tickets por transacción
- Tasa de reembolsos por categoría

---

## **📺 CONTEXTO 3: STREAMING Y VISTAS**
**Responsabilidad:** Gestión de transmisiones y control de audiencia
**Equipo Responsable:** Media Team
**Complejidad:** Media

### **🏗️ Entidades Principales:**
- **VistaTorneo** (Raíz de Agregado)
  - *Atributos:* id, torneoId, creadorId, plataforma, limiteEspectadores
  - *Comportamientos:* crear, configurar, iniciar transmisión, finalizar
  - *Restricción:* usuario registrado máximo 1 vista gratuita

- **Plataforma**
  - *Atributos:* id, nombre, tipo, configuracionAPI, estaActiva
  - *Comportamientos:* integrar, validar conexión, desconectar
  - *Tipos:* Twitch, Discord, YouTube, Zoom, Meet

- **Espectador**
  - *Atributos:* id, usuarioId, vistaId, tiempoConexion, tipoAcceso
  - *Comportamientos:* unirse, desconectarse, cambiar a premium
  - *Métricas:* tiempo visualización, interacciones

- **Transmision**
  - *Atributos:* id, vistaId, horaInicio, horaFin, estadoTransmision
  - *Comportamientos:* iniciar, pausar, reanudar, finalizar
  - *Estados:* CREADA, EN_VIVO, PAUSADA, FINALIZADA

### **📊 Reglas de Negocio Críticas:**
1. Usuario registrado: máximo 1 evento gratuito
2. Límite de espectadores configurable por transmisión
3. Integración simultánea con múltiples plataformas
4. Control de acceso diferenciado: gratuito, pagado, VIP
5. Métricas de audiencia en tiempo real

### **🔄 Eventos Publicados:**
- **VistaCreada:** Cuando se configura nueva transmisión
- **TransmisionIniciada:** Cuando stream va en vivo
- **EspectadorUnido:** Cuando usuario se conecta
- **CapacidadAlcanzada:** Cuando se llega al límite de espectadores
- **TransmisionFinalizada:** Cuando termina el stream

### **📥 Eventos Consumidos:**
- **TorneoIniciado:** Para habilitar inicio automático de transmisión
- **TorneoFinalizado:** Para finalizar transmisiones asociadas
- **UsuarioValidado:** Para verificar permisos de espectador

### **🎯 Métricas Clave:**
- Espectadores únicos por transmisión
- Tiempo promedio de visualización
- Picos de audiencia por torneo
- Tasa de conversión espectador gratuito → pagado

---

## **👤 CONTEXTO 4: GESTIÓN DE USUARIOS**
**Responsabilidad:** Autenticación, autorización y gestión de perfiles
**Equipo Responsable:** Identity & Access Team
**Complejidad:** Media

### **🏗️ Entidades Principales:**
- **Usuario** (Raíz de Agregado)
  - *Atributos:* id, email, rol, permisos, estaActivo, fechaCreacion
  - *Comportamientos:* registrar, autenticar, asignar rol, bloquear
  - *Validación:* email único, contraseña segura

- **Rol**
  - *Atributos:* id, nombre, descripcion, permisos
  - *Comportamientos:* crear, modificar, asignar permisos
  - *Tipos:* Organizador, Participante, Espectador, Administrador

- **Permiso**
  - *Atributos:* id, recurso, accion, contexto
  - *Comportamientos:* conceder, revocar, verificar
  - *Granularidad:* por contexto y operación específica

- **Sesion**
  - *Atributos:* id, usuarioId, tokenJWT, fechaCreacion, fechaExpiracion
  - *Comportamientos:* crear, validar, renovar, expirar
  - *Seguridad:* tokens con expiración automática 24h

### **📊 Reglas de Negocio Críticas:**
1. Email único por usuario en toda la plataforma
2. Roles diferenciados con permisos granulares por contexto
3. Sesiones JWT con expiración y renovación automática
4. Bloqueo automático tras 5 intentos fallidos de login
5. Configuración de privacidad personalizable por usuario

### **🔄 Eventos Publicados:**
- **UsuarioRegistrado:** Cuando se crea nueva cuenta
- **RolAsignado:** Cuando se cambia rol de usuario
- **SesionIniciada:** Cuando usuario se autentica
- **CuentaBloqueada:** Cuando se detectan intentos maliciosos
- **PerfilActualizado:** Cuando usuario modifica información

### **📥 Eventos Consumidos:**
- **TorneoCreado:** Para validar permisos del organizador
- **VentaIniciada:** Para verificar identidad del comprador

### **🎯 Métricas Clave:**
- Usuarios registrados por período
- Tasa de activación de cuentas
- Tiempo promedio de sesión
- Intentos de login fallidos

### **🌐 Patrón Arquitectónico:**
**OPEN HOST SERVICE** - Expone API pública bien definida que consumen todos los demás contextos


## **📊 CONTEXTO 5: MONITOREO Y ANÁLISIS**
**Responsabilidad:** Métricas, trazabilidad y reportes del sistema
**Equipo Responsable:** Platform & DevOps Team
**Complejidad:** Media

### **🏗️ Entidades Principales:**
- **Metrica** (Raíz de Agregado)
  - *Atributos:* id, tipoEntidad, entidadId, tipoMetrica, valor, timestamp
  - *Comportamientos:* registrar, agregar, filtrar, exportar
  - *Tipos:* Contadores, gauges, histogramas, timers

- **Reporte**
  - *Atributos:* id, tipo, parametros, fechaGeneracion, formato
  - *Comportamientos:* generar, programar, exportar, compartir
  - *Tipos:* Financiero, participación, audiencia, técnico

- **Alerta**
  - *Atributos:* id, tipoMetrica, condicion, umbral, destinatarios
  - *Comportamientos:* configurar, evaluar, disparar, silenciar
  - *Condiciones:* mayor_que, menor_que, igual_a, cambio_porcentual

- **Dashboard**
  - *Atributos:* id, nombre, widgets, usuarioId, esPublico
  - *Comportamientos:* crear, personalizar, compartir, exportar
  - *Widgets:* gráficos tiempo real, KPIs, tablas, mapas calor

### **📊 Reglas de Negocio Críticas:**
1. Métricas capturadas en tiempo real con timestamps precisos
2. Alertas configurables con múltiples condiciones y destinatarios
3. Agregación automática por períodos (hora, día, semana, mes)
4. Retención de datos configurable por tipo de métrica
5. Dashboards personalizables por rol y organización

### **🔄 Eventos Publicados:**
- **UmbralSuperado:** Cuando métrica excede límite configurado
- **ReporteGenerado:** Cuando se produce informe automático
- **AlertaCreada:** Cuando se configura nueva alerta
- **DashboardCompartido:** Cuando se comparte dashboard

### **📥 Eventos Consumidos:**
- **TODOS LOS EVENTOS** de todos los contextos (para métricas)
- Eventos transformados a métricas mediante Anti-Corruption Layer

### **🎯 Métricas Clave:**
- Eventos procesados por segundo
- Latencia promedio de alertas
- Uso de dashboards por usuario
- Precisión de predicciones

### **🔧 Patrón Arquitectónico:**
**ANTI-CORRUPTION LAYER** - Traduce eventos de otros contextos a formato unificado

---

## **🔔 CONTEXTO 6: SISTEMA DE NOTIFICACIONES**
**Responsabilidad:** Alertas y comunicaciones multicanal
**Equipo Responsable:** Communications Team
**Complejidad:** Media-Baja

### **🏗️ Entidades Principales:**
- **Notificacion** (Raíz de Agregado)
  - *Atributos:* id, destinatarioId, tipo, canal, mensaje, estado
  - *Comportamientos:* crear, enviar, programar, cancelar
  - *Estados:* PENDIENTE, ENVIADA, FALLIDA, PROGRAMADA

- **Canal**
  - *Atributos:* id, nombre, tipoCanal, configuracion, estaActivo
  - *Comportamientos:* configurar, enviar, validar conectividad
  - *Tipos:* EMAIL, SMS, PUSH, IN_APP, SLACK, DISCORD

- **PlantillaNotificacion**
  - *Atributos:* id, nombre, tipoEvento, contenido, variables
  - *Comportamientos:* crear, personalizar, aplicar variables
  - *Variables:* {{nombreTorneo}}, {{fechaInicio}}, {{organizador}}

- **ConfiguracionUsuario**
  - *Atributos:* usuarioId, preferenciasCanal, horarioNoMolestar
  - *Comportamientos:* configurar, actualizar, validar horarios
  - *Preferencias:* por tipo evento y canal preferido

### **📊 Reglas de Negocio Críticas:**
1. Múltiples canales disponibles (email, SMS, push, in-app)
2. Notificaciones personalizadas por rol y preferencias usuario
3. Control anti-spam con límites por destinatario
4. Programación de notificaciones diferidas
5. Plantillas reutilizables con variables dinámicas

### **🔄 Eventos Publicados:**
- **NotificacionEnviada:** Cuando mensaje se transmite exitosamente
- **NotificacionFallida:** Cuando falla envío tras múltiples intentos
- **ConfiguracionActualizada:** Cuando usuario cambia preferencias
- **PlantillaCreada:** Cuando se define nueva plantilla

### **📥 Eventos Consumidos:**
- **TorneoCreado:** Para notificar seguidores del organizador
- **ParticipanteRegistrado:** Para confirmar registro
- **AlertaGenerada:** Para notificar administradores
- **VentaConfirmada:** Para enviar confirmación compra

### **🎯 Métricas Clave:**
- Tasa de entrega por canal
- Tiempo promedio de envío
- Tasa de apertura (email/push)
- Preferencias de canal por rol

### **📧 Patrón Arquitectónico:**
**PUBLISHED LANGUAGE** - Consume eventos específicos con formato estándar

---

## **🗺️ CONTEXT MAP - RELACIONES ENTRE CONTEXTOS**

### **🔗 GESTIÓN DE TORNEOS ↔ TICKETING Y VENTAS**
**Relación:** Customer/Supplier (Proveedor/Cliente)
**Patrón:** Conformista
**Integración:** 
- Gestión de Torneos (Upstream) define cuándo y cómo crear tickets
- Ticketing (Downstream) escucha TorneoCreado y genera tickets automáticamente
- Validación bidireccional: Tickets válidos permiten acceso a torneos

**Contrato de Integración:**
```javascript
interface ITorneoService {
  obtenerDetallesTorneo(torneoId: string): Promise<DetallesTorneo>;
  validarCapacidadDisponible(torneoId: string): Promise<boolean>;
  reservarCupo(torneoId: string, participanteId: string): Promise<void>;
}
```

### **🔗 GESTIÓN DE TORNEOS ↔ STREAMING Y VISTAS**
**Relación:** Partnership (Asociación)
**Patrón:** Shared Kernel (Kernel Compartido Mínimo)
**Integración:**
- Ambos contextos colaboran mutuamente
- Comparten conceptos: TorneoId, UsuarioId, FechaHora
- Streaming consulta datos de torneos para configurar transmisiones
- Torneos se benefician de métricas de audiencia de streaming

**Elementos Compartidos:**
```javascript
// Shared Value Objects
export class TorneoId {
  constructor(valor) { this.valor = valor; }
  equals(otro) { return this.valor === otro.valor; }
}

export class FechaHora {
  constructor(valor = new Date()) { this.valor = valor; }
  esPosteriorA(otra) { return this.valor > otra.valor; }
}
```

### **🔗 GESTIÓN DE USUARIOS → TODOS LOS CONTEXTOS**
**Relación:** Upstream/Downstream
**Patrón:** Open Host Service (Servicio Anfitrión Abierto)
**Integración:**
- Gestión de Usuarios expone API pública well-defined
- Todos los contextos consumen servicios de autenticación/autorización
- Punto único de verdad para datos de usuarios y permisos

**API Pública:**
```javascript
interface IUsuarioService {
  validarUsuario(usuarioId: string): Promise<ResultadoValidacion>;
  obtenerPermisos(usuarioId: string): Promise<Permiso[]>;
  verificarRol(usuarioId: string, rol: string): Promise<boolean>;
  obtenerPerfil(usuarioId: string): Promise<PerfilUsuario>;
}
```

### **🔗 MONITOREO ← TODOS LOS CONTEXTOS**
**Relación:** Downstream
**Patrón:** Anti-Corruption Layer (Capa Anti-Corrupción)
**Integración:**
- Monitoreo escucha TODOS los eventos de todos los contextos
- Traductor convierte eventos específicos a métricas unificadas
- Protege modelo de monitoreo de cambios en otros contextos

**Traductor de Eventos:**
```javascript
class TraductorEventosMonitoreo {
  traducir(evento, contextoOrigen) {
    return {
      tipoMetrica: this.mapearTipoMetrica(evento),
      entidadId: this.extraerEntidadId(evento),
      valor: this.extraerValor(evento),
      timestamp: evento.fechaOcurrencia,
      contexto: contextoOrigen,
      metadatos: this.extraerMetadatos(evento)
    };
  }
}
```

### **🔗 NOTIFICACIONES ← MÚLTIPLES CONTEXTOS**
**Relación:** Downstream
**Patrón:** Published Language (Lenguaje Publicado)
**Integración:**
- Escucha eventos específicos de varios contextos
- No todos los eventos, solo los relevantes para comunicación
- Transforma eventos a notificaciones según canal y destinatario

**Eventos Consumidos:**
```javascript
const EVENTOS_NOTIFICABLES = {
  'torneos': ['TorneoCreado', 'TorneoIniciado', 'ParticipanteRegistrado'],
  'ticketing': ['VentaConfirmada', 'ReembolsoProcessado'],
  'streaming': ['TransmisionIniciada', 'CapacidadAlcanzada'],
  'monitoreo': ['AlertaGenerada', 'UmbralSuperado']
};
```

---

## **📊 MATRIZ DE DEPENDENCIAS**

### **Dependencias Upstream (Proveedores):**
| Contexto       | Depende de | Tipo Dependencia     | Criticidad |
|----------      |------------|------------------    |------------|
| Torneos        | Usuarios   | Validación identidad | Alta       |
| Ticketing      | Torneos    | Datos evento         | Alta       |
| Ticketing      | Usuarios   | Datos comprador      | Alta       |
| Streaming      | Torneos    | Estado evento        | Media      |
| Streaming      | Usuarios   | Permisos acceso      | Alta       |
| Monitoreo      | Todos      | Eventos sistema      | Baja       |
| Notificaciones | Múltiples  | Eventos específicos  | Media      |

### **Dependencias Downstream (Consumidores):**
| Contexto  | Es consumido por     | Impacto Cambios   | Versionado |
|---------- |------------------    |----------------   |------------|
| Usuarios  | Todos                | Muy Alto          | Estricto   |
| Torneos   | Ticketing, Streaming | Alto              | Controlado |
| Ticketing | Monitoreo            | Bajo              | Flexible   |
| Streaming | Monitoreo            | Bajo              | Flexible   |

---

## **🚀 ESTRATEGIA DE IMPLEMENTACIÓN**

### **Fase 1: Core Foundation (Semana 1-2)**
1. **Gestión de Usuarios** - Base para todos los demás
2. **Gestión de Torneos** - Core business logic
3. **Contratos de integración** básicos

### **Fase 2: Business Features (Semana 3-4)**
1. **Ticketing y Ventas** - Monetización
2. **Streaming y Vistas** - Engagement
3. **Eventos de integración** completos

### **Fase 3: Platform Services (Semana 5-6)**
1. **Monitoreo y Análisis** - Observabilidad
2. **Notificaciones** - Comunicación
3. **Dashboards** y reportes

### **🔧 Consideraciones Técnicas:**

#### **Event-Driven Architecture:**
- **Event Store:** AWS EventBridge + DynamoDB
- **Message Queues:** SQS para delivery garantizado
- **Event Schema Registry:** Para versionado de eventos

#### **API Gateway Pattern:**
- **Single Entry Point:** API Gateway como facade
- **Rate Limiting:** Por contexto y usuario
- **Authentication:** JWT tokens desde contexto Usuarios

#### **Data Consistency:**
- **Eventual Consistency:** Entre contextos via eventos
- **Strong Consistency:** Dentro de cada contexto
- **Saga Pattern:** Para transacciones distribuidas

#### **Deployment Strategy:**
- **Microservices:** Un servicio por contexto
- **Independent Deployment:** Deploy independiente por equipo
- **Database per Service:** Cada contexto su BD

---

## **📋 CHECKLIST DE VALIDACIÓN**

### **✅ Criteria de Calidad Context Map:**
- [ ] **Separación clara** de responsabilidades entre contextos# BOUNDED CONTEXTS - ARQUITECTURA DDD
## Contextos Delimitados y Mapeo de Relaciones - Diseño Estratégico

---

## **🎯 CONTEXTO 1: GESTIÓN DE TORNEOS**
**Responsabilidad:** Gestión completa del ciclo de vida de torneos de e-sports
**Equipo Responsable:** Core Development Team
**Complejidad:** Alta

### **🏗️ Entidades Principales:**
- **Torneo** (Raíz de Agregado)
  - *Atributos:* id, nombre, categoria, tipoJuego, organizadorId, estado
  - *Comportamientos:* crear, confirmar, iniciar, finalizar, cancelar
  - *Invariantes:* mínimo 2 participantes, máximo 2 subadministradores

- **Categoria**
  - *Atributos:* id, descripcion, alias, estaActiva
  - *Comportamientos:* activar, desactivar
  - *Regla:* Solo categorías activas pueden usarse en nuevos torneos

- **TipoJuego**
  - *Atributos:* id, nombreCompleto, cantidadJugadores
  - *Comportamientos:* definir requisitos de jugadores
  - *Validación:* compatible con límite de participantes del torneo

- **Participante**
  - *Atributos:* id, usuarioId, fechaRegistro, estado
  - *Comportamientos:* registrar, confirmar, cancelar, descalificar
  - *Restricción:* un usuario no puede registrarse dos veces en el mismo torneo

- **SubAdministrador**
  - *Atributos:* id, usuarioId, torneoId, permisos
  - *Comportamientos:* asignar, remover, gestionar permisos
  - *Límite:* máximo 2 por torneo

### **📊 Reglas de Negocio Críticas:**
1. Un torneo debe tener mínimo 1 categoría asignada
2. Máximo 2 subadministradores por torneo
3. Límites de participantes según tipo: gratuito (≤50), pago (configurable)
4. Solo organizador puede iniciar/finalizar torneo
5. Estado del torneo sigue flujo: BORRADOR → ABIERTO_REGISTRO → REGISTRO_CERRADO → EN_PROGRESO → FINALIZADO

### **🔄 Eventos Publicados:**
- **TorneoCreado:** Cuando se crea nuevo torneo
- **ParticipanteRegistrado:** Cuando usuario se inscribe
- **TorneoIniciado:** Cuando comienza la competencia
- **TorneoFinalizado:** Cuando termina la competencia
- **TorneoCancelado:** Cuando se cancela antes de finalizar

### **📥 Eventos Consumidos:**
- **UsuarioValidado:** Del contexto Gestión de Usuarios
- **TicketValidado:** Del contexto Ticketing (para torneos pagos)

### **🎯 Métricas Clave:**
- Torneos creados por período
- Tasa de finalización de torneos
- Promedio de participantes por torneo
- Tiempo medio desde creación hasta inicio

---

## **🎫 CONTEXTO 2: TICKETING Y VENTAS**
**Responsabilidad:** Gestión de tickets, ventas y comisiones
**Equipo Responsable:** Payments Team
**Complejidad:** Media-Alta

### **🏗️ Entidades Principales:**
- **Ticket** (Raíz de Agregado)
  - *Atributos:* id, torneoId, compradorId, codigoQR, precio, estado
  - *Comportamientos:* generar, validar, cancelar, reembolsar
  - *Invariantes:* código QR único, una sola validación por ticket

- **Venta**
  - *Atributos:* id, compradorId, tickets, metodoPago, total
  - *Comportamientos:* iniciar, procesar pago, confirmar, cancelar
  - *Estados:* PENDIENTE, PROCESANDO, CONFIRMADA, CANCELADA

- **CodigoQR**
  - *Atributos:* codigo, ticketId, algoritmo, fechaGeneracion
  - *Comportamientos:* generar, validar, invalidar
  - *Seguridad:* algoritmo criptográfico para unicidad global

- **Comision**
  - *Atributos:* id, ventaId, porcentaje, monto, fechaCalculo
  - *Comportamientos:* calcular automáticamente
  - *Reglas:* 5% Amateur, 8% Profesional, 10% Eventos especiales

- **EtapaVenta**
  - *Atributos:* id, torneoId, nombre, fechaInicio, fechaFin, precio
  - *Comportamientos:* crear, activar, desactivar
  - *Validación:* fechas no pueden solaparse entre etapas

### **📊 Reglas de Negocio Críticas:**
1. Cada ticket tiene código QR único e irrepetible globalmente
2. Comisiones calculadas automáticamente según categoría del torneo
3. Etapas de venta con precios diferenciados y fechas no solapadas
4. Tickets reembolsables hasta 24 horas antes del evento
5. Validación única por ticket en punto de acceso

### **🔄 Eventos Publicados:**
- **TicketGenerado:** Cuando se crea nuevo ticket
- **VentaConfirmada:** Cuando pago se procesa exitosamente
- **ComisionCalculada:** Cuando se determina ganancia plataforma
- **TicketValidado:** Cuando se usa ticket para acceso
- **ReembolsoProcessado:** Cuando se cancela ticket

### **📥 Eventos Consumidos:**
- **TorneoCreado:** Para auto-generar plantilla de tickets
- **TorneoCancelado:** Para iniciar proceso de reembolsos automático
- **UsuarioValidado:** Para verificar comprador

### **🎯 Métricas Clave:**
- Revenue total y por categoría
- Tasa de conversión venta iniciada → confirmada
- Promedio de tickets por transacción
- Tasa de reembolsos por categoría

---

## **📺 CONTEXTO 3: STREAMING Y VISTAS**
**Responsabilidad:** Gestión de transmisiones y control de audiencia
**Equipo Responsable:** Media Team
**Complejidad:** Media

### **🏗️ Entidades Principales:**
- **VistaTorneo** (Raíz de Agregado)
  - *Atributos:* id, torneoId, creadorId, plataforma, limiteEspectadores
  - *Comportamientos:* crear, configurar, iniciar transmisión, finalizar
  - *Restricción:* usuario registrado máximo 1 vista gratuita

- **Plataforma**
  - *Atributos:* id, nombre, tipo, configuracionAPI, estaActiva
  - *Comportamientos:* integrar, validar conexión, desconectar
  - *Tipos:* Twitch, Discord, YouTube, Zoom, Meet

- **Espectador**
  - *Atributos:* id, usuarioId, vistaId, tiempoConexion, tipoAcceso
  - *Comportamientos:* unirse, desconectarse, cambiar a premium
  - *Métricas:* tiempo visualización, interacciones

- **Transmision**
  - *Atributos:* id, vistaId, horaInicio, horaFin, estadoTransmision
  - *Comportamientos:* iniciar, pausar, reanudar, finalizar
  - *Estados:* CREADA, EN_VIVO, PAUSADA, FINALIZADA

### **📊 Reglas de Negocio Críticas:**
1. Usuario registrado: máximo 1 evento gratuito
2. Límite de espectadores configurable por transmisión
3. Integración simultánea con múltiples plataformas
4. Control de acceso diferenciado: gratuito, pagado, VIP
5. Métricas de audiencia en tiempo real

### **🔄 Eventos Publicados:**
- **VistaCreada:** Cuando se configura nueva transmisión
- **TransmisionIniciada:** Cuando stream va en vivo
- **EspectadorUnido:** Cuando usuario se conecta
- **CapacidadAlcanzada:** Cuando se llega al límite de espectadores
- **TransmisionFinalizada:** Cuando termina el stream

### **📥 Eventos Consumidos:**
- **TorneoIniciado:** Para habilitar inicio automático de transmisión
- **TorneoFinalizado:** Para finalizar transmisiones asociadas
- **UsuarioValidado:** Para verificar permisos de espectador

### **🎯 Métricas Clave:**
- Espectadores únicos por transmisión
- Tiempo promedio de visualización
- Picos de audiencia por torneo
- Tasa de conversión espectador gratuito → pagado

---

## **👤 CONTEXTO 4: GESTIÓN DE USUARIOS**
**Responsabilidad:** Autenticación, autorización y gestión de perfiles
**Equipo Responsable:** Identity & Access Team
**Complejidad:** Media

### **🏗️ Entidades Principales:**
- **Usuario** (Raíz de Agregado)
  - *Atributos:* id, email, rol, permisos, estaActivo, fechaCreacion
  - *Comportamientos:* registrar, autenticar, asignar rol, bloquear
  - *Validación:* email único, contraseña segura

- **Rol**
  - *Atributos:* id, nombre, descripcion, permisos
  - *Comportamientos:* crear, modificar, asignar permisos
  - *Tipos:* Organizador, Participante, Espectador, Administrador

- **Permiso**
  - *Atributos:* id, recurso, accion, contexto
  - *Comportamientos:* conceder, revocar, verificar
  - *Granularidad:* por contexto y operación específica

- **Sesion**
  - *Atributos:* id, usuarioId, tokenJWT, fechaCreacion, fechaExpiracion
  - *Comportamientos:* crear, validar, renovar, expirar
  - *Seguridad:* tokens con expiración automática 24h

### **📊 Reglas de Negocio Críticas:**
1. Email único por usuario en toda la plataforma
2. Roles diferenciados con permisos granulares por contexto
3. Sesiones JWT con expiración y renovación automática
4. Bloqueo automático tras 5 intentos fallidos de login
5. Configuración de privacidad personalizable por usuario

### **🔄 Eventos Publicados:**
- **UsuarioRegistrado:** Cuando se crea nueva cuenta
- **RolAsignado:** Cuando se cambia rol de usuario
- **SesionIniciada:** Cuando usuario se autentica
- **CuentaBloqueada:** Cuando se detectan intentos maliciosos
- **PerfilActualizado:** Cuando usuario modifica información

### **📥 Eventos Consumidos:**
- **TorneoCreado:** Para validar permisos del organizador
- **VentaIniciada:** Para verificar identidad del comprador

### **🎯 Métricas Clave:**
- Usuarios registrados por período
- Tasa de activación de cuentas
- Tiempo promedio de sesión
- Intentos de login fallidos

### **🌐 Patrón Arquitectónico:**
**OPEN HOST SERVICE** - Expone API pública bien definida que consumen todos los demás