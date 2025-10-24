#!/bin/bash

# Script para executar testes E2E completos do Andes Trip Manager
# Uso: ./scripts/run-e2e-tests.sh [ambiente] [dispositivo]

set -e

# Configurações padrão
AMBIENTE=${1:-"local"}
DISPOSITIVO=${2:-"desktop"}
BROWSER=${3:-"chrome"}

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

# Verificar dependências
check_dependencies() {
    log "Verificando dependências..."
    
    if ! command -v node &> /dev/null; then
        error "Node.js não encontrado. Instale Node.js 18 ou superior."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        error "npm não encontrado. Instale npm."
        exit 1
    fi
    
    # Verificar versão do Node
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        error "Node.js versão 18 ou superior é necessária. Versão atual: $(node -v)"
        exit 1
    fi
    
    success "Dependências verificadas"
}

# Configurar ambiente
setup_environment() {
    log "Configurando ambiente: $AMBIENTE"
    
    case $AMBIENTE in
        "local")
            export CYPRESS_baseUrl="http://localhost:4200"
            ;;
        "staging")
            export CYPRESS_baseUrl="https://staging.andestripmanager.com"
            ;;
        "production")
            export CYPRESS_baseUrl="https://andestripmanager.com"
            ;;
        *)
            error "Ambiente inválido: $AMBIENTE. Use: local, staging, ou production"
            exit 1
            ;;
    esac
    
    success "Ambiente configurado: $CYPRESS_baseUrl"
}

# Configurar viewport baseado no dispositivo
setup_viewport() {
    log "Configurando viewport para: $DISPOSITIVO"
    
    case $DISPOSITIVO in
        "mobile")
            export CYPRESS_viewportWidth=375
            export CYPRESS_viewportHeight=667
            ;;
        "tablet")
            export CYPRESS_viewportWidth=768
            export CYPRESS_viewportHeight=1024
            ;;
        "desktop")
            export CYPRESS_viewportWidth=1280
            export CYPRESS_viewportHeight=720
            ;;
        "large")
            export CYPRESS_viewportWidth=1920
            export CYPRESS_viewportHeight=1080
            ;;
        *)
            error "Dispositivo inválido: $DISPOSITIVO. Use: mobile, tablet, desktop, ou large"
            exit 1
            ;;
    esac
    
    success "Viewport configurado: ${CYPRESS_viewportWidth}x${CYPRESS_viewportHeight}"
}

# Instalar dependências
install_dependencies() {
    log "Instalando dependências..."
    npm ci
    success "Dependências instaladas"
}

# Build da aplicação (apenas para ambiente local)
build_application() {
    if [ "$AMBIENTE" = "local" ]; then
        log "Fazendo build da aplicação..."
        npm run build
        success "Build concluído"
    fi
}

# Iniciar servidor (apenas para ambiente local)
start_server() {
    if [ "$AMBIENTE" = "local" ]; then
        log "Iniciando servidor de desenvolvimento..."
        npm start &
        SERVER_PID=$!
        
        # Aguardar servidor estar pronto
        log "Aguardando servidor estar pronto..."
        npx wait-on http://localhost:4200 --timeout 120000
        
        if [ $? -eq 0 ]; then
            success "Servidor iniciado (PID: $SERVER_PID)"
        else
            error "Timeout aguardando servidor"
            kill $SERVER_PID 2>/dev/null || true
            exit 1
        fi
    fi
}

# Executar testes específicos
run_auth_tests() {
    log "Executando testes de autenticação..."
    npx cypress run \
        --spec "cypress/e2e/01-autenticacao.cy.ts" \
        --browser $BROWSER \
        --headless \
        --reporter json \
        --reporter-options "output=cypress/reports/auth-results.json"
}

run_viagem_tests() {
    log "Executando testes de gerenciamento de viagens..."
    npx cypress run \
        --spec "cypress/e2e/02-gerenciamento-viagens.cy.ts" \
        --browser $BROWSER \
        --headless \
        --reporter json \
        --reporter-options "output=cypress/reports/viagem-results.json"
}

run_offline_tests() {
    log "Executando testes de funcionalidades offline..."
    npx cypress run \
        --spec "cypress/e2e/03-funcionalidades-offline.cy.ts" \
        --browser $BROWSER \
        --headless \
        --config "defaultCommandTimeout=15000,requestTimeout=15000" \
        --reporter json \
        --reporter-options "output=cypress/reports/offline-results.json"
}

run_responsive_tests() {
    log "Executando testes de responsividade..."
    npx cypress run \
        --spec "cypress/e2e/04-responsividade.cy.ts" \
        --browser $BROWSER \
        --headless \
        --reporter json \
        --reporter-options "output=cypress/reports/responsive-results.json"
}

