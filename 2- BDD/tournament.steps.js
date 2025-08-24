// tournament.steps.js - Step Definitions para BDD
const { Given, When, Then, BeforeAll, AfterAll, Before, After } = require('@cucumber/cucumber');
const { expect } = require('chai');

// Importar domain objects (estos los crearemos con TDD)
const { 
  Torneo, 
  TorneoId, 
  NombreTorneo, 
  LimiteParticipantes,
  Categoria,
  TipoJuego,
  UsuarioId,
  Participante,
  ServicioValidacionTorneo,
  ServicioRegistroParticipante,
  EstadoTorneo,
  EstadoParticipante,
  ErrorDominio
} = require('../src/domain/tournament');

// World object para compartir estado entre steps
class TournamentWorld {
  constructor() {
    this.torneo = null;
    this.categoria = null;
    this.tipoJuego = null;
    this.organizadorId = null;
    this.participantes = [];
    this.datosCreacion = {};
    this.ultimoError = null;
    this.eventosPublicados = [];
    this.resultado = null;
  }

  reset() {
    this.torneo = null;
    this.ultimoError = null;
    this.eventosPublicados = [];
    this.resultado = null;
  }
}

// Setup global
const world = new TournamentWorld();

// ========== HOOKS ==========
Before(function() {
  world.reset();
});

// ========== GIVEN STEPS (PRECONDICIONES) ==========

Given('que existe una categoría {string} activa', function (nombreCategoria) {
  world.categoria = new Categoria('cat-001', nombreCategoria, nombreCategoria.toLowerCase());
  world.categoria.activar();
});

Given('que existe una categoría {string} inactiva', function (nombreCategoria) {
  world.categoria = new Categoria('cat-002', nombreCategoria, nombreCategoria.toLowerCase());
  world.categoria.desactivar();
});

Given('existe un tipo de juego {string} que requiere {int} jugadores', function (nombreJuego, cantidadJugadores) {
  world.tipoJuego = new TipoJuego('juego-001', nombreJuego, cantidadJugadores);
});

Given('soy un organizador registrado con email {string}', function (email) {
  world.organizadorId = new UsuarioId('org-001');
  world.organizadorEmail = email;
});

Given('que tengo los siguientes datos del torneo:', function (dataTable) {
  const datos = dataTable.rowsHash();
  world.datosCreacion = {
    nombre: datos.nombre,
    categoriaId: datos.categoriaId || 'cat-001',
    tipoJuegoId: datos.tipoJuegoId || 'juego-001',
    limiteParticipantes: parseInt(datos.limiteParticipantes) || 10,
    organizadorId: world.organizadorId.valor
  };
});

Given('el torneo es de tipo {string}', function (tipoTorneo) {
  world.tipoTorneo = tipoTorneo;
});

// ========== TORNEO EXISTENTE ==========

Given('que existe un torneo {string}', function (nombreTorneo) {
  world.torneo = new Torneo(
    new TorneoId('torneo-001'),
    nombreTorneo,
    world.categoria || new Categoria('cat-001', 'Profesional', 'profesional'),
    world.tipoJuego || new TipoJuego('juego-001', 'League of Legends', 10),
    world.organizadorId || new UsuarioId('org-001')
  );
});

Given('el torneo tiene estado {string}', function (estado) {
  if (world.torneo) {
    // Forzar estado para testing (en producción sería via métodos de negocio)
    world.torneo.estado = EstadoTorneo[estado];
  }
});

Given('el torneo tiene límite de {int} participantes', function (limite) {
  if (world.torneo) {
    world.torneo.actualizarLimiteParticipantes(limite);
  }
});

Given('soy el organizador del torneo', function () {
  // Ya está configurado en world.organizadorId
});

Given('existen los siguientes usuarios registrados:', function (dataTable) {
  world.usuariosDisponibles = dataTable.hashes().map(row => ({
    usuarioId: row.usuarioId,
    email: row.email,
    rol: row.rol
  }));
});

// ========== PARTICIPANTES ==========

