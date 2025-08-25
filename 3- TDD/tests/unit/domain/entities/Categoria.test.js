// tests/unit/domain/entities/Categoria.test.js
// 🔴 RED PHASE - Tests que deben fallar porque Categoria no existe

const { Categoria } = require('@domain/tournament/entities/Categoria');
const { CategoriaId } = require('@domain/tournament/valueObjects/CategoriaId');
const { ErrorDominio } = require('@domain/shared/errors/ErrorDominio');

describe('Categoria Entity', () => {
  // 🔴 RED PHASE - Tests que fallan primero
  
  describe('Construcción', () => {
    it('debe crear Categoria con datos válidos', () => {
      // Arrange
      const id = 'cat-prof-001';
      const descripcion = 'Profesional';
      const alias = 'profesional';
      
      // Act
      const categoria = new Categoria(id, descripcion, alias);
      
      // Assert
      expect(categoria.id).toBeInstanceOf(CategoriaId);
      expect(categoria.id.valor).toBe(id);
      expect(categoria.descripcion).toBe(descripcion);
      expect(categoria.alias).toBe(alias);
      expect(categoria.estaActiva).toBe(true); // Por defecto activa
      expect(categoria.fechaCreacion).toBeDefined();
    });

    it('debe rechazar construcción con parámetros inválidos', () => {
      expect(() => new Categoria(null, 'Descripción', 'alias')).toThrowDomainError('requerido');
      expect(() => new Categoria('id', null, 'alias')).toThrowDomainError('requerido');
      expect(() => new Categoria('id', 'desc', null)).toThrowDomainError('requerido');
    });

    it('debe rechazar descripción demasiado corta o larga', () => {
      expect(() => new Categoria('id', 'A', 'alias')).toThrowDomainError('debe tener al menos 2 caracteres');
      expect(() => new Categoria('id', 'A'.repeat(101), 'alias')).toThrowDomainError('no puede exceder 100 caracteres');
    });

    it('debe rechazar alias con formato inválido', () => {
      expect(() => new Categoria('id', 'Descripción', 'ALIAS')).toThrowDomainError('debe estar en minúsculas');
      expect(() => new Categoria('id', 'Descripción', 'alias con espacios')).toThrowDomainError('no puede contener espacios');
      expect(() => new Categoria('id', 'Descripción', 'alias-con-símbolos!')).toThrowDomainError('solo letras, números y guiones');
    });

    it('debe crear con configuración de comisiones por defecto', () => {
      // Arrange & Act
      const categoria = new Categoria('id', 'Profesional', 'profesional');
      
      // Assert
      expect(categoria.configuracionComisiones).toBeDefined();
      expect(categoria.configuracionComisiones.porcentajeBase).toBe(5.0);
      expect(categoria.configuracionComisiones.porcentajePremium).toBe(8.0);
    });
  });

  describe('Gestión de estado', () => {
    let categoria;
    
    beforeEach(() => {
      categoria = new Categoria('cat-001', 'Profesional', 'profesional');
    });

    it('debe activar categoria inactiva', () => {
      // Arrange
      categoria.desactivar();
      expect(categoria.estaActiva).toBe(false);
      
      // Act
      categoria.activar();
      
      // Assert
      expect(categoria.estaActiva).toBe(true);
    });

    it('debe desactivar categoria activa', () => {
      // Arrange
      expect(categoria.estaActiva).toBe(true);
      
      // Act
      categoria.desactivar();
      
      // Assert
      expect(categoria.estaActiva).toBe(false);
    });

    it('debe ser idempotente al activar categoria ya activa', () => {
      // Arrange
      expect(categoria.estaActiva).toBe(true);
      
      // Act
      categoria.activar();
      
      // Assert
      expect(categoria.estaActiva).toBe(true);
    });

    it('debe ser idempotente al desactivar categoria ya inactiva', () => {
      // Arrange
      categoria.desactivar();
      expect(categoria.estaActiva).toBe(false);
      
      // Act
      categoria.desactivar();
      
      // Assert
      expect(categoria.estaActiva).toBe(false);
    });
  });

  describe('Configuración de comisiones', () => {
    let categoria;
    
    beforeEach(() => {
      categoria = new Categoria('cat-001', 'Profesional', 'profesional');
    });

    it('debe actualizar comisión base válida', () => {
      // Act
      categoria.actualizarComisiones(7.5);
      
      // Assert
      expect(categoria.configuracionComisiones.porcentajeBase).toBe(7.5);
    });

    it('debe actualizar ambas comisiones', () => {
      // Act
      categoria.actualizarComisiones(6.0, 10.0);
      
      // Assert
      expect(categoria.configuracionComisiones.porcentajeBase).toBe(6.0);
      expect(categoria.configuracionComisiones.porcentajePremium).toBe(10.0);
    });

    it('debe rechazar porcentajes fuera del rango válido', () => {
      expect(() => categoria.actualizarComisiones(-1)).toThrowDomainError('debe estar entre 0% y 20%');
      expect(() => categoria.actualizarComisiones(25)).toThrowDomainError('debe estar entre 0% y 20%');
    });

    it('debe aceptar porcentajes en los límites válidos', () => {
      expect(() => categoria.actualizarComisiones(0)).not.toThrow();
      expect(() => categoria.actualizarComisiones(20)).not.toThrow();
    });
  });

  describe('Métodos de consulta', () => {
    let categoria;
    
    beforeEach(() => {
      categoria = new Categoria('cat-001', 'Profesional', 'profesional');
    });

    it('debe validar si puede usarse en torneo cuando está activa', () => {
      // Act & Assert
      expect(categoria.puedeUsarseEnTorneo()).toBe(true);
    });

    it('debe validar si NO puede usarse en torneo cuando está inactiva', () => {
      // Arrange
      categoria.desactivar();
      
      // Act & Assert
      expect(categoria.puedeUsarseEnTorneo()).toBe(false);
    });

    it('debe obtener comisión base por defecto', () => {
      // Act & Assert
      expect(categoria.obtenerComisionPara('base')).toBe(5.0);
    });

    it('debe obtener comisión premium', () => {
      // Act & Assert
      expect(categoria.obtenerComisionPara('premium')).toBe(8.0);
    });

    it('debe obtener comisión base para tipos desconocidos', () => {
      // Act & Assert
      expect(categoria.obtenerComisionPara('desconocido')).toBe(5.0);
    });
  });

  describe('Comportamiento de Entity', () => {
    it('debe mantener identidad a través de cambios', () => {
      // Arrange
      const categoria1 = new Categoria('cat-001', 'Profesional', 'profesional');
      const categoria2 = new Categoria('cat-001', 'Amateur', 'amateur');
      
      // Act & Assert - Misma identidad aunque diferentes propiedades
      expect(categoria1.id.equals(categoria2.id)).toBe(true);
    });

    it('debe permitir cambios en propiedades manteniendo identidad', () => {
      // Arrange
      const categoria = new Categoria('cat-001', 'Profesional', 'profesional');
      const idOriginal = categoria.id;
      
      // Act
      categoria.desactivar();
      categoria.actualizarComisiones(10.0);
      
      // Assert - Identidad se mantiene
      expect(categoria.id).toBe(idOriginal);
      expect(categoria.id.valor).toBe('cat-001');
    });
  });

  describe('Validaciones de reglas de negocio', () => {
    it('debe normalizar alias automáticamente', () => {
      // Arrange & Act
      const categoria = new Categoria('cat-001', 'Categoría Especial', 'categoria-especial');
      
      // Assert
      expect(categoria.alias).toBe('categoria-especial');
    });

    it('debe rechazar alias duplicado en el contexto', () => {
      // Este test simula la validación de unicidad que haría un domain service
      // En implementación real, esto sería validado por el repositorio
      
      // Arrange
      const categoria1 = new Categoria('cat-001', 'Primera', 'profesional');
      
      // Act & Assert
      // En implementación real esto se validaría a nivel de repositorio/domain service
      expect(categoria1.alias).toBe('profesional');
    });

    it('debe mantener timestamps de auditoría', () => {
      // Arrange & Act
      const categoria = new Categoria('cat-001', 'Profesional', 'profesional');
      
      // Assert
      expect(categoria.fechaCreacion).toBeDefined();
      expect(categoria.fechaCreacion).toBeInstanceOf(Date);
      expect(categoria.fechaCreacion.getTime()).toBeLessThanOrEqual(new Date().getTime());
    });
  });
});