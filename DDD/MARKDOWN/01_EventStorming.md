# EVENT STORMING - PLATAFORMA TORNEOS E-SPORTS
## Mapeo Completo de Eventos del Dominio - Arquitectura DDD

---

## **📋 METODOLOGÍA EVENT STORMING**

### **Objetivo:**
Identificar todos los eventos significativos que ocurren en el dominio de torneos de e-sports, estableciendo el flujo temporal y las relaciones entre diferentes actores y procesos.

### **Participantes del Ejercicio:**
- **Domain Expert:** Organizador de torneos experimentado
- **Technical Lead:** Desarrollador senior con conocimiento DDD
- **Business Analyst:** Analista de requerimientos del negocio
- **Product Owner:** Responsable de la visión del producto

---

## **🎯 EVENTOS IDENTIFICADOS (Orden Cronológico)**

### **📊 GESTIÓN DE TORNEOS**

#### **Eventos Principales:**
1. **TorneoCreado**
   - *Cuándo:* Organizador completa formulario de creación
   - *Datos:* torneoId, organizadorId, nombre, categoriaId, tipoJuegoId
   - *Regla de Negocio:* Categoría debe estar activa

2. **CategoriaAsignada**
   - *Cuándo:* Se confirma la categoría del torneo
   - *Datos:* torneoId, categoriaId, restricciones
   - *Impacto:* Afecta precios de tickets y reglas de participación

3. **TipoJuegoSeleccionado**
   - *Cuándo:* Se define qué videojuego se jugará
   - *Datos:* torneoId, tipoJuegoId, cantidadJugadores
   - *Validación:* Debe ser compatible con límite de participantes

4. **ResponsableAsignado**
   - *Cuándo:* Se confirma el organizador principal
   - *Datos:* torneoId, organizadorId, fechaAsignacion
   - *Restricción:* Solo un responsable principal por torneo

5. **SubAdministradorAñadido**
   - *Cuándo:* Organizador delega responsabilidades
   - *Datos:* torneoId, subAdminId, permisos, organizadorId
   - *Límite:* Máximo 2 subadministradores por torneo

6. **LimiteParticipantesDefinido**
   - *Cuándo:* Se establece capacidad máxima
   - *Datos:* torneoId, limite, tipoTorneo (gratuito/pago)
   - *Reglas:* Gratuito max 50, pago sin límite específico

7. **EtapaVentaCreada**
   - *Cuándo:* Se configura período de venta específico
   - *Datos:* etapaId, torneoId, fechaInicio, fechaFin, precio
   - *Validación:* Fechas no pueden solaparse

8. **ParticipanteRegistrado**
   - *Cuándo:* Usuario se inscribe exitosamente
   - *Datos:* participanteId, usuarioId, torneoId, fechaRegistro
   - *Prerrequisito:* Validación de capacidad y permisos

9. **TorneoConfirmado**
   - *Cuándo:* Organizador confirma que está listo
   - *Datos:* torneoId, fechaConfirmacion, estadoAnterior
   - *Efecto:* Cambia estado a ABIERTO_REGISTRO

10. **TorneoIniciado**
    - *Cuándo:* Se da inicio oficial a la competencia
    - *Datos:* torneoId, fechaInicio, cantidadParticipantes
    - *Prerrequisito:* Mínimo 2 participantes confirmados

11. **ResultadoRegistrado**
    - *Cuándo:* Se registra resultado de una partida/fase
    - *Datos:* partidaId, torneoId, ganadorId, puntuacion
    - *Actor:* Organizador o subadministrador

12. **TorneoFinalizado**
    - *Cuándo:* Se completa toda la competencia
    - *Datos:* torneoId, ganadorId, fechaFinalizacion, ranking
    - *Efecto:* Libera recursos y genera reportes finales

#### **Eventos de Excepción:**
13. **ParticipanteDescalificado**
    - *Cuándo:* Se remueve participante por infracción
    - *Datos:* participanteId, torneoId, razon, responsableId