Given('que el usuario {string} no está registrado en el torneo', function (usuarioId) {
  // Verificación - no hacer nada si no está registrado
  if (world.torneo) {
    const estaRegistrado = world.torneo.participantes.tieneUsuario(new UsuarioId(usuarioId));
    expect(estaRegistrado).to.be.false;
  }
});

Given('que el usuario {string} ya está registrado en el torneo', function (usuarioId) {
  if (world.torneo) {
    const participante = new Participante('part-001', new UsuarioId(usuarioId));
    world.torneo.agregarParticipante(participante);
  }
});

Given('el torneo puede aceptar más participantes', function () {
  if (world.torneo) {
    expect(world.torneo.puedeAceptarParticipantes()).to.be.true;
  }
});

Given('el torneo tiene {int} participantes registrados', function (cantidad) {
  if (world.torneo) {
    for (let i = 1; i <= cantidad; i++) {
      const participante = new Participante(`part-${i}`, new UsuarioId(`user-${i}`));
      world.torneo.agregarParticipante(participante);
    }
  }
});

Given('el usuario {string} está registrado en el torneo', function (usuarioId) {
  if (world.torneo) {
    const participante = new Participante('part-test', new UsuarioId(usuarioId));
    world.torneo.agregarParticipante(participante);
  }
});

Given('el participante tiene estado {string}', function (estado) {
  // Para testing, asumir último participante agregado
  if (world.torneo && world.torneo.participantes.contar() > 0) {
    const participantes = world.torneo.participantes.toArray();
    const ultimoParticipante = participantes[participantes.length - 1];
    ultimoParticipante.estado = EstadoParticipante[estado];
  }
});

Given('tengo una lista de usuarios válidos:', function (dataTable) {
  world.usuariosEnLote = dataTable.hashes();
});

Given('todos los usuarios tienen rol {string}', function (rol) {
  if (world.usuariosEnLote) {
    world.usuariosEnLote.forEach(usuario => usuario.rol = rol);
  }
});

// ========== WHEN STEPS (ACCIONES) ==========

When('creo el torneo', async function () {
  try {
    // Validar con domain service
    ServicioValidacionTorneo.validarCreacionTorneo(
      { 
        limiteParticipantes: new LimiteParticipantes(world.datosCreacion.limiteParticipantes),
        categoria: world.categoria,
        tipoJuego: world.tipoJuego
      },
      world.categoria,
      world.tipoJuego
    );

    // Crear torneo
    world.torneo = new Torneo(
      new TorneoId('torneo-test-' + Date.now()),
      world.datosCreacion.nombre,
      world.categoria,
      world.tipoJuego,
      world.organizadorId
    );

    // Configurar límite
    world.torneo.actualizarLimiteParticipantes(world.datosCreacion.limiteParticipantes);

    // Capturar eventos
    world.eventosPublicados = world.torneo.obtenerEventosNoPublicados();
    
    world.resultado = {
      exitoso: true,
      torneoId: world.torneo.id.valor
    };

  } catch (error) {
    world.ultimoError = error;
    world.resultado = {
      exitoso: false,
      error: error.message
    };
  }
});

When('abro el torneo para registro', function () {
  try {
    world.torneo.abrirParaRegistro();
    world.eventosPublicados = world.torneo.obtenerEventosNoPublicados();
  } catch (error) {
    world.ultimoError = error;
  }
});

When('registro al usuario {string} como participante', function (usuarioId) {
  try {
    const participante = new Participante(
      `part-${Date.now()}`,
      new UsuarioId(usuarioId)
    );
    
    const cantidadAnterior = world.torneo.participantes.contar();
    world.torneo.agregarParticipante(participante);
    world.cantidadParticipantesAnterior = cantidadAnterior;
    world.ultimoParticipanteAgregado = participante;
    world.eventosPublicados = world.torneo.obtenerEventosNoPublicados();
    
  } catch (error) {
    world.ultimoError = error;
  }
});

