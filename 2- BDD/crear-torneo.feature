# language: es
Característica: Crear Torneo de E-Sports
  Como organizador de torneos de e-sports
  Quiero crear un nuevo torneo
  Para poder organizar competencias y gestionar participantes

  Antecedentes:
    Dado que existe una categoría "Profesional" activa
    Y existe un tipo de juego "League of Legends" que requiere 10 jugadores
    Y soy un organizador registrado con email "organizador@test.com"

  @smoke @happy-path
  Escenario: Crear torneo exitosamente con datos válidos
    Dado que tengo los siguientes datos del torneo:
      | campo                | valor                    |
      | nombre               | Copa de Verano 2024      |
      | categoriaId          | cat-profesional-001      |
      | tipoJuegoId          | juego-lol-001            |
      | limiteParticipantes  | 50                       |
    Cuando creo el torneo
    Entonces el torneo se crea exitosamente
    Y el torneo tiene estado "BORRADOR"
    Y el evento "TorneoCreado" es publicado
    Y recibo el ID del torneo creado

  @validation
  Escenario: Rechazar torneo con nombre inválido
    Dado que tengo los siguientes datos del torneo:
      | campo                | valor                    |
      | nombre               | AB                       |
      | categoriaId          | cat-profesional-001      |
      | tipoJuegoId          | juego-lol-001            |
      | limiteParticipantes  | 50                       |
    Cuando creo el torneo
    Entonces recibo un error de validación
    Y el mensaje de error contiene "debe tener al menos 3 caracteres"

  @validation
  Escenario: Rechazar torneo con categoría inactiva
    Dado que existe una categoría "Amateur" inactiva
    Y tengo los siguientes datos del torneo:
      | campo                | valor                    |
      | nombre               | Torneo Amateur 2024      |
      | categoriaId          | cat-amateur-001          |
      | tipoJuegoId          | juego-lol-001            |
      | limiteParticipantes  | 20                       |
    Cuando creo el torneo
    Entonces recibo un error de negocio
    Y el mensaje de error contiene "categoría inactiva"

  @business-rules
  Escenario: Rechazar torneo con límite incompatible con tipo de juego
    Dado que tengo los siguientes datos del torneo:
      | campo                | valor                    |
      | nombre               | Torneo Pequeño 2024      |
      | categoriaId          | cat-profesional-001      |
      | tipoJuegoId          | juego-lol-001            |
      | limiteParticipantes  | 5                        |
    Cuando creo el torneo
    Entonces recibo un error de negocio
    Y el mensaje de error contiene "requiere 10 jugadores"
    Y el mensaje de error contiene "límite del torneo es 5"

  @business-rules
  Escenario: Crear torneo gratuito con límite máximo permitido
    Dado que tengo los siguientes datos del torneo:
      | campo                | valor                    |
      | nombre               | Torneo Gratuito Grande   |
      | categoriaId          | cat-amateur-001          |
      | tipoJuegoId          | juego-lol-001            |
      | limiteParticipantes  | 50                       |
    Y el torneo es de tipo "gratuito"
    Cuando creo el torneo
    Entonces el torneo se crea exitosamente
    Y el límite de participantes es 50

  @business-rules
  Escenario: Rechazar torneo gratuito que excede límite permitido
    Dado que tengo los siguientes datos del torneo:
      | campo                | valor                    |
      | nombre               | Torneo Gratuito Masivo   |
      | categoriaId          | cat-amateur-001          |
      | tipoJuegoId          | juego-lol-001            |
      | limiteParticipantes  | 100                      |
    Y el torneo es de tipo "gratuito"
    Cuando creo el torneo
    Entonces recibo un error de negocio
    Y el mensaje de error contiene "máximo 50 participantes"

  @integration
  Escenario: Crear torneo genera eventos para otros contextos
    Dado que tengo los siguientes datos del torneo:
      | campo                | valor                    |
      | nombre               | Torneo con Tickets       |
      | categoriaId          | cat-profesional-001      |
      | tipoJuegoId          | juego-lol-001            |
      | limiteParticipantes  | 32                       |
    Cuando creo el torneo
    Entonces el evento "TorneoCreado" contiene:
      | campo           | valor                    |
      | torneoId        | [ID_GENERADO]            |
      | organizadorId   | [MI_USER_ID]             |
      | categoriaId     | cat-profesional-001      |
      | tipoJuegoId     | juego-lol-001            |
    Y el evento tiene metadata para "requiereCreacionTickets": true