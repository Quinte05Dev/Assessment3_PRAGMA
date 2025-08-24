# language: es
Característica: Ciclo de Vida del Torneo
  Como organizador de torneos
  Quiero gestionar el ciclo de vida completo de un torneo
  Para llevar la competencia desde su creación hasta la finalización

  Antecedentes:
    Dado que soy un organizador registrado
    Y existe una categoría "Profesional" activa
    Y existe un tipo de juego "Counter-Strike 2" que requiere 10 jugadores

  @workflow @happy-path
  Escenario: Flujo completo de torneo exitoso
    # Creación
    Dado que creo un torneo con los siguientes datos:
      | campo               | valor                     |
      | nombre              | CS2 Masters Championship  |
      | limiteParticipantes | 16                        |
    Y el torneo tiene estado "BORRADOR"
    
    # Apertura para registro
    Cuando abro el torneo para registro
    Entonces el torneo cambia a estado "ABIERTO_REGISTRO"
    Y el evento "TorneoAbiertoParaRegistro" es publicado
    
    # Registro de participantes
    Cuando se registran 12 participantes válidos
    Entonces todos los participantes tienen estado "REGISTRADO"
    Y la cantidad de participantes es 12
    
    # Confirmación de participantes
    Cuando confirmo 10 participantes
    Entonces 10 participantes tienen estado "CONFIRMADO"
    Y 2 participantes mantienen estado "REGISTRADO"
    
    # Inicio del torneo
    Cuando inicio el torneo
    Entonces el torneo cambia a estado "EN_PROGRESO"
    Y el evento "TorneoIniciado" es publicado
    Y el evento contiene 10 participantes confirmados
    
    # Finalización
    Cuando finalizo el torneo con ganador "user-winner-001"
    Entonces el torneo cambia a estado "FINALIZADO"
    Y el evento "TorneoFinalizado" es publicado
    Y el ganador del torneo es "user-winner-001"

  @state-transitions
  Escenario: Validar transiciones de estado válidas
    Dado que tengo un torneo en estado "BORRADOR"
    Entonces puedo transicionar a los siguientes estados:
      | estadoDestino      | esValido |
      | ABIERTO_REGISTRO   | true     |
      | CANCELADO          | true     |
      | EN_PROGRESO        | false    |
      | FINALIZADO         | false    |
    
    Cuando el torneo está en estado "ABIERTO_REGISTRO"
    Entonces puedo transicionar a los siguientes estados:
      | estadoDestino      | esValido |
      | REGISTRO_CERRADO   | true     |
      | EN_PROGRESO        | true     |
      | CANCELADO          | true     |
      | BORRADOR           | false    |
      | FINALIZADO         | false    |

  @business-rules
  Escenario: Cerrar registro automáticamente al alcanzar límite
    Dado que tengo un torneo abierto para registro
    Y el límite de participantes es 8
    Y ya hay 7 participantes registrados
    Cuando se registra el participante número 8
    Entonces el torneo alcanza su capacidad máxima
    Y se rechaza automáticamente cualquier nuevo registro
    Y se sugiere cerrar el registro manualmente

  @error-handling
  Escenario: Intentar iniciar torneo sin configuración completa
    Dado que tengo un torneo en estado "ABIERTO_REGISTRO"
    Y el torneo no tiene límite de participantes definido
    Cuando intento iniciar el torneo
    Entonces recibo un error de configuración
    Y el mensaje de error contiene "configuración mínima completa"
    Y el torneo mantiene su estado actual

  @business-rules
  Escenario: Cancelar torneo con participantes registrados
    Dado que tengo un torneo en estado "ABIERTO_REGISTRO"
    Y el torneo tiene 5 participantes registrados
    Cuando cancelo el torneo por "Problemas técnicos"
    Entonces el torneo cambia a estado "CANCELADO"
    Y el evento "TorneoCancelado" es publicado
    Y el evento incluye:
      | campo                 | valor              |
      | razonCancelacion      | Problemas técnicos |
      | estadoAnterior        | ABIERTO_REGISTRO   |
      | cantidadParticipantes | 5                  |
    Y todos los participantes reciben notificación de cancelación

  @administration
  Escenario: Agregar subadministradores al torneo
    Dado que tengo un torneo creado
    Y existen usuarios "admin-001" y "admin-002" con rol "SubAdministrador"
    Cuando agrego "admin-001" como subadministrador
    Entonces "admin-001" se agrega exitosamente
    Y el evento "SubAdministradorAgregado" es publicado
    
    Cuando agrego "admin-002" como subadministrador  
    Entonces "admin-002" se agrega exitosamente
    Y el torneo tiene 2 subadministradores
    
    Cuando intento agregar "admin-003" como subadministrador
    Entonces recibo un error de límite
    Y el mensaje de error contiene "Máximo 2 subadministradores"

  @configuration
  Escenario: Actualizar límite de participantes
    Dado que tengo un torneo con límite de 10 participantes
    Y el torneo tiene 6 participantes registrados
    Cuando actualizo el límite a 20 participantes
    Entonces el nuevo límite es aceptado
    Y el evento "LimiteParticipantesActualizado" es publicado
    Y el evento contiene límite anterior: 10 y nuevo: 20
    
    Cuando intento actualizar el límite a 4 participantes
    Entonces recibo un error de validación
    Y el mensaje de error contiene "no puede ser menor que los participantes actuales"
    Y el límite permanece en 20

  @scheduling
  Escenario: Crear etapas de venta con precios diferenciados
    Dado que tengo un torneo creado
    Cuando creo las siguientes etapas de venta:
      | nombre       | fechaInicio | fechaFin   | precio |
      | Early Bird   | 2024-06-01  | 2024-06-15 | 10.00  |
      | Regular      | 2024-06-16  | 2024-06-30 | 15.00  |
      | Last Minute  | 2024-07-01  | 2024-07-10 | 20.00  |
    Entonces todas las etapas se crean exitosamente
    Y no hay solapamiento de fechas
    Y cada etapa tiene su precio asignado
    
    Cuando intento crear una etapa que solapa fechas:
      | nombre    | fechaInicio | fechaFin   | precio |
      | Overlapping | 2024-06-10  | 2024-06-20 | 12.00  |
    Entonces recibo un error de validación
    Y el mensaje de error contiene "fechas se solapan"

  @reporting
  Escenario: Generar estadísticas del torneo
    Dado que tengo un torneo finalizado
    Y el torneo duró 120 minutos
    Y tuvo los siguientes participantes finales:
      | usuarioId | posicion | puntuacion |
      | user-001  | 1        | 100        |
      | user-002  | 2        | 85         |
      | user-003  | 3        | 70         |
    Cuando genero las estadísticas del torneo
    Entonces obtengo el siguiente reporte:
      | métrica                | valor     |
      | duracionMinutos        | 120       |
      | participantesFinal     | 3         |
      | ganador                | user-001  |
      | puntuacionMaxima       | 100       |
      | promedioParticipacion  | 85.0      |