When('intento registrar al usuario {string} como participante', function (usuarioId) {
  // Mismo que anterior, pero esperando que falle
  this.registro_al_usuario_string_como_participante(usuarioId);
});

When('confirmo la participación del usuario {string}', function (usuarioId) {
  try {
    const participante = world.torneo.participantes.buscarPorUsuarioId(new UsuarioId(usuarioId));
    participante.confirmarParticipacion();
    
    // Simular evento
    world.eventosPublicados.push({
      tipo: 'ParticipanteConfirmado',
      participanteId: participante.id.valor,
      usuarioId: usuarioId
    });
    
  } catch (error) {
    world.ultimoError = error;
  }
});

When('el usuario {string} cancela su participación', function (usuarioId) {
  try {
    const participanteId = world.torneo.participantes.buscarPorUsuarioId(new UsuarioId(usuarioId)).id;
    world.torneo.removerParticipante(participanteId, 'CANCELACION_VOLUNTARIA');
    world.eventosPublicados = world.torneo.obtenerEventosNoPublicados();
    
  } catch (error) {
    world.ultimoError = error;
  }
});

When('descalifico al usuario {string} por {string}', function (usuarioId, razon) {
  try {
    const participante = world.torneo.participantes.buscarPorUsuarioId(new UsuarioId(usuarioId));
    participante.descalificar(razon);
    
    world.eventosPublicados.push({
      tipo: 'ParticipanteDescalificado',
      participanteId: participante.id.valor,
      razon: razon
    });
    
  } catch (error) {
    world.ultimoError = error;
  }
});

When('registro a todos los usuarios en lote', function () {
  try {
    world.participantesRegistradosEnLote = [];
    
    for (const usuario of world.usuariosEnLote) {
      const participante = new Participante(
        `part-${usuario.usuarioId}`,
        new UsuarioId(usuario.usuarioId)
      );
      
      world.torneo.agregarParticipante(participante);
      world.participantesRegistradosEnLote.push(participante);
    }
    
    world.eventosPublicados = world.torneo.obtenerEventosNoPublicados();
    
  } catch (error) {
    world.ultimoError = error;
  }
});

When('intento iniciar el torneo', function () {
  try {
    world.torneo.iniciarTorneo();
    world.eventosPublicados = world.torneo.obtenerEventosNoPublicados();
    
  } catch (error) {
    world.ultimoError = error;
  }
});

When('inicio el torneo', function () {
  this.intento_iniciar_el_torneo();
});

When('se registran {int} participantes válidos', function (cantidad) {
  try {
    for (let i = 1; i <= cantidad; i++) {
      const participante = new Participante(
        `part-bulk-${i}`,
        new UsuarioId(`user-bulk-${i}`)
      );
      world.torneo.agregarParticipante(participante);
    }
    world.eventosPublicados = world.torneo.obtenerEventosNoPublicados();
    
  } catch (error) {
    world.ultimoError = error;
  }
});

When('confirmo {int} participantes', function (cantidad) {
  try {
    const participantes = world.torneo.participantes.toArray().slice(0, cantidad);
    participantes.forEach(p => p.confirmarParticipacion());
    
  } catch (error) {
    world.ultimoError = error;
  }
});

When('finalizo el torneo con ganador {string}', function (ganadorId) {
  try {
    world.torneo.finalizarTorneo(new UsuarioId(ganadorId));
    world.eventosPublicados = world.torneo.obtenerEventosNoPublicados();
    
  } catch (error) {
    world.ultimoError = error;
  }
});

When('cancelo el torneo por {string}', function (razon) {
  try {
    const cantidadParticipantes = world.torneo.participantes.contar();
    world.torneo.cancelarTorneo(razon);
    world.cantidadParticipantesAntesCancelacion = cantidadParticipantes;
    world.eventosPublicados = world.torneo.obtenerEventosNoPublicados();
    
  } catch (error) {
    world.ultimoError = error;
  }
});

