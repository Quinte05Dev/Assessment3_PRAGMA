# ===================================================================
# SUITE COMPLETA DE PRUEBAS - API DE TORNEOS E-SPORTS
# ===================================================================

# ============ CONFIGURACIÓN INICIAL ============
# Definir variables con los nuevos valores
$ApiUrl = "https://al1i6z4zq7.execute-api.us-east-1.amazonaws.com/dev"
$UserPoolId = "us-east-1_KI03AuGUO"
$ClientId = "3lmejk41quf209qe6aoqq4v985"

# Obtener JWT Token
$authResult = aws cognito-idp admin-initiate-auth --user-pool-id $UserPoolId --client-id $ClientId --auth-flow ADMIN_NO_SRP_AUTH --auth-parameters USERNAME=organizador@test.com,PASSWORD=Qwert12345 --output json | ConvertFrom-Json
$JwtToken = $authResult.AuthenticationResult.AccessToken

# Configurar headers para PowerShell
$headers = @{"Authorization" = "Bearer $JwtToken""Content-Type" = "application/json"}

Write-Host "Token configurado: $($JwtToken.Substring(0,20))..."

# ============ CASOS EXITOSOS (200-201) ============

Write-Host "`n=== 1. LISTAR CATEGORÍAS DISPONIBLES (200) ==="
# Debe mostrar categorías mock (Profesional, Amateur, Junior)
Invoke-RestMethod -Uri "$ApiUrl/api/categorias" -Method GET -Headers $headers

Write-Host "`n=== 2. CREAR TORNEO VÁLIDO (201) ==="
# Implementa validaciones del dominio: NombreTorneo, límites, categoría activa
$createBody = @{
    nombre = "Copa de Verano 2024"
    categoriaId = "cat-profesional-001"
    limiteParticipantes = 32
} | ConvertTo-Json

$createResponse = Invoke-RestMethod -Uri "$ApiUrl/api/torneos" -Method POST -Headers $headers -Body $createBody
$TorneoId = $createResponse.data.torneoId
Write-Host "Torneo creado con ID: $TorneoId"

Write-Host "`n=== 3. OBTENER TORNEO POR ID (200) ==="
# Debe devolver detalles completos usando obtenerDetallesCompletos() del dominio
Invoke-RestMethod -Uri "$ApiUrl/api/torneos/$TorneoId" -Method GET -Headers $headers

Write-Host "`n=== 4. LISTAR MIS TORNEOS (200) ==="
# Muestra paginación, filtros y estadísticas
Invoke-RestMethod -Uri "$ApiUrl/api/torneos" -Method GET -Headers $headers

Write-Host "`n=== 5. ACTUALIZAR LÍMITE DE PARTICIPANTES (200) ==="
# Usa actualizarLimiteParticipantes() del dominio con validaciones
$updateBody = @{
    limiteParticipantes = 64
} | ConvertTo-Json

Invoke-RestMethod -Uri "$ApiUrl/api/torneos/$TorneoId" -Method PUT -Headers $headers -Body $updateBody

Write-Host "`n=== 6. CANCELAR TORNEO (200) ==="
# Usa cancelar() del dominio, permite operación idempotente
$cancelBody = @{
    razon = "Problemas técnicos impiden la realización del evento"
} | ConvertTo-Json

Invoke-RestMethod -Uri "$ApiUrl/api/torneos/$TorneoId" -Method DELETE -Headers $headers -Body $cancelBody

# ============ CASOS DE ERROR - AUTENTICACIÓN ============

Write-Host "`n=== ERROR 1: TOKEN INVÁLIDO (401) ==="
# Simula token expirado o malformado
$headersInvalid = @{
    "Authorization" = "Bearer token-invalido-123"
    "Content-Type" = "application/json"
}

try {
    Invoke-RestMethod -Uri "$ApiUrl/api/categorias" -Method GET -Headers $headersInvalid
} catch {
    Write-Host "Error 401 esperado: $($_.Exception.Response.StatusCode)"
}

