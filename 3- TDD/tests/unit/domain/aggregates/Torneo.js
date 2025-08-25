// tests/unit/domain/aggregates/Torneo.test.js
// 🔴 RED PHASE - Test básico para Torneo (API-focused)

const { Torneo } = require('@domain/tournament/aggregates/Torneo');
const { TorneoId } = require('@domain/tournament/valueObjects/TorneoId');
const { NombreTorneo } = require('@domain/tournament/valueObjects/NombreTorneo');
const { Categoria } = require('@domain/tournament/entities/Categoria');
const { UsuarioId } = require('@domain/shared/valueObjects/UsuarioId');
const { EstadoTorneo } = require('@domain/tournament/enums/EstadoTorneo');
const { ErrorDominio } = require('@domain/shared/errors/ErrorDominio');

describe('Torneo Aggregate Root - Básico para API', () => {
  let categoria;
  let organizadorId;
  
  beforeEach(() => {
    categoria = new Categoria('cat-001', 'Profesional', 'profesional');
    organizadorId = new UsuarioId('org-123');
  });

  describe('Creación básica', () => {
    it('debe crear torneo con datos mínimos para API', () => {
      // Arrange
      const torneoId = new TorneoId('550e8400-e29b-41d4-a716-446655440000');
      const nombre = new NombreTorneo('Copa de Verano 2024');
      
      // Act
      const torneo = new Torneo(torneoId, nombre, categoria, organizadorId);
      
      // Assert
      expect(torneo.id).toBe(torneoId);
      expect(torneo.nombre).toBe(nombre);
      expect(torneo.categoria).toBe(categoria);
      expect(torneo.organizadorId).toBe(organizadorId);
      expect(torneo.estado).toBe(EstadoTorneo.BORRADOR);
      expect(torneo.fechaCreacion).toBeDefined();
    });

    it('debe rechazar creación con categoría inactiva', () => {
      // Arrange
      categoria.desactivar();
      const torneoId = new TorneoId('550e8400-e29b-41d4-a716-446655440000');
      const nombre = new NombreTorneo('Copa de Verano 2024');
      
      // Act & Assert
      expect(() => new Torneo(torneoId, nombre, categoria, organizadorId))
        .toThrowDomainError('categoría inactiva');
    });

    it('debe rechazar parámetros nulos', () => {
      const torneoId = new TorneoId('550e8400-e29b-41d4-a716-446655440000');
      const nombre = new NombreTorneo('Copa de Verano 2024');
      
      expect(() => new Torneo(null, nombre, categoria, organizadorId))
        .toThrowDomainError('requerido');
      expect(() => new Torneo(torneoId, null, categoria, organizadorId))
        .toThrowDomainError('requerido');
      expect(() => new Torneo(torneoId, nombre, null, organizadorId))
        .toThrowDomainError('requerido');
      expect(() => new Torneo(torneoId, nombre, categoria, null))
        .toThrowDomainError('requerido');
    });
  });

  describe('Métodos de consulta para API', () => {
    let torneo;
    
    beforeEach(() => {
      const torneoId = new TorneoId('550e8400-e29b-41d4-a716-446655440000');
      const nombre = new NombreTorneo('Copa de Verano 2024');
      torneo = new Torneo(torneoId, nombre, categoria, organizadorId);
    });

    it('debe obtener resumen para API', () => {
      // Act
      const resumen = torneo.obtenerResumenParaAPI();
      
      // Assert
      expect(resumen).toEqual({
        torneoId: torneo.id.valor,
        nombre: torneo.nombre.valor,
        categoria: categoria.descripcion,
        organizadorId: organizadorId.valor,
        estado: 'BORRADOR',
        fechaCreacion: torneo.fechaCreacion.toISOString(),
        participantesActuales: 0,
        limiteParticipantes: null
      });
    });

    it('debe validar si puede aceptar configuración', () => {
      // Act & Assert
      expect(torneo.puedeConfigurar()).toBe(true);
    });

    it('debe obtener datos para respuesta de creación', () => {
      // Act
      const datosRespuesta = torneo.obtenerDatosCreacion();
      
      // Assert
      expect(datosRespuesta.torneoId).toBe(torneo.id.valor);
      expect(datosRespuesta.nombre).toBe(torneo.nombre.valor);
      expect(datosRespuesta.estado).toBe('BORRADOR');
      expect(datosRespuesta.organizadorId).toBe(organizadorId.valor);
    });
  });

  describe('Validaciones de negocio básicas', () => {
    it('debe validar estado inicial correcto', () => {
      // Arrange & Act
      const torneo = new Torneo(
        new TorneoId('550e8400-e29b-41d4-a716-446655440000'),
        new NombreTorneo('Copa de Verano 2024'),
        categoria,
        organizadorId
      );
      
      // Assert
      expect(torneo.estado).toBe(EstadoTorneo.BORRADOR);
    });

    it('debe mantener referencia a la categoría', () => {
      // Arrange & Act
      const torneo = new Torneo(
        new TorneoId('550e8400-e29b-41d4-a716-446655440000'),
        new NombreTorneo('Copa de Verano 2024'),
        categoria,
        organizadorId
      );
      
      // Assert
      expect(torneo.categoria.id.valor).toBe('cat-001');
      expect(torneo.categoria.descripcion).toBe('Profesional');
    });

    it('debe permitir acceso a propiedades para serialización API', () => {
      // Arrange
      const torneo = new Torneo(
        new TorneoId('550e8400-e29b-41d4-a716-446655440000'),
        new NombreTorneo('Copa de Verano 2024'),
        categoria,
        organizadorId
      );
      
      // Act & Assert - Verificar que las propiedades son accesibles
      expect(typeof torneo.id.valor).toBe('string');
      expect(typeof torneo.nombre.valor).toBe('string');
      expect(typeof torneo.organizadorId.valor).toBe('string');
      expect(torneo.fechaCreacion instanceof Date).toBe(true);
    });
  });
});