run_complete_flow_tests() {
    log "Executando testes de fluxo completo..."
    npx cypress run \
        --spec "cypress/e2e/05-fluxo-completo-usuario.cy.ts" \
        --browser $BROWSER \
        --headless \
        --config "defaultCommandTimeout=20000" \
        --reporter json \
        --reporter-options "output=cypress/reports/complete-flow-results.json"
}

run_accessibility_tests() {
    log "Executando testes de acessibilidade..."
    npx cypress run \
        --spec "cypress/e2e/06-acessibilidade.cy.ts" \
        --browser $BROWSER \
        --headless \
        --reporter json \
        --reporter-options "output=cypress/reports/accessibility-results.json"
}

# Executar todos os testes
run_all_tests() {
    log "Executando todos os testes E2E..."
    
    # Criar diretório de relatórios
    mkdir -p cypress/reports
    
    # Executar cada suite de testes
    run_auth_tests
    run_viagem_tests
    run_offline_tests
    run_responsive_tests
    run_complete_flow_tests
    run_accessibility_tests
    
    success "Todos os testes executados"
}

# Gerar relatório consolidado
generate_report() {
    log "Gerando relatório consolidado..."
    
    # Criar relatório HTML simples
    cat > cypress/reports/index.html << EOF
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatório de Testes E2E - Andes Trip Manager</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 20px; }
        .header { background: #2196F3; color: white; padding: 20px; border-radius: 8px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .card { background: #f5f5f5; padding: 20px; border-radius: 8px; text-align: center; }
        .success { background: #4CAF50; color: white; }
        .warning { background: #FF9800; color: white; }
        .error { background: #F44336; color: white; }
        .details { margin: 20px 0; }
        .test-suite { margin: 10px 0; padding: 15px; border-left: 4px solid #2196F3; background: #f9f9f9; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Relatório de Testes E2E</h1>
        <p>Andes Trip Manager - $(date)</p>
        <p>Ambiente: $AMBIENTE | Dispositivo: $DISPOSITIVO | Browser: $BROWSER</p>
    </div>
    
    <div class="summary">
        <div class="card success">
            <h3>Testes Executados</h3>
            <p id="total-tests">-</p>
        </div>
        <div class="card success">
            <h3>Sucessos</h3>
            <p id="passed-tests">-</p>
        </div>
        <div class="card error">
            <h3>Falhas</h3>
            <p id="failed-tests">-</p>
        </div>
        <div class="card">
            <h3>Taxa de Sucesso</h3>
            <p id="success-rate">-</p>
        </div>
    </div>
    
    <div class="details">
        <h2>Detalhes por Suite</h2>
        
        <div class="test-suite">
            <h3>🔐 Autenticação</h3>
            <p>Testes de login, registro e logout</p>
        </div>
        
        <div class="test-suite">
            <h3>🗺️ Gerenciamento de Viagens</h3>
            <p>CRUD de viagens, navegação e filtros</p>
        </div>
        
        <div class="test-suite">
            <h3>📱 Funcionalidades Offline</h3>
            <p>Cache, sincronização e resolução de conflitos</p>
        </div>
        
        <div class="test-suite">
            <h3>📐 Responsividade</h3>
            <p>Adaptação para diferentes dispositivos e orientações</p>
        </div>
        
        <div class="test-suite">
            <h3>🔄 Fluxo Completo</h3>
            <p>Jornadas completas de usuário</p>
        </div>
        
        <div class="test-suite">
            <h3>♿ Acessibilidade</h3>
            <p>Navegação por teclado, leitores de tela e contraste</p>
        </div>
    </div>
</body>
</html>
EOF
    
    success "Relatório gerado: cypress/reports/index.html"
}

# Cleanup
cleanup() {
    if [ ! -z "$SERVER_PID" ]; then
        log "Parando servidor (PID: $SERVER_PID)..."
        kill $SERVER_PID 2>/dev/null || true
        success "Servidor parado"
    fi
}

# Trap para cleanup em caso de interrupção
trap cleanup EXIT INT TERM

# Função principal
main() {
    log "Iniciando execução de testes E2E"
    log "Ambiente: $AMBIENTE | Dispositivo: $DISPOSITIVO | Browser: $BROWSER"
    
    check_dependencies
    setup_environment
    setup_viewport
    install_dependencies
    build_application
    start_server
    run_all_tests
    generate_report
    
    success "Execução de testes E2E concluída!"
    log "Relatórios disponíveis em: cypress/reports/"
    
    if [ -d "cypress/screenshots" ] && [ "$(ls -A cypress/screenshots)" ]; then
        warning "Screenshots de falhas encontrados em: cypress/screenshots/"
    fi
    
    if [ -d "cypress/videos" ] && [ "$(ls -A cypress/videos)" ]; then
        log "Vídeos dos testes disponíveis em: cypress/videos/"
    fi
}

# Verificar se o script está sendo executado diretamente
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi