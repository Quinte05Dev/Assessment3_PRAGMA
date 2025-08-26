#!/bin/bash

# deploy.sh - Script automatizado de deployment para AWS
# Uso: ./scripts/deploy.sh [dev|staging|prod]

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Verificar parámetros
STAGE=${1:-dev}

if [[ ! "$STAGE" =~ ^(dev|staging|prod)$ ]]; then
    error "Stage debe ser uno de: dev, staging, prod"
    echo "Uso: $0 [dev|staging|prod]"
    exit 1
fi

log "Iniciando deployment para stage: $STAGE"

# Verificar herramientas requeridas
command -v sam >/dev/null 2>&1 || { error "SAM CLI es requerido pero no está instalado."; exit 1; }
command -v aws >/dev/null 2>&1 || { error "AWS CLI es requerido pero no está instalado."; exit 1; }
command -v node >/dev/null 2>&1 || { error "Node.js es requerido pero no está instalado."; exit 1; }

# Verificar configuración de AWS
if ! aws sts get-caller-identity >/dev/null 2>&1; then
    error "AWS credentials no están configuradas correctamente"
    exit 1
fi

AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=$(aws configure get region)

log "Cuenta AWS: $AWS_ACCOUNT_ID"
log "Región: $AWS_REGION"

# Verificar Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    error "Node.js 18 o superior es requerido. Versión actual: $(node --version)"
    exit 1
fi

# Limpiar builds anteriores
log "Limpiando builds anteriores..."
rm -rf .aws-sam/

# Instalar dependencias
log "Instalando dependencias..."
npm install

# Ejecutar tests unitarios antes del deployment
log "Ejecutando tests unitarios..."
npm test

# Validar template SAM
log "Validando template SAM..."
sam validate

# Build con SAM
log "Compilando aplicación con SAM..."
sam build --parallel

# Configurar parámetros por stage
STACK_NAME="tournament-api-$STAGE"
PARAMETERS="Stage=$STAGE"

# Parámetros específicos por ambiente
case $STAGE in
    "dev")
        PARAMETERS="$PARAMETERS"
        ;;
    "staging")
        PARAMETERS="$PARAMETERS"
        ;;
    "prod")
        PARAMETERS="$PARAMETERS"
        warning "Deployment a PRODUCCIÓN. Confirma que este es el comportamiento deseado."
        read -p "¿Continuar con deployment a producción? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "Deployment cancelado por el usuario"
            exit 0
        fi
        ;;
esac

# Deploy con confirmación changeset
log "Iniciando deployment de stack: $STACK_NAME"

# Verificar si es primera vez (stack no existe)
if aws cloudformation describe-stacks --stack-name "$STACK_NAME" >/dev/null 2>&1; then
    log "Actualizando stack existente..."
    DEPLOYMENT_TYPE="UPDATE"
else
    log "Creando nuevo stack..."
    DEPLOYMENT_TYPE="CREATE"
fi

# Ejecutar deployment
sam deploy \
    --stack-name "$STACK_NAME" \
    --parameter-overrides $PARAMETERS \
    --capabilities CAPABILITY_IAM \
    --confirm-changeset \
    --fail-on-empty-changeset false

if [ $? -eq 0 ]; then
    success "Deployment completado exitosamente!"
else
    error "Deployment falló"
    exit 1
fi

# Obtener outputs del stack
log "Obteniendo información del deployment..."

API_URL=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
    --output text)

USER_POOL_ID=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
    --output text)

USER_POOL_CLIENT_ID=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --query 'Stacks[0].Outputs[?OutputKey==`UserPoolClientId`].OutputValue' \
    --output text)

# Mostrar información importante
echo ""
success "=== DEPLOYMENT COMPLETADO ==="
echo ""
echo "Stack Name: $STACK_NAME"
echo "Stage: $STAGE"
echo "API URL: $API_URL"
echo "User Pool ID: $USER_POOL_ID"
echo "User Pool Client ID: $USER_POOL_CLIENT_ID"
echo ""

# Guardar configuración en archivo para uso posterior
CONFIG_FILE="deployment-config-$STAGE.json"
cat > "$CONFIG_FILE" << EOF
{
  "stage": "$STAGE",
  "stackName": "$STACK_NAME",
  "apiUrl": "$API_URL",
  "userPoolId": "$USER_POOL_ID",
  "userPoolClientId": "$USER_POOL_CLIENT_ID",
  "awsRegion": "$AWS_REGION",
  "awsAccountId": "$AWS_ACCOUNT_ID",
  "deploymentDate": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "deploymentType": "$DEPLOYMENT_TYPE"
}
EOF

log "Configuración guardada en: $CONFIG_FILE"

# Verificar salud de la API
log "Verificando salud de la API..."
sleep 5

if curl -f -s "$API_URL/api/categorias" -H "Authorization: Bearer dummy-token-for-test" >/dev/null; then
    success "API respondiendo correctamente"
else
    warning "API no responde o requiere autenticación válida"
fi

# Mostrar comandos útiles
echo ""
log "Comandos útiles:"
echo "  Ver logs: sam logs -n CrearTorneoFunction --stack-name $STACK_NAME --tail"
echo "  Test local: sam local start-api"
echo "  Cleanup: aws cloudformation delete-stack --stack-name $STACK_NAME"
echo ""

success "Deployment completado exitosamente para stage: $STAGE"