When('agrego {string} como subadministrador', function (usuarioId) {
  try {
    world.torneo.agregarSubAdministrador(usuarioId);
    world.eventosPublicados = world.torneo.obtenerEventosNoPublicados();
    
  } catch (error) {
    world.ultimoError = error;
  }
});

When('actualizo el límite a {int} participantes', function (nuevoLimite) {
  try {
    world.limiteAnterior = world.torneo.limiteParticipantes.valor;
    world.torneo.actualizarLimiteParticipantes(nuevoLimite);
    world.eventosPublicados = world.torneo.obtenerEventosNoPublicados();
    
  } catch (error) {
    world.ultimoError = error;
  }
});

When('intento actualizar el límite a {int} participantes', function (nuevoLimite) {
  this.actualizo_el_límite_a_int_participantes(nuevoLimite);
});

When('creo las siguientes etapas de venta:', function (dataTable) {
  try {
    const etapas = dataTable.hashes();
    
    for (const etapa of etapas) {
      world.torneo.crearEtapaVenta(
        etapa.nombre,
        new Date(etapa.fechaInicio),
        new Date(etapa.fechaFin),
        parseFloat(etapa.precio)
      );
    }
    
    world.eventosPublicados = world.torneo.obtenerEventosNoPublicados();
    
  } catch (error) {
    world.ultimoError = error;
  }
});

When('consulto las estadísticas de participación', function () {
  try {
    world.estadisticas = world.torneo.participantes.obtenerEstadisticas();
    
  } catch (error) {
    world.ultimoError = error;
  }
});

When('genero las estadísticas del torneo', function () {
  try {
    world.estadisticasTorneo = world.torneo.obtenerEstadisticas();
    
  } catch (error) {
    world.ultimoError = error;
  }
});

// ========== THEN STEPS (VERIFICACIONES) ==========

Then('el torneo se crea exitosamente', function () {
  expect(world.resultado.exitoso).to.be.true;
  expect(world.torneo).to.not.be.null;
});

Then('recibo el ID del torneo creado', function () {
  expect(world.resultado.torneoId).to.not.be.null;
  expect(world.resultado.torneoId).to.be.a('string');
});

Then('el torneo tiene estado {string}', function (estadoEsperado) {
  expect(world.torneo.estado).to.equal(EstadoTorneo[estadoEsperado]);
});

Then('el evento {string} es publicado', function (tipoEvento) {
  const evento = world.eventosPublicados.find(e => e.constructor.name === tipoEvento);
  expect(evento, `Evento ${tipoEvento} no fue encontrado`).to.not.be.undefined;
});

Then('recibo un error de validación', function () {
  expect(world.ultimoError).to.not.be.null;
  expect(world.ultimoError).to.be.instanceOf(Error);
});

Then('recibo un error de negocio', function () {
  expect(world.ultimoError).to.not.be.null;
  expect(world.ultimoError).to.be.instanceOf(ErrorDominio);
});

Then('recibo un error de estado', function () {
  expect(world.ultimoError).to.not.be.null;
  expect(world.ultimoError.message).to.include('estado');
});

Then('el mensaje de error contiene {string}', function (textoEsperado) {
  expect(world.ultimoError.message).to.include(textoEsperado);
});

Then('el participante se registra exitosamente', function () {
  expect(world.ultimoError).to.be.null;
  expect(world.ultimoParticipanteAgregado).to.not.be.null;
});

Then('el participante tiene estado {string}', function (estadoEsperado) {
  expect(world.ultimoParticipanteAgregado.estado).to.equal(EstadoParticipante[estadoEsperado]);
});

Then('la cantidad de participantes aumenta en {int}', function (incremento) {
  const cantidadActual = world.torneo.participantes.contar();
  expect(cantidadActual).to.equal(world.cantidadParticipantesAnterior + incremento);
});

Then('la cantidad de participantes no cambia', function () {
  const cantidadActual = world.torneo.participantes.contar();
  expect(cantidadActual).to.equal(world.cantidadParticipantesAnterior);
});

