// tests/unit/domain/valueObjects/NombreTorneo.test.js
// 🔴 RED PHASE - Tests que deben fallar porque NombreTorneo no existe

const { NombreTorneo } = require('@domain/tournament/valueObjects/NombreTorneo');
const { ErrorDominio } = require('@domain/shared/errors/ErrorDominio');

describe('NombreTorneo Value Object', () => {
  // 🔴 RED PHASE - Tests que fallan primero
  
  describe('Construcción', () => {
    it('debe crear NombreTorneo con nombre válido', () => {
      // Arrange
      const nombreValido = 'Copa de Verano 2024';
      
      // Act
      const nombreTorneo = new NombreTorneo(nombreValido);
      
      // Assert
      expect(nombreTorneo.valor).toBe(nombreValido);
      expect(nombreTorneo).toBeValueObject();
    });

    it('debe rechazar nombre nulo o vacío', () => {
      // Act & Assert
      expect(() => new NombreTorneo(null)).toThrowDomainError('Nombre del torneo es requerido');
      expect(() => new NombreTorneo('')).toThrowDomainError('Nombre del torneo es requerido');
      expect(() => new NombreTorneo('   ')).toThrowDomainError('Nombre del torneo es requerido');
    });

    it('debe rechazar nombre que no es string', () => {
      expect(() => new NombreTorneo(123)).toThrowDomainError('Nombre del torneo es requerido');
      expect(() => new NombreTorneo({})).toThrowDomainError('Nombre del torneo es requerido');
      expect(() => new NombreTorneo([])).toThrowDomainError('Nombre del torneo es requerido');
    });

    it('debe rechazar nombre demasiado corto', () => {
      expect(() => new NombreTorneo('AB')).toThrowDomainError('debe tener al menos 3 caracteres');
      expect(() => new NombreTorneo('X')).toThrowDomainError('debe tener al menos 3 caracteres');
    });

    it('debe rechazar nombre demasiado largo', () => {
      const nombreMuyLargo = 'A'.repeat(101);
      expect(() => new NombreTorneo(nombreMuyLargo)).toThrowDomainError('no puede exceder 100 caracteres');
    });

    it('debe aceptar nombre en el límite válido', () => {
      // Arrange
      const nombreCorto = 'ABC'; // 3 caracteres
      const nombreLargo = 'A'.repeat(100); // 100 caracteres
      
      // Act & Assert
      expect(() => new NombreTorneo(nombreCorto)).not.toThrow();
      expect(() => new NombreTorneo(nombreLargo)).not.toThrow();
    });
  });

  describe('Validación de caracteres', () => {
    it('debe aceptar caracteres válidos', () => {
      const nombresValidos = [
        'Torneo de League of Legends',
        'Copa FIFA 2024',
        'Championship Pro-Gaming',
        'Torneo Ñandú Gaming',
        'Contest_2024 (Final)',
        'CS:GO Masters Series',
        'Valorant Cup 3.0'
      ];
      
      nombresValidos.forEach(nombre => {
        expect(() => new NombreTorneo(nombre)).not.toThrow();
      });
    });

    it('debe rechazar caracteres especiales no permitidos', () => {
      const nombresInvalidos = [
        'Torneo<script>',
        'Copa & Associates',
        'Torneo@Home',
        'Gaming#Tag',
        'Contest%Special',
        'Torneo$Money'
      ];
      
      nombresInvalidos.forEach(nombre => {
        expect(() => new NombreTorneo(nombre)).toThrowDomainError('caracteres no permitidos');
      });
    });

    it('debe rechazar nombres que solo contienen espacios y símbolos', () => {
      expect(() => new NombreTorneo('--- ___ ---')).toThrowDomainError('debe contener al menos una letra o número');
      expect(() => new NombreTorneo('() [] {}')).toThrowDomainError('debe contener al menos una letra o número');
    });
  });

  describe('Validación de contenido prohibido', () => {
    it('debe rechazar palabras prohibidas', () => {
      const nombresProhibidos = [
        'Torneo de Spam Gaming',
        'Test123 Championship',
        'Ejemplo de Torneo'
      ];
      
      nombresProhibidos.forEach(nombre => {
        expect(() => new NombreTorneo(nombre)).toThrowDomainError('contenido no permitido');
      });
    });
  });

  describe('Normalización automática', () => {
    it('debe trimear espacios automáticamente', () => {
      // Arrange
      const nombreConEspacios = '   Copa de Verano 2024   ';
      const nombreEsperado = 'Copa de Verano 2024';
      
      // Act
      const nombreTorneo = new NombreTorneo(nombreConEspacios);
      
      // Assert
      expect(nombreTorneo.valor).toBe(nombreEsperado);
    });

    it('debe normalizar múltiples espacios internos', () => {
      // Arrange
      const nombreConEspaciosMultiples = 'Copa    de     Verano    2024';
      const nombreEsperado = 'Copa de Verano 2024';
      
      // Act
      const nombreTorneo = new NombreTorneo(nombreConEspaciosMultiples);
      
      // Assert
      expect(nombreTorneo.valor).toBe(nombreEsperado);
    });
  });

  describe('Comportamiento de Value Object', () => {
    it('debe ser inmutable', () => {
      // Arrange
      const nombre = 'Copa de Verano 2024';
      const nombreTorneo = new NombreTorneo(nombre);
      
      // Act & Assert
      expect(Object.isFrozen(nombreTorneo)).toBe(true);
      expect(() => nombreTorneo.valor = 'nuevo-nombre').toThrow();
    });

    it('debe implementar equals correctamente', () => {
      // Arrange
      const nombre1 = 'Copa de Verano 2024';
      const nombre2 = 'Copa de Invierno 2024';
      
      const nombreTorneo1a = new NombreTorneo(nombre1);
      const nombreTorneo1b = new NombreTorneo(nombre1);
      const nombreTorneo2 = new NombreTorneo(nombre2);
      
      // Act & Assert
      expect(nombreTorneo1a.equals(nombreTorneo1b)).toBe(true);
      expect(nombreTorneo1a.equals(nombreTorneo2)).toBe(false);
      expect(nombreTorneo1a.equals(null)).toBe(false);
      expect(nombreTorneo1a.equals("string")).toBe(false);
    });

    it('debe implementar toString', () => {
      // Arrange
      const nombre = 'Copa de Verano 2024';
      const nombreTorneo = new NombreTorneo(nombre);
      
      // Act & Assert
      expect(nombreTorneo.toString()).toBe(nombre);
    });
  });

  describe('Métodos de consulta', () => {
    it('debe verificar si contiene término de búsqueda', () => {
      // Arrange
      const nombreTorneo = new NombreTorneo('Copa de League of Legends 2024');
      
      // Act & Assert
      expect(nombreTorneo.contieneTermino('League')).toBe(true);
      expect(nombreTorneo.contieneTermino('league')).toBe(true); // case insensitive
      expect(nombreTorneo.contieneTermino('Copa')).toBe(true);
      expect(nombreTorneo.contieneTermino('Valorant')).toBe(false);
    });

    it('debe obtener longitud del nombre', () => {
      // Arrange
      const nombre = 'Copa de Verano';
      const nombreTorneo = new NombreTorneo(nombre);
      
      // Act & Assert
      expect(nombreTorneo.longitud()).toBe(nombre.length);
    });
  });
});