// tests/setup/jest.setup.js - Setup global para Jest
const chai = require('chai');

// Global test utilities
global.expect = chai.expect;

// Custom matchers para domain testing
expect.extend({
  // Matcher para Value Objects
  toBeValueObject(received) {
    const pass = received && 
                 typeof received.equals === 'function' &&
                 Object.isFrozen(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid Value Object`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid Value Object (immutable with equals method)`,
        pass: false,
      };
    }
  },

  // Matcher para Domain Events
  toBeDomainEvent(received) {
    const pass = received &&
                 received.aggregateId &&
                 received.fechaOcurrencia &&
                 received.tipoEvento;
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid Domain Event`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid Domain Event`,
        pass: false,
      };
    }
  },

  // Matcher para errores de dominio
  toThrowDomainError(received, expectedMessage) {
    let pass = false;
    let thrownError = null;

    try {
      received();
    } catch (error) {
      thrownError = error;
      pass = error.name === 'ErrorDominio' && 
             (expectedMessage ? error.message.includes(expectedMessage) : true);
    }

    if (pass) {
      return {
        message: () => `expected function not to throw ErrorDominio${expectedMessage ? ` with message "${expectedMessage}"` : ''}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected function to throw ErrorDominio${expectedMessage ? ` with message "${expectedMessage}"` : ''}, but ${thrownError ? `threw: ${thrownError.message}` : 'no error was thrown'}`,
        pass: false,
      };
    }
  }
});

// Global test helpers
global.testHelpers = {
  // Helper para crear IDs únicos en tests
  generateTestId: (prefix = 'test') => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  
  // Helper para crear fechas de test
  createTestDate: (daysFromNow = 0) => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date;
  },
  
  // Helper para validar estructura de eventos
  validateDomainEvent: (event, expectedType, expectedAggregateId) => {
    expect(event).toBeDomainEvent();
    expect(event.tipoEvento).toBe(expectedType);
    if (expectedAggregateId) {
      expect(event.aggregateId).toBe(expectedAggregateId);
    }
  },

  // Helper para capturar y validar errores
  expectError: async (fn, ErrorClass, messageContains) => {
    let error = null;
    try {
      await fn();
    } catch (e) {
      error = e;
    }
    
    expect(error).not.toBeNull();
    if (ErrorClass) {
      expect(error).toBeInstanceOf(ErrorClass);
    }
    if (messageContains) {
      expect(error.message).toContain(messageContains);
    }
    
    return error;
  }
};

// Mock console.log en tests para evitar output innecesario
if (process.env.NODE_ENV === 'test') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: console.error // Mantener errores para debugging
  };
}

// Setup para cada test
beforeEach(() => {
  // Reset mocks
  jest.clearAllMocks();
  
  // Reset time si se está usando fake timers
  if (typeof jest.getRealSystemTime === 'function') {
    jest.useRealTimers();
  }
});

// Cleanup después de cada test
afterEach(() => {
  // Cleanup automático
  jest.restoreAllMocks();
});

// Setup global para suite
beforeAll(() => {
  // Configuración inicial de la suite
  console.info('🧪 Starting TDD Test Suite for Tournament Domain');
});

afterAll(() => {
  console.info('✅ TDD Test Suite Completed');
});