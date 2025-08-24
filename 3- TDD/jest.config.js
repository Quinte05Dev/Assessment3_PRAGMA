// jest.config.js - Configuración Jest para TDD
module.exports = {
  // Ambiente de testing
  testEnvironment: 'node',
  
  // Patrones de archivos de test
  testMatch: [
    '**/tests/unit/**/*.test.js',
    '**/tests/unit/**/*.spec.js',
    '**/__tests__/**/*.js'
  ],
  
  // Directorios a ignorar
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/',
    '/reports/'
  ],
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],
  
  // Coverage thresholds (para TDD de calidad)
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    },
    // Thresholds específicos para domain
    './src/domain/**/*.js': {
      branches: 90,
      functions: 95,
      lines: 90,
      statements: 90
    }
  },
  
  // Archivos a incluir en coverage
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/*.spec.js',
    '!src/**/index.js',
    '!src/infrastructure/**/*.js' // Excluir infra por ahora
  ],
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup/jest.setup.js'
  ],
  
  // Module paths
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@domain/(.*)$': '<rootDir>/src/domain/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },
  
  // Verbose output para TDD
  verbose: true,
  
  // Watch mode configuration
  watchman: true,
  watchPathIgnorePatterns: [
    'node_modules',
    'reports',
    'coverage'
  ],
  
  // Performance
  maxWorkers: '50%',
  
  // Error handling
  errorOnDeprecated: true,
  
  // Custom test results processor
  testResultsProcessor: '<rootDir>/tests/setup/results-processor.js'
};

// Configuración específica para diferentes ambientes
if (process.env.NODE_ENV === 'ci') {
  module.exports.reporters = [
    'default',
    ['jest-junit', { 
      outputDirectory: 'reports',
      outputName: 'jest-junit.xml'
    }]
  ];
}

// Watch mode solo en desarrollo
if (process.env.NODE_ENV !== 'ci') {
  module.exports.watchAll = false;
  module.exports.watch = true;
}