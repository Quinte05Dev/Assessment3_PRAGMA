# language: es
Característica: Gestionar Participantes del Torneo
  Como organizador de torneos
  Quiero gestionar los participantes de mis torneos
  Para controlar quien puede participar en la competencia

  Antecedentes:
    Dado que existe un torneo "Copa de Primavera 2024"
    Y el torneo tiene estado "ABIERTO_REGISTRO"
    Y el torneo tiene límite de 20 participantes
    Y soy el organizador del torneo
    Y existen los siguientes usuarios registrados:
      | usuarioId        | email                | rol          |
      | user-001         | juan@test.com        | Participante |
      | user-002         | maria@test.com       | Participante |
      | user-003         | carlos@test.com      | Participante |

  @happy-path
  Escenario: Registrar participante exitosamente
    Dado que el usuario "user-001" no está registrado en el torneo
    Y el torneo puede aceptar más participantes
    Cuando registro al usuario "user-001" como participante
    Entonces el participante se registra exitosamente
    Y el participante tiene estado "REGISTRADO"
    Y el evento "ParticipanteRegistrado" es publicado
    Y la cantidad de participantes aumenta en 1

  @validation
  Escenario: Rechazar participante duplicado
    Dado que el usuario "user-001" ya está registrado en el torneo
    Cuando intento registrar al usuario "user-001" como participante
    Entonces recibo un error de validación
    Y el mensaje de error contiene "ya está registrado"
    Y la cantidad de participantes no cambia

  @business-rules
  Escenario: Rechazar participante cuando se alcanza el límite
    Dado que el torneo tiene 20 participantes registrados
    Y el límite de participantes es 20
    Cuando intento registrar al usuario "user-002" como participante
    Entonces recibo un error de negocio
    Y el mensaje de error contiene "límite de participantes"
    Y el usuario "user-002" no queda registrado

  @state-validation
  Escenario: Rechazar registro cuando torneo no está abierto
    Dado que el torneo tiene estado "REGISTRO_CERRADO"
    Cuando intento registrar al usuario "user-001" como participante
    Entonces recibo un error de estado
    Y el mensaje de error contiene "no está abierto para registro"

  @happy-path
  Escenario: Confirmar participación de participante registrado
    Dado que el usuario "user-001" está registrado en el torneo
    Y el participante tiene estado "REGISTRADO"
    Cuando confirmo la participación del usuario "user-001"
    Entonces el participante cambia a estado "CONFIRMADO"
    Y el evento "ParticipanteConfirmado" es publicado

  @business-rules
  Escenario: Cancelar participante por solicitud propia
    Dado que el usuario "user-001" está registrado en el torneo
    Cuando el usuario "user-001" cancela su participación
    Entonces el participante cambia a estado "CANCELADO"
    Y el evento "ParticipanteCancelado" es publicado
    Y la razón de cancelación es "Cancelación voluntaria"
    Y la cantidad de participantes disminuye en 1

  @business-rules
  Escenario: Descalificar participante por infracción
    Dado que el usuario "user-001" está registrado en el torneo
    Y el participante tiene estado "CONFIRMADO"
    Cuando descalifico al usuario "user-001" por "Comportamiento inapropiado"
    Entonces el participante cambia a estado "DESCALIFICADO"
    Y el evento "ParticipanteDescalificado" es publicado
    Y la razón de descalificación es "Comportamiento inapropiado"

  @integration
  Escenario: Registrar múltiples participantes en lote
    Dado que tengo una lista de usuarios válidos:
      | usuarioId | email              |
      | user-004  | ana@test.com       |
      | user-005  | luis@test.com      |
      | user-006  | sofia@test.com     |
    Y todos los usuarios tienen rol "Participante"
    Cuando registro a todos los usuarios en lote
    Entonces todos los participantes se registran exitosamente
    Y cada participante tiene estado "REGISTRADO"
    Y se publican 3 eventos "ParticipanteRegistrado"
    Y la cantidad total de participantes es 3

  @business-rules
  Escenario: Validar participantes mínimos antes de iniciar torneo
    Dado que el torneo tiene 1 participante confirmado
    Y el tipo de juego requiere mínimo 2 jugadores
    Cuando intento iniciar el torneo
    Entonces recibo un error de validación
    Y el mensaje de error contiene "mínimo 2 participantes"
    Y el torneo mantiene estado "ABIERTO_REGISTRO"

  @happy-path
  Escenario: Iniciar torneo con participantes suficientes
    Dado que el torneo tiene los siguientes participantes confirmados:
      | usuarioId | estado     |
      | user-001  | CONFIRMADO |
      | user-002  | CONFIRMADO |
      | user-003  | CONFIRMADO |
    Y el tipo de juego requiere mínimo 2 jugadores
    Cuando inicio el torneo
    Entonces el torneo cambia a estado "EN_PROGRESO"
    Y el evento "TorneoIniciado" es publicado
    Y el evento contiene cantidad de participantes: 3

  @query-operations
  Escenario: Consultar estadísticas de participación
    Dado que el torneo tiene los siguientes participantes:
      | usuarioId | estado        |
      | user-001  | CONFIRMADO    |
      | user-002  | REGISTRADO    |
      | user-003  | CANCELADO     |
      | user-004  | DESCALIFICADO |
    Cuando consulto las estadísticas de participación
    Entonces obtengo los siguientes datos:
      | métrica                | valor |
      | totalRegistrados       | 4     |
      | confirmados            | 1     |
      | registrados            | 1     |
      | cancelados             | 1     |
      | descalificados         | 1     |
      | tasaConfirmacion       | 25.0  |
      | cuposDisponibles       | 16    |