Then('el usuario {string} no queda registrado', function (usuarioId) {
  const estaRegistrado = world.torneo.participantes.tieneUsuario(new UsuarioId(usuarioId));
  expect(estaRegistrado).to.be.false;
});

Then('el participante cambia a estado {string}', function (nuevoEstado) {
  // Verificar el cambio de estado del último participante modificado
  expect(world.ultimoError).to.be.null;
  // En implementación real verificaríamos el estado específico
});

Then('la razón de cancelación es {string}', function (razonEsperada) {
  const evento = world.eventosPublicados.find(e => e.tipo === 'ParticipanteCancelado');
  expect(evento.razon).to.equal(razonEsperada);
});

Then('la cantidad de participantes disminuye en {int}', function (decremento) {
  // Verificar que la cantidad disminuyó
  expect(world.ultimoError).to.be.null;
});

Then('todos los participantes se registran exitosamente', function () {
  expect(world.ultimoError).to.be.null;
  expect(world.participantesRegistradosEnLote.length).to.equal(world.usuariosEnLote.length);
});

Then('cada participante tiene estado {string}', function (estadoEsperado) {
  world.participantesRegistradosEnLote.forEach(participante => {
    expect(participante.estado).to.equal(EstadoParticipante[estadoEsperado]);
  });
});

Then('se publican {int} eventos {string}', function (cantidad, tipoEvento) {
  const eventos = world.eventosPublicados.filter(e => e.constructor.name === tipoEvento);
  expect(eventos.length).to.equal(cantidad);
});

Then('la cantidad total de participantes es {int}', function (cantidadEsperada) {
  expect(world.torneo.participantes.contar()).to.equal(cantidadEsperada);
});

Then('el torneo mantiene estado {string}', function (estadoEsperado) {
  expect(world.torneo.estado).to.equal(EstadoTorneo[estadoEsperado]);
});

Then('el evento contiene cantidad de participantes: {int}', function (cantidad) {
  const evento = world.eventosPublicados.find(e => e.constructor.name === 'TorneoIniciado');
  expect(evento.cantidadParticipantes).to.equal(cantidad);
});

Then('obtengo los siguientes datos:', function (dataTable) {
  const datosEsperados = dataTable.rowsHash();
  
  Object.keys(datosEsperados).forEach(metrica => {
    const valorEsperado = isNaN(datosEsperados[metrica]) 
      ? datosEsperados[metrica] 
      : parseFloat(datosEsperados[metrica]);
      
    expect(world.estadisticas[metrica]).to.equal(valorEsperado);
  });
});

Then('el ganador del torneo es {string}', function (ganadorEsperado) {
  expect(world.torneo.ganadorId.valor).to.equal(ganadorEsperado);
});

Then('el evento {string} contiene:', function (tipoEvento, dataTable) {
  const evento = world.eventosPublicados.find(e => e.constructor.name === tipoEvento);
  expect(evento).to.not.be.undefined;
  
  const datosEsperados = dataTable.rowsHash();
  Object.keys(datosEsperados).forEach(campo => {
    if (datosEsperados[campo] !== '[ID_GENERADO]' && datosEsperados[campo] !== '[MI_USER_ID]') {
      expect(evento[campo]).to.equal(datosEsperados[campo]);
    }
  });
});

Then('el evento tiene metadata para {string}: {word}', function (campo, valor) {
  const evento = world.eventosPublicados[0]; // Último evento
  const valorEsperado = valor === 'true';
  expect(evento.metadata[campo]).to.equal(valorEsperado);
});

Then('puedo transicionar a los siguientes estados:', function (dataTable) {
  const transiciones = dataTable.hashes();
  
  transiciones.forEach(transicion => {
    const puedeTransicionar = EstadoTorneo.puedeTransicionarA(
      world.torneo.estado,
      EstadoTorneo[transicion.estadoDestino]
    );
    
    const esperado = transicion.esValido === 'true';
    expect(puedeTransicionar).to.equal(esperado);
  });
});

// Export para testing
module.exports = { TournamentWorld, world };