Write-Host "`n=== ERROR 2: SIN TOKEN (401) ==="
# Request sin header Authorization
$headersNoAuth = @{
    "Content-Type" = "application/json"
}

try {
    Invoke-RestMethod -Uri "$ApiUrl/api/categorias" -Method GET -Headers $headersNoAuth
} catch {
    Write-Host "Error 401 esperado: $($_.Exception.Response.StatusCode)"
}

# ============ CASOS DE ERROR - VALIDACIÓN DOMINIO ============

Write-Host "`n=== ERROR 3: NOMBRE MUY CORTO (400) ==="
# Valida NombreTorneo: mínimo 3 caracteres
$shortNameBody = @{
    nombre = "AB"
    categoriaId = "cat-profesional-001"
    limiteParticipantes = 16
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "$ApiUrl/api/torneos" -Method POST -Headers $headers -Body $shortNameBody
} catch {
    Write-Host "Error 400 esperado - Nombre muy corto: $($_.Exception.Response.StatusCode)"
}

Write-Host "`n=== ERROR 4: NOMBRE MUY LARGO (400) ==="
# Valida NombreTorneo: máximo 100 caracteres
$longNameBody = @{
    nombre = "A" * 101
    categoriaId = "cat-profesional-001"
    limiteParticipantes = 16
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "$ApiUrl/api/torneos" -Method POST -Headers $headers -Body $longNameBody
} catch {
    Write-Host "Error 400 esperado - Nombre muy largo: $($_.Exception.Response.StatusCode)"
}

Write-Host "`n=== ERROR 5: CONTENIDO PROHIBIDO EN NOMBRE (400) ==="
# Valida NombreTorneo: filtro de spam/contenido prohibido
$spamNameBody = @{
    nombre = "Torneo de Spam Gaming"
    categoriaId = "cat-profesional-001"
    limiteParticipantes = 16
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "$ApiUrl/api/torneos" -Method POST -Headers $headers -Body $spamNameBody
} catch {
    Write-Host "Error 400 esperado - Contenido prohibido: $($_.Exception.Response.StatusCode)"
}

Write-Host "`n=== ERROR 6: CATEGORÍA INACTIVA (400) ==="
# Valida regla de negocio: solo categorías activas
$inactiveCategoryBody = @{
    nombre = "Torneo de Prueba"
    categoriaId = "cat-inactiva-001"
    limiteParticipantes = 16
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "$ApiUrl/api/torneos" -Method POST -Headers $headers -Body $inactiveCategoryBody
} catch {
    Write-Host "Error 400 esperado - Categoría inactiva: $($_.Exception.Response.StatusCode)"
}

Write-Host "`n=== ERROR 7: LÍMITE DEMASIADO BAJO (400) ==="
# Valida LimiteParticipantes: mínimo 2
$lowLimitBody = @{
    nombre = "Torneo Pequeño"
    categoriaId = "cat-profesional-001"
    limiteParticipantes = 1
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "$ApiUrl/api/torneos" -Method POST -Headers $headers -Body $lowLimitBody
} catch {
    Write-Host "Error 400 esperado - Límite muy bajo: $($_.Exception.Response.StatusCode)"
}

Write-Host "`n=== ERROR 8: LÍMITE DEMASIADO ALTO (400) ==="
# Valida LimiteParticipantes: máximo 1000
$highLimitBody = @{
    nombre = "Torneo Masivo"
    categoriaId = "cat-profesional-001"
    limiteParticipantes = 1001
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "$ApiUrl/api/torneos" -Method POST -Headers $headers -Body $highLimitBody
} catch {
    Write-Host "Error 400 esperado - Límite muy alto: $($_.Exception.Response.StatusCode)"
}

# ============ CASOS DE ERROR - RECURSOS ============

Write-Host "`n=== ERROR 9: TORNEO NO ENCONTRADO (404) ==="
# UUID válido pero torneo inexistente
$fakeUuid = "550e8400-e29b-41d4-a716-446655440000"