14. **TorneoCancelado**
    - *Cuándo:* Se cancela antes de finalizar
    - *Datos:* torneoId, razon, fechaCancelacion
    - *Efecto:* Activa proceso de reembolsos

---

### **🎫 TICKETING Y VENTAS**

#### **Eventos de Venta:**
15. **TicketGenerado**
    - *Cuándo:* Se crea ticket automáticamente o manualmente
    - *Datos:* ticketId, torneoId, tipoTicket, codigoQR
    - *Origen:* TorneoCreado o solicitud manual

16. **CodigoQRCreado**
    - *Cuándo:* Se genera código único para ticket
    - *Datos:* codigoQR, ticketId, algoritmoUsado
    - *Unicidad:* Debe ser globalmente único

17. **VentaIniciada**
    - *Cuándo:* Usuario comienza proceso de compra
    - *Datos:* ventaId, compradorId, ticketsSeleccionados
    - *Timeout:* Se cancela automáticamente en 15 minutos

18. **PagoProcessado**
    - *Cuándo:* Se confirma pago exitoso
    - *Datos:* pagoId, ventaId, metodoPago, monto
    - *Integración:* Con pasarela de pagos externa

19. **ComisionCalculada**
    - *Cuándo:* Se determina ganancia de la plataforma
    - *Datos:* comisionId, ventaId, porcentaje, monto
    - *Regla:* 5% categoría Amateur, 8% Profesional

20. **TicketValidado**
    - *Cuándo:* Se verifica ticket en punto de acceso
    - *Datos:* ticketId, puntoAcceso, fechaValidacion
    - *Restricción:* Solo una validación por ticket

21. **AccesoAutorizado**
    - *Cuándo:* Ticket válido permite ingreso
    - *Datos:* ticketId, usuarioId, eventoAcceso
    - *Registro:* Para auditoría y métricas

22. **TicketCancelado**
    - *Cuándo:* Se anula ticket por reembolso
    - *Datos:* ticketId, razon, fechaCancelacion
    - *Efecto:* Libera cupo en torneo

---

### **📺 STREAMING Y VISTAS**

#### **Eventos de Transmisión:**
23. **VistaCreada**
    - *Cuándo:* Usuario configura transmisión del torneo
    - *Datos:* vistaId, creadorId, torneoId, tipoAcceso
    - *Límite:* 1 vista gratuita por usuario registrado

24. **PlataformaIntegrada**
    - *Cuándo:* Se conecta con servicio externo (Twitch/Discord)
    - *Datos:* integracionId, vistaId, plataforma, configuracion
    - *Validación:* Credenciales y permisos de API

25. **TransmisionIniciada**
    - *Cuándo:* Se activa stream en vivo
    - *Datos:* transmisionId, vistaId, fechaInicio, urlStream
    - *Prerrequisito:* Vista configurada correctamente

26. **EspectadorUnido**
    - *Cuándo:* Usuario se conecta a la transmisión
    - *Datos:* espectadorId, usuarioId, transmisionId
    - *Validación:* Verificar límites de capacidad

27. **EspectadorDesconectado**
    - *Cuándo:* Usuario abandona la transmisión
    - *Datos:* espectadorId, tiempoVisualizacion, razonSalida
    - *Efecto:* Libera espacio para nuevos espectadores

28. **TransmisionFinalizada**
    - *Cuándo:* Se termina el stream
    - *Datos:* transmisionId, duracion, pico máximo espectadores
    - *Métricas:* Para análisis posterior

29. **CapacidadLimiteAlcanzada**
    - *Cuándo:* Se alcanza máximo de espectadores simultáneos
    - *Datos:* transmisionId, limiteConfigurado, fechaEvento
    - *Efecto:* Rechaza nuevas conexiones

---

### **📊 MONITOREO Y ALERTAS**

#### **Eventos de Sistema:**
30. **MetricaRegistrada**
    - *Cuándo:* Se captura cualquier medición del sistema
    - *Datos:* metricaId, tipo, valor, timestamp, entidadId
    - *Frecuencia:* Continua, según configuración

