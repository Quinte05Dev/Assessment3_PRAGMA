# UBIQUITOUS LANGUAGE - PLATAFORMA TORNEOS E-SPORTS
## Diccionario de Términos del Dominio - Arquitectura DDD

---

## **🏆 CONTEXTO: GESTIÓN DE TORNEOS**

### **Términos Fundamentales:**

**TORNEO**
- *Definición:* Competencia estructurada de videojuegos con reglas definidas, participantes limitados y un organizador responsable.
- *Sinónimos:* Competencia, Championship, Tournament
- *Ejemplo:* "El torneo de League of Legends tiene un límite de 64 participantes"

**ORGANIZADOR**
- *Definición:* Usuario con permisos para crear, configurar y gestionar torneos. Responsable final del evento.
- *Responsabilidades:* Crear torneo, definir reglas, asignar subadministradores, iniciar/finalizar competencia
- *Límites:* Puede organizar múltiples torneos simultáneamente

**SUBADMINISTRADOR**
- *Definición:* Usuario designado por el organizador para asistir en la gestión del torneo.
- *Límites:* Máximo 2 por torneo, no puede ser el mismo organizador
- *Permisos:* Gestionar participantes, resolver disputas, no puede eliminar torneo

**PARTICIPANTE**
- *Definición:* Usuario registrado activamente en un torneo específico.
- *Estados:* Registrado, Confirmado, Cancelado, Descalificado
- *Reglas:* No puede participar dos veces en el mismo torneo

**CATEGORIA**
- *Definición:* Clasificación del nivel o tipo de competencia (Amateur, Profesional, Juvenil)
- *Características:* Puede activarse/desactivarse, afecta precio y reglas
- *Ejemplo:* Categoría "Profesional" para torneos con premio monetario

**TIPO DE JUEGO**
- *Definición:* Videojuego específico y configuración de jugadores para el torneo
- *Atributos:* Nombre completo, cantidad de jugadores requeridos
- *Ejemplo:* "Counter-Strike 2" requiere 10 jugadores (5vs5)

### **Estados y Transiciones:**

**ESTADOS DE TORNEO**
```
BORRADOR → ABIERTO_REGISTRO → REGISTRO_CERRADO → EN_PROGRESO → FINALIZADO
                                              ↘ CANCELADO
```

**ESTADOS DE PARTICIPANTE**
```
REGISTRADO → CONFIRMADO
           ↘ CANCELADO
           ↘ DESCALIFICADO
```

---

## **🎫 CONTEXTO: TICKETING Y VENTAS**

### **Términos Fundamentales:**

**TICKET**
- *Definición:* Comprobante digital que otorga acceso a un torneo o transmisión
- *Características:* Código QR único, precio, fecha de compra, estado
- *Validación:* Una sola vez por evento, no reutilizable

**CÓDIGO QR**
- *Definición:* Identificador visual único generado para cada ticket
- *Función:* Validación de acceso en punto de entrada
- *Seguridad:* Irrepetible, con algoritmo de verificación

**VENTA**
- *Definición:* Transacción completa que incluye uno o más tickets
- *Componentes:* Comprador, items, método de pago, total, comisión
- *Estados:* Pendiente, Confirmada, Cancelada, Reembolsada

**ETAPA DE VENTA**
- *Definición:* Período con precio específico para tickets del torneo
- *Ejemplo:* "Early Bird" (precio reducido), "Regular", "Last Minute"
- *Reglas:* Fechas no pueden solaparse, precios generalmente incrementales

**COMISION**
- *Definición:* Porcentaje cobrado por la plataforma en cada venta
- *Cálculo:* Automático según categoría del torneo (5-10%)
- *Destinatario:* Plataforma como intermediario

---

## **📺 CONTEXTO: STREAMING Y VISTAS**

### **Términos Fundamentales:**