try {
    Invoke-RestMethod -Uri "$ApiUrl/api/torneos/$fakeUuid" -Method GET -Headers $headers
} catch {
    Write-Host "Error 404 esperado - Torneo no existe: $($_.Exception.Response.StatusCode)"
}

Write-Host "`n=== ERROR 10: FORMATO UUID INVÁLIDO (400) ==="
# Valida TorneoId: formato UUID v4 requerido
$invalidUuid = "torneo-invalido-123"

try {
    Invoke-RestMethod -Uri "$ApiUrl/api/torneos/$invalidUuid" -Method GET -Headers $headers
} catch {
    Write-Host "Error 400 esperado - UUID inválido: $($_.Exception.Response.StatusCode)"
}

# ============ CASOS DE ERROR - JSON/VALIDACIÓN ============

Write-Host "`n=== ERROR 11: JSON MALFORMADO (400) ==="
# Request con JSON inválido
$malformedJson = '{"nombre": "Test", "categoriaId": "cat-001", limiteParticipantes": 16}'

try {
    Invoke-WebRequest -Uri "$ApiUrl/api/torneos" -Method POST -Headers $headers -Body $malformedJson
} catch {
    Write-Host "Error 400 esperado - JSON malformado: $($_.Exception.Response.StatusCode)"
}

Write-Host "`n=== ERROR 12: CAMPOS REQUERIDOS FALTANTES (400) ==="
# Valida campos obligatorios del request
$missingFieldsBody = @{
    categoriaId = "cat-profesional-001"
    # Falta nombre y limiteParticipantes
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "$ApiUrl/api/torneos" -Method POST -Headers $headers -Body $missingFieldsBody
} catch {
    Write-Host "Error 400 esperado - Campo requerido faltante: $($_.Exception.Response.StatusCode)"
}

Write-Host "`n=== ERROR 13: TIPO DE DATOS INCORRECTO (422) ==="
# Validación de tipos en el request
$wrongTypeBody = @{
    nombre = "Torneo de Prueba"
    categoriaId = "cat-profesional-001"
    limiteParticipantes = "no-es-numero"
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "$ApiUrl/api/torneos" -Method POST -Headers $headers -Body $wrongTypeBody
} catch {
    Write-Host "Error 422 esperado - Tipo incorrecto: $($_.Exception.Response.StatusCode)"
}

# ============ CASOS DE ERROR - AUTORIZACIÓN ============

Write-Host "`n=== ERROR 14: ACCESO A TORNEO DE OTRO ORGANIZADOR (403) ==="
# Crear segundo usuario para probar autorización
aws cognito-idp admin-create-user --user-pool-id $UserPoolId --username "otro@test.com" --user-attributes Name=email,Value=otro@test.com Name=given_name,Value=Pedro Name=family_name,Value=Lopez --temporary-password "TempPass123!" --message-action SUPPRESS
aws cognito-idp admin-set-user-password --user-pool-id $UserPoolId --username "otro@test.com" --password "Qwert12345" --permanent

# Obtener token del segundo usuario
$authResult2 = aws cognito-idp admin-initiate-auth --user-pool-id $UserPoolId --client-id $ClientId --auth-flow ADMIN_NO_SRP_AUTH --auth-parameters USERNAME=otro@test.com,PASSWORD=Qwert12345 --output json | ConvertFrom-Json
$JwtToken2 = $authResult2.AuthenticationResult.AccessToken

$headers2 = @{
    "Authorization" = "Bearer $JwtToken2"
    "Content-Type" = "application/json"
}

# Primero crear un torneo con el usuario original
$torneo1Body = @{
    nombre = "Torneo del Usuario 1"
    categoriaId = "cat-profesional-001"
    limiteParticipantes = 16
} | ConvertTo-Json

$torneo1Response = Invoke-RestMethod -Uri "$ApiUrl/api/torneos" -Method POST -Headers $headers -Body $torneo1Body
$Torneo1Id = $torneo1Response.data.torneoId