31. **UmbralSuperado**
    - *Cuándo:* Métrica excede límite configurado
    - *Datos:* alertaId, metricaId, umbral, valorActual
    - *Respuesta:* Activa proceso de notificación

32. **AlertaGenerada**
    - *Cuándo:* Sistema detecta condición que requiere atención
    - *Datos:* alertaId, tipo, severidad, descripcion
    - *Destinatarios:* Según configuración de roles

33. **NotificacionEnviada**
    - *Cuándo:* Se transmite alerta a destinatario
    - *Datos:* notificacionId, destinatario, canal, contenido
    - *Tracking:* Para verificar entrega exitosa

34. **IrregularidadDetectada**
    - *Cuándo:* Se identifica comportamiento anómalo
    - *Datos:* irregularidadId, tipoAnomalia, entidadAfectada
    - *Ejemplos:* Múltiples registros mismo usuario, patrones bot

35. **LinkBloqueado**
    - *Cuándo:* Se deshabilita acceso por irregularidad
    - *Datos:* linkId, razonBloqueo, responsable
    - *Efecto:* Previene acceso no autorizado

36. **ReporteGenerado**
    - *Cuándo:* Se produce informe automático o manual
    - *Datos:* reporteId, tipo, fechaGeneracion, datos
    - *Tipos:* Financiero, participación, audiencia

---

### **👥 USUARIOS Y ACCESOS**

#### **Eventos de Gestión de Usuarios:**
37. **UsuarioRegistrado**
    - *Cuándo:* Nueva cuenta creada en plataforma
    - *Datos:* usuarioId, email, rolInicial, fechaRegistro
    - *Validación:* Email único, términos aceptados

38. **RolAsignado**
    - *Cuándo:* Se otorga o cambia rol de usuario
    - *Datos:* usuarioId, rolAnterior, rolNuevo, asignadorId
    - *Tipos:* Organizador, Participante, Espectador

39. **PermisosConcedidos**
    - *Cuándo:* Se autorizan acciones específicas
    - *Datos:* permisoId, usuarioId, recurso, accion
    - *Granularidad:* Por contexto y operación

40. **SesionIniciada**
    - *Cuándo:* Usuario se autentica exitosamente
    - *Datos:* sesionId, usuarioId, tokenJWT, fechaInicio
    - *Seguridad:* IP, user-agent para tracking

41. **TokenValidado**
    - *Cuándo:* Se verifica autenticidad de sesión
    - *Datos:* tokenId, usuarioId, recursoAccedido
    - *Frecuencia:* En cada request protegido

42. **AccesoDenegado**
    - *Cuándo:* Se rechaza solicitud por falta de permisos
    - *Datos:* usuarioId, recursoSolicitado, razonRechazo
    - *Seguridad:* Para detección de intentos maliciosos

---

## **🔄 FLUJOS CRÍTICOS IDENTIFICADOS**

### **FLUJO 1: Creación y Lanzamiento de Torneo Pago**
```
UsuarioRegistrado → RolAsignado(Organizador) → TorneoCreado → 
CategoriaAsignada → TipoJuegoSeleccionado → LimiteParticipantesDefinido → 
EtapaVentaCreada → TicketGenerado → TorneoConfirmado → 
ParticipanteRegistrado → VentaIniciada → PagoProcessado → 
ComisionCalculada → TorneoIniciado → ResultadoRegistrado → TorneoFinalizado
```

### **FLUJO 2: Registro en Torneo Gratuito**
```
TorneoCreado → LimiteParticipantesDefinido → TorneoConfirmado → 
ParticipanteRegistrado → CapacidadLimiteAlcanzada → 
AccesoDenegado (nuevos participantes) → TorneoIniciado
```

### **FLUJO 3: Vista de Streaming con Audiencia Pagada**
```
TorneoCreado → VistaCreada → PlataformaIntegrada → 
TicketGenerado(acceso stream) → VentaIniciada → PagoProcessado → 
TransmisionIniciada → EspectadorUnido → CapacidadLimiteAlcanzada → 
TransmisionFinalizada → ReporteGenerado
```