**VISTA DE TORNEO**
- *Definición:* Transmisión en vivo o diferida de un torneo específico
- *Creador:* Usuario que configura y gestiona la transmisión
- *Límites:* Usuario registrado puede crear máximo 1 vista gratuita

**TRANSMISION**
- *Definición:* Sesión activa de streaming con audiencia en tiempo real
- *Estados:* Creada, En Vivo, Pausada, Finalizada
- *Métricas:* Espectadores actuales, duración, picos de audiencia

**PLATAFORMA DE STREAMING**
- *Definición:* Servicio externo para transmitir (Twitch, Discord, YouTube)
- *Integración:* APIs específicas para cada plataforma
- *Configuración:* Keys, URLs, parámetros técnicos

**ESPECTADOR**
- *Definición:* Usuario que visualiza una transmisión
- *Tipos:* Gratuito, Pagado, VIP
- *Límites:* Por transmisión según configuración del creador

**LÍMITE DE ESPECTADORES**
- *Definición:* Cantidad máxima de usuarios que pueden ver simultáneamente
- *Configuración:* Definida por creador de la vista
- *Control:* Sistema rechaza conexiones adicionales automáticamente

---

## **👤 CONTEXTO: GESTIÓN DE USUARIOS**

### **Términos Fundamentales:**

**USUARIO**
- *Definición:* Persona registrada en la plataforma con credenciales únicas
- *Identificación:* Email único, ID interno del sistema
- *Estados:* Activo, Inactivo, Bloqueado

**ROL**
- *Definición:* Conjunto de permisos y responsabilidades asignadas a un usuario
- *Tipos:* Organizador, Participante, Espectador, Administrador
- *Característica:* Un usuario puede tener múltiples roles

**PERMISO**
- *Definición:* Autorización específica para realizar una acción en el sistema
- *Granularidad:* Por contexto (crear_torneo, validar_ticket, gestionar_stream)
- *Herencia:* Los roles agrupan permisos relacionados

**SESION**
- *Definición:* Período autenticado de un usuario en la plataforma
- *Token:* JWT con información del usuario y expiración
- *Duración:* 24 horas por defecto, renovable

**AUTENTICACION**
- *Definición:* Proceso de verificación de identidad del usuario
- *Métodos:* Email/password, OAuth (Google, Facebook), SSO
- *Seguridad:* Bloqueo automático tras 5 intentos fallidos

---

## **📊 CONTEXTO: MONITOREO Y ANÁLISIS**

### **Términos Fundamentales:**

**MÉTRICA**
- *Definición:* Medición cuantitativa de una actividad o estado del sistema
- *Tipos:* Contadores, Gauges, Histogramas, Timers
- *Agregación:* Por hora, día, semana, mes

**ALERTA**
- *Definición:* Notificación automática cuando una métrica supera un umbral
- *Configuración:* Condición, umbral, destinatarios, canal
- *Estados:* Activa, Pausada, Resuelta

**DASHBOARD**
- *Definición:* Visualización gráfica de métricas agrupadas por tema
- *Usuarios:* Organizadores (sus torneos), Admins (sistema completo)
- *Actualización:* Tiempo real o períodos configurables

**TRAZABILIDAD**
- *Definición:* Registro detallado de todas las acciones del sistema
- *Propósito:* Auditoría, debugging, análisis de comportamiento
- *Retención:* Configurable por tipo de evento

---

## **🔔 CONTEXTO: NOTIFICACIONES**

### **Términos Fundamentales:**

**NOTIFICACION**
- *Definición:* Mensaje dirigido a usuario específico sobre evento relevante
- *Tipos:* Informativa, Advertencia, Error, Confirmación
- *Estados:* Pendiente, Enviada, Fallida, Programada

**CANAL DE NOTIFICACION**
- *Definición:* Medio por el cual se envía una notificación
- *Tipos:* Email, SMS, Push, In-App
- *Configuración:* Límites de envío, horarios permitidos