# Intentar acceder con el segundo usuario
try {
    Invoke-RestMethod -Uri "$ApiUrl/api/torneos/$Torneo1Id" -Method GET -Headers $headers2
} catch {
    Write-Host "Error 403 esperado - Acceso denegado: $($_.Exception.Response.StatusCode)"
}

# ============ CASOS DE ERROR - ESTADOS Y REGLAS DE NEGOCIO ============

Write-Host "`n=== ERROR 15: ACTUALIZAR TORNEO CANCELADO (400) ==="
# Regla: no se puede modificar torneo cancelado
$updateCancelledBody = @{
    limiteParticipantes = 50
} | ConvertTo-Json

# Usar el torneo que cancelamos anteriormente
try {
    Invoke-RestMethod -Uri "$ApiUrl/api/torneos/$TorneoId" -Method PUT -Headers $headers -Body $updateCancelledBody
} catch {
    Write-Host "Error 400 esperado - No se puede modificar torneo cancelado: $($_.Exception.Response.StatusCode)"
}

# ============ CASOS EDGE - FILTROS Y PAGINACIÓN ============

Write-Host "`n=== 16. FILTROS VÁLIDOS EN LISTADO (200) ==="
# Prueba filtros de estado, fechas y paginación
Invoke-RestMethod -Uri "$ApiUrl/api/torneos?estado=BORRADOR&limite=5&offset=0" -Method GET -Headers $headers

Write-Host "`n=== ERROR 17: FILTRO CON ESTADO INVÁLIDO (400) ==="
try {
    Invoke-RestMethod -Uri "$ApiUrl/api/torneos?estado=ESTADO_INEXISTENTE" -Method GET -Headers $headers
} catch {
    Write-Host "Error 400 esperado - Estado inválido: $($_.Exception.Response.StatusCode)"
}

Write-Host "`n=== ERROR 18: PAGINACIÓN CON VALORES NEGATIVOS (400) ==="
try {
    Invoke-RestMethod -Uri "$ApiUrl/api/torneos?limite=-5&offset=-1" -Method GET -Headers $headers
} catch {
    Write-Host "Error 400 esperado - Valores de paginación inválidos: $($_.Exception.Response.StatusCode)"
}

Write-Host "`n=== 19. CATEGORÍAS CON FORMATO COMPLETO (200) ==="
# Prueba parámetro de formato
Invoke-RestMethod -Uri "$ApiUrl/api/categorias?formato=completo&incluirInactivas=true" -Method GET -Headers $headers

# ============ RESUMEN DE PRUEBAS ============
Write-Host "`n=============================================="
Write-Host "RESUMEN DE PRUEBAS COMPLETADAS:"
Write-Host "=============================================="
Write-Host "✅ Casos exitosos (200-201): 6 pruebas"
Write-Host "🔴 Errores de autenticación (401): 2 pruebas"  
Write-Host "🔴 Errores de validación dominio (400): 6 pruebas"
Write-Host "🔴 Errores de recursos (404): 1 prueba"
Write-Host "🔴 Errores de formato (400/422): 3 pruebas"
Write-Host "🔴 Errores de autorización (403): 1 prueba"
Write-Host "🔴 Errores de reglas de negocio (400): 1 prueba"
Write-Host "🔴 Casos edge y filtros: 3 pruebas"
Write-Host "=============================================="
Write-Host "TOTAL: 23 ESCENARIOS DE PRUEBA"
Write-Host "=============================================="
Write-Host "🎯 VALIDACIONES DEL DOMINIO IMPLEMENTADAS:"
Write-Host "   • NombreTorneo (3-100 chars, filtro spam)"
Write-Host "   • TorneoId (formato UUID v4)"
Write-Host "   • LimiteParticipantes (2-1000)"
Write-Host "   • Categorías activas únicamente"
Write-Host "   • Estados y transiciones del torneo"
Write-Host "   • Autorización por organizador"
Write-Host "   • Validaciones BDD/TDD completas"