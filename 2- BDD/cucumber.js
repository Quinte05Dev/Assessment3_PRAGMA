// cucumber.js - Configuración de Cucumber para BDD
module.exports = {
  // Ubicación de las features
  features: [
    'tests/bdd/features/**/*.feature'
  ],
  
  // Ubicación de los step definitions
  steps: [
    'tests/bdd/steps/**/*.js'
  ],
  
  // Configuración de formatos de salida
  format: [
    'html:reports/cucumber-report.html',
    'json:reports/cucumber-report.json',
    'summary',
    'progress-bar'
  ],
  
  // Configuración para CI/CD
  formatOptions: {
    snippetInterface: 'async-await'
  },
  
  // Configuración de paralelismo
  parallel: 2,
  
  // Tags para ejecución selectiva
  tags: process.env.CUCUMBER_TAGS || 'not @wip',
  
  // Configuración de timeouts
  timeout: 10000,
  
  // Configuración específica por ambiente
  profiles: {
    // Perfil para desarrollo local
    dev: [
      '--tags', '@smoke or @happy-path',
      '--format', 'progress-bar',
      '--format', 'html:reports/dev-report.html'
    ],
    
    // Perfil para CI/CD
    ci: [
      '--format', 'json:reports/cucumber-report.json',
      '--format', 'junit:reports/junit.xml',
      '--tags', 'not @manual and not @wip'
    ],
    
    // Perfil para smoke tests
    smoke: [
      '--tags', '@smoke',
      '--format', 'summary'
    ],
    
    // Perfil para regression testing
    regression: [
      '--tags', 'not @wip and not @manual',
      '--format', 'progress-bar',
      '--format', 'json:reports/regression-report.json'
    ],
    
    // Perfil para validaciones de negocio
    'business-rules': [
      '--tags', '@business-rules',
      '--format', 'pretty',
      '--format', 'html:reports/business-rules-report.html'
    ]
  }
};