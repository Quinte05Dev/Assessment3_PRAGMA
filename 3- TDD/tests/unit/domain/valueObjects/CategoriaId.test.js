// tests/unit/domain/valueObjects/CategoriaId.test.js
// 🔴 RED PHASE - Tests que deben fallar porque CategoriaId no existe

const { CategoriaId } = require('@domain/tournament/valueObjects/CategoriaId');
const { ErrorDominio } = require('@domain/shared/errors/ErrorDominio');

describe('CategoriaId Value Object', () => {
  // 🔴 RED PHASE - Tests básicos para identificador de categoría
  
  describe('Construcción', () => {
    it('debe crear CategoriaId con valor válido', () => {
      // Arrange
      const valorValido = 'cat-profesional-001';
      
      // Act
      const categoriaId = new CategoriaId(valorValido);
      
      // Assert
      expect(categoriaId.valor).toBe(valorValido);
      expect(categoriaId).toBeValueObject();
    });

    it('debe rechazar CategoriaId con valor nulo o vacío', () => {
      expect(() => new CategoriaId(null)).toThrowDomainError('CategoriaId no puede ser nulo');
      expect(() => new CategoriaId('')).toThrowDomainError('CategoriaId no puede ser nulo');
      expect(() => new CategoriaId('   ')).toThrowDomainError('CategoriaId no puede ser nulo');
    });

    it('debe rechazar CategoriaId que no es string', () => {
      expect(() => new CategoriaId(123)).toThrowDomainError('CategoriaId debe ser un string');
      expect(() => new CategoriaId({})).toThrowDomainError('CategoriaId debe ser un string');
    });

    it('debe validar formato de identificador', () => {
      // Arrange - IDs válidos
      const idsValidos = [
        'cat-001',
        'cat-profesional-2024', 
        'categoria-amateur',
        'cat_especial_001'
      ];
      
      // Act & Assert
      idsValidos.forEach(id => {
        expect(() => new CategoriaId(id)).not.toThrow();
      });
    });

    it('debe rechazar formatos inválidos', () => {
      const idsInvalidos = [
        'X', // Muy corto
        'CATEGORIA-EN-MAYUSCULAS', // Mayúsculas no permitidas
        'cat@invalid', // Caracteres especiales
        'cat con espacios' // Espacios
      ];
      
      idsInvalidos.forEach(id => {
        expect(() => new CategoriaId(id)).toThrowDomainError('formato inválido');
      });
    });
  });

  describe('Comportamiento de Value Object', () => {
    it('debe ser inmutable', () => {
      // Arrange
      const id = 'cat-profesional-001';
      const categoriaId = new CategoriaId(id);
      
      // Act & Assert
      expect(Object.isFrozen(categoriaId)).toBe(true);
      expect(() => categoriaId.valor = 'nuevo-id').toThrow();
    });

    it('debe implementar equals correctamente', () => {
      // Arrange
      const id1 = 'cat-profesional-001';
      const id2 = 'cat-amateur-001';
      
      const categoriaId1a = new CategoriaId(id1);
      const categoriaId1b = new CategoriaId(id1);
      const categoriaId2 = new CategoriaId(id2);
      
      // Act & Assert
      expect(categoriaId1a.equals(categoriaId1b)).toBe(true);
      expect(categoriaId1a.equals(categoriaId2)).toBe(false);
      expect(categoriaId1a.equals(null)).toBe(false);
      expect(categoriaId1a.equals("string")).toBe(false);
    });

    it('debe implementar toString', () => {
      // Arrange
      const id = 'cat-profesional-001';
      const categoriaId = new CategoriaId(id);
      
      // Act & Assert
      expect(categoriaId.toString()).toBe(id);
    });
  });
});