**PLANTILLA**
- *Definición:* Formato predefinido para notificaciones de un tipo de evento
- *Variables:* Campos reemplazables con datos específicos del evento
- *Personalización:* Por rol de usuario y preferencias

**PREFERENCIAS DE NOTIFICACION**
- *Definición:* Configuración personal del usuario sobre qué y cómo recibir notificaciones
- *Granularidad:* Por tipo de evento y canal
- *Horario No Molestar:* Períodos donde no se envían notificaciones

---

## **🔗 TÉRMINOS TRANSVERSALES (SHARED KERNEL)**

### **Identificadores:**

**TORNEO ID**
- *Formato:* UUID v4
- *Ejemplo:* "550e8400-e29b-41d4-a716-446655440000"
- *Uso:* Referencia única across todos los contextos

**USUARIO ID**
- *Origen:* Cognito User Pool
- *Formato:* String alfanumérico
- *Inmutabilidad:* Nunca cambia durante vida del usuario

### **Valores Temporales:**

**FECHA HORA**
- *Formato:* ISO 8601 UTC
- *Ejemplo:* "2024-03-15T14:30:00Z"
- *Precisión:* Segundos (suficiente para el dominio)

**PERIODO**
- *Definición:* Intervalo de tiempo con inicio y fin
- *Validación:* Inicio debe ser anterior al fin
- *Uso:* Etapas de venta, horarios de transmisión

### **Valores Monetarios:**

**DINERO**
- *Componentes:* Cantidad + Moneda
- *Moneda Base:* USD (configurable por región)
- *Precisión:* 2 decimales para divisas tradicionales

**PRECIO**
- *Definición:* Valor monetario de un producto/servicio
- *Validación:* No puede ser negativo
- *Contexto:* Tickets, comisiones, premios

---

## **📝 REGLAS DE LENGUAJE**

### **Convenciones de Nombrado:**

**Eventos de Dominio:**
- *Formato:* Sustantivo + Verbo en Pasado
- *Ejemplos:* TorneoCreado, ParticipanteRegistrado, TicketValidado
- *Idioma:* Español para mejor comprensión del negocio

**Comandos:**
- *Formato:* Verbo + Sustantivo
- *Ejemplos:* CrearTorneo, RegistrarParticipante, ValidarTicket
- *Intención:* Acción que el usuario quiere realizar

**Value Objects:**
- *Formato:* Sustantivo descriptivo
- *Ejemplos:* TorneoId, NombreTorneo, LimiteParticipantes
- *Característica:* Inmutables, definidos por su valor

### **Términos Prohibidos:**

**EVITAR:**
- "Registro" (ambiguo) → Usar "Participante" o "Usuario"
- "Evento" (genérico) → Usar "Torneo" o "EventoDominio"
- "Item" (vago) → Usar "Ticket", "Producto", específico
- "Data" (técnico) → Usar "Información", "Datos"

### **Sinónimos Controlados:**

**COMPETENCIA = TORNEO**
- Ambos términos son válidos
- Preferir "Torneo" en código y documentación técnica
- "Competencia" en comunicación con usuarios finales

**JUGADOR = PARTICIPANTE**
- "Participante" en contexto de sistema
- "Jugador" en contexto de videojuego específico

---

## **🎯 VALIDACIÓN DEL LENGUAJE**

### **Criterios de Calidad:**

1. **Precisión:** Cada término tiene una definición única y clara
2. **Consistencia:** Mismo término usado uniformemente en todo el sistema
3. **Comprensibilidad:** Stakeholders del negocio entienden sin explicación técnica
4. **Completitud:** Cubre todos los conceptos importantes del dominio
5. **Evolución:** Puede crecer con nuevos requerimientos sin ambigüedad

### **Proceso de Mantenimiento:**

1. **Revisión Mensual:** Evaluar nuevos términos propuestos
2. **Validación con Negocio:** Confirmar definiciones con domain experts
3. **Actualización Código:** Refactoring cuando cambia terminología
4. **Documentación:** Mantener diccionario actualizado y accesible