### **FLUJO 4: Monitoreo y Respuesta a Incidentes**
```
MetricaRegistrada → UmbralSuperado → AlertaGenerada → 
NotificacionEnviada → IrregularidadDetectada → LinkBloqueado → 
ReporteGenerado
```

---

## **🎭 ACTORS Y COMANDOS IDENTIFICADOS**

### **ORGANIZADOR**
- **Comandos que ejecuta:**
  - CrearTorneo, AsignarSubAdministrador, ConfigurarLimites
  - CrearEtapaVenta, IniciarTorneo, FinalizarTorneo
  - RegistrarResultado, GenerarReporte

### **PARTICIPANTE**
- **Comandos que ejecuta:**
  - RegistrarseEnTorneo, ComprarTicket, ConfirmarParticipacion
  - AccederTorneo, ValidarCodigoQR

### **ESPECTADOR**
- **Comandos que ejecuta:**
  - UnirseAVista, ComprarAccesoStream, VerTransmisionGratuita
  - SalirDeTransmision

### **SUBADMINISTRADOR**
- **Comandos que ejecuta:**
  - GestionarParticipantes, RegistrarResultados, ResolverDisputa
  - EnviarNotificaciones

### **SISTEMA AUTOMATIZADO**
- **Comandos que ejecuta:**
  - ValidarCapacidad, CalcularComision, GenerarMetricas
  - DetectarIrregularidades, BloquearAcceso, EnviarAlertas

---

## **⚠️ EVENTOS DE EXCEPCIÓN Y COMPENSACIÓN**

### **Manejo de Errores:**
1. **PagoFallido** → CancelarVenta → LiberarTickets
2. **TransmisionInterrumpida** → NotificarEspectadores → ReintentarConexion
3. **CapacidadExcedida** → RechazarNuevoIngreso → NotificarEnListaEspera
4. **IrregularidadDetectada** → BloquearUsuario → NotificarAdministradores

### **Procesos de Compensación:**
1. **TorneoCancelado** → IniciarReembolsos → NotificarParticipantes
2. **TicketDuplicado** → InvalidarDuplicados → CompensarAfectados
3. **ErrorSistema** → RestaurarEstadoAnterior → NotificarIncidencia

---

## **📈 MÉTRICAS Y KPIS DERIVADOS**

### **Métricas de Negocio:**
- Torneos creados por día/semana/mes
- Tasa de conversión registro → participación confirmada
- Revenue por torneo y por categoría
- Tiempo promedio desde creación hasta inicio de torneo

### **Métricas de Producto:**
- Espectadores únicos por transmisión
- Tiempo promedio de visualización
- Tasa de reembolsos por categoría de torneo
- Satisfacción del organizador (NPS)

### **Métricas Técnicas:**
- Tiempo de respuesta promedio por operación
- Tasa de errores por endpoint
- Disponibilidad del sistema (uptime)
- Eventos procesados por segundo

---

## **🔍 INSIGHTS Y OPORTUNIDADES IDENTIFICADAS**

### **Patrones Emergentes:**
1. **Estacionalidad:** Picos de torneos en fines de semana
2. **Categorización:** Torneos profesionales tienen mayor engagement
3. **Integración:** Múltiples plataformas aumentan audiencia
4. **Monetización:** Streaming pagado complementa tickets

### **Puntos de Fricción:**
1. **Complejidad registro:** Muchos pasos para confirmar participación
2. **Límites técnicos:** Capacidad streaming limita crecimiento
3. **Gestión manual:** Organizadores requieren herramientas más simples
4. **Fragmentación:** Datos dispersos entre contextos

### **Oportunidades de Mejora:**
1. **Automatización:** Flujos de confirmación más simples
2. **Inteligencia:** Recomendaciones basadas en historial
3. **Escalabilidad:** Infraestructura elástica para picos
4. **Analytics:** Dashboards predictivos para organizadores
