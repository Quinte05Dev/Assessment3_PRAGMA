// tests/unit/domain/valueObjects/TorneoId.test.js
describe('TorneoId Value Object', () => {
  // 🔴 RED PHASE - Escribimos tests que fallan primero
  
  describe('Construcción', () => {
    it('debe crear TorneoId con UUID válido', () => {
      // Arrange
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      
      // Act
      const torneoId = new TorneoId(validUuid);
      
      // Assert
      expect(torneoId.valor).toBe(validUuid);
      expect(torneoId).toBeValueObject();
    });

    it('debe rechazar TorneoId con valor nulo', () => {
      // Act & Assert
      expect(() => new TorneoId(null)).toThrowDomainError('TorneoId no puede ser nulo');
    });

    it('debe rechazar TorneoId con valor vacío', () => {
      expect(() => new TorneoId('')).toThrowDomainError('TorneoId no puede ser nulo');
    });

    it('debe rechazar TorneoId con formato inválido', () => {
      expect(() => new TorneoId('invalid-uuid')).toThrowDomainError('debe ser un UUID v4 válido');
    });

    it('debe rechazar TorneoId que no es string', () => {
      expect(() => new TorneoId(123)).toThrowDomainError('debe ser un string');
    });
  });

  describe('Comportamiento de Value Object', () => {
    it('debe ser inmutable', () => {
      // Arrange
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      const torneoId = new TorneoId(uuid);
      
      // Act & Assert
      expect(Object.isFrozen(torneoId)).toBe(true);
      expect(() => torneoId.valor = 'nuevo-valor').toThrow();
    });

    it('debe implementar equals correctamente', () => {
      // Arrange
      const uuid1 = '123e4567-e89b-12d3-a456-426614174000';
      const uuid2 = '987fcdeb-51a2-43d1-9f12-123456789abc';
      
      const torneoId1a = new TorneoId(uuid1);
      const torneoId1b = new TorneoId(uuid1);
      const torneoId2 = new TorneoId(uuid2);
      
      // Act & Assert
      expect(torneoId1a.equals(torneoId1b)).toBe(true);
      expect(torneoId1a.equals(torneoId2)).toBe(false);
      expect(torneoId1a.equals(null)).toBe(false);
      expect(torneoId1a.equals("string")).toBe(false);
    });

    it('debe implementar toString', () => {
      // Arrange
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      const torneoId = new TorneoId(uuid);
      
      // Act & Assert
      expect(torneoId.toString()).toBe(uuid);
    });
  });

  describe('Validación de formato UUID v4', () => {
    it('debe aceptar UUID v4 válido', () => {
      const validUuids = [
        '123e4567-e89b-12d3-a456-426614174000',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
      ];

      validUuids.forEach(uuid => {
        expect(() => new TorneoId(uuid)).not.toThrow();
      });
    });

    it('debe rechazar UUID con formato incorrecto', () => {
      const invalidUuids = [
        '123e4567-e89b-12d3-a456', // Muy corto
        '123e4567-e89b-12d3-a456-426614174000-extra', // Muy largo
        'gggggggg-gggg-gggg-gggg-gggggggggggg', // Caracteres inválidos
        '123e4567e89b12d3a456426614174000', // Sin guiones
        '123e4567-e89b-12d3-a456-42661417400g' // Caracter inválido al final
      ];

      invalidUuids.forEach(uuid => {
        expect(() => new TorneoId(uuid)).toThrowDomainError('debe ser un UUID v4 válido');
      });
    });
  });
});

// 🔴 RED PHASE - Este test DEBE FALLAR porque TorneoId no existe aún
// Importes que fallarán
const { TorneoId } = require('@domain/tournament/valueObjects/TorneoId');
const { ErrorDominio } = require('@domain/shared/errors/ErrorDominio');