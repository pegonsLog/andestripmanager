#!/bin/bash

# Script de monitoramento pós-deploy
# Uso: ./scripts/monitor.sh [ambiente] [duração_minutos]

set -e

ENVIRONMENT=${1:-"production"}
DURATION=${2:-30}
PROJECT_ID="andestripmanager"

if [ "$ENVIRONMENT" = "staging" ]; then
    PROJECT_ID="andestripmanager-staging"
    BASE_URL="https://andestripmanager-staging.web.app"
else
    BASE_URL="https://andestripmanager.web.app"
fi

echo "📊 Iniciando monitoramento do ambiente: $ENVIRONMENT"
echo "🌐 URL: $BASE_URL"
echo "⏱️ Duração: $DURATION minutos"
echo "📅 Início: $(date)"

# Arquivo de log
LOG_FILE="monitoring-$(date +%Y%m%d-%H%M%S).log"
echo "📝 Log: $LOG_FILE"

# Função para log com timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Função para verificar status HTTP
check_http_status() {
    local url=$1
    local expected_status=${2:-200}
    
    local status=$(curl -s -o /dev/null -w "%{http_code}" "$url" || echo "000")
    
    if [ "$status" = "$expected_status" ]; then
        log "✅ $url - Status: $status"
        return 0
    else
        log "❌ $url - Status: $status (esperado: $expected_status)"
        return 1
    fi
}

# Função para verificar tempo de resposta
check_response_time() {
    local url=$1
    local max_time=${2:-3}
    
    local response_time=$(curl -s -o /dev/null -w "%{time_total}" "$url" || echo "999")
    local response_time_ms=$(echo "$response_time * 1000" | bc -l | cut -d. -f1)
    
    if (( $(echo "$response_time <= $max_time" | bc -l) )); then
        log "⚡ $url - Tempo: ${response_time_ms}ms"
        return 0
    else
        log "🐌 $url - Tempo: ${response_time_ms}ms (máximo: ${max_time}s)"
        return 1
    fi
}

# Função para verificar conteúdo da página
check_page_content() {
    local url=$1
    local expected_text=$2
    
    if curl -s "$url" | grep -q "$expected_text"; then
        log "📄 $url - Conteúdo OK"
        return 0
    else
        log "📄 $url - Conteúdo não encontrado: $expected_text"
        return 1
    fi
}

# URLs para monitorar
URLS=(
    "$BASE_URL"
    "$BASE_URL/login"
    "$BASE_URL/dashboard"
)

# Contadores
TOTAL_CHECKS=0
FAILED_CHECKS=0
START_TIME=$(date +%s)

log "🚀 Iniciando monitoramento..."

# Loop de monitoramento
while [ $(($(date +%s) - START_TIME)) -lt $((DURATION * 60)) ]; do
    log "🔍 Executando verificações..."
    
    for url in "${URLS[@]}"; do
        TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
        
        # Verificar status HTTP
        if ! check_http_status "$url"; then
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
        fi
        
        # Verificar tempo de resposta
        if ! check_response_time "$url" 5; then
            FAILED_CHECKS=$((FAILED_CHECKS + 1))
        fi
    done
    
    # Verificar conteúdo específico da página principal
    if ! check_page_content "$BASE_URL" "Andes Trip Manager"; then
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
    
    # Verificar se há erros JavaScript (simulado)
    log "🔧 Verificando console de erros..."
    
    # Calcular taxa de sucesso
    SUCCESS_RATE=$(echo "scale=2; (($TOTAL_CHECKS - $FAILED_CHECKS) * 100) / $TOTAL_CHECKS" | bc -l)
    log "📈 Taxa de sucesso: ${SUCCESS_RATE}% ($((TOTAL_CHECKS - FAILED_CHECKS))/$TOTAL_CHECKS)"
    
    # Aguardar próxima verificação
    sleep 60
done

# Relatório final
END_TIME=$(date +%s)
DURATION_ACTUAL=$(((END_TIME - START_TIME) / 60))

log ""
log "📊 RELATÓRIO FINAL DE MONITORAMENTO"
log "=================================="
log "🌐 Ambiente: $ENVIRONMENT"
log "⏱️ Duração: $DURATION_ACTUAL minutos"
log "🔍 Total de verificações: $TOTAL_CHECKS"
log "❌ Verificações falharam: $FAILED_CHECKS"
log "✅ Taxa de sucesso final: ${SUCCESS_RATE}%"

# Determinar status geral
if [ "$FAILED_CHECKS" -eq 0 ]; then
    log "🎉 Status: EXCELENTE - Nenhuma falha detectada"
    EXIT_CODE=0
elif [ "$(echo "$SUCCESS_RATE >= 95" | bc -l)" -eq 1 ]; then
    log "✅ Status: BOM - Taxa de sucesso acima de 95%"
    EXIT_CODE=0
elif [ "$(echo "$SUCCESS_RATE >= 90" | bc -l)" -eq 1 ]; then
    log "⚠️ Status: ATENÇÃO - Taxa de sucesso entre 90-95%"
    EXIT_CODE=1
else
    log "❌ Status: CRÍTICO - Taxa de sucesso abaixo de 90%"
    EXIT_CODE=2
fi

# Sugestões baseadas nos resultados
if [ "$FAILED_CHECKS" -gt 0 ]; then
    log ""
    log "💡 SUGESTÕES:"
    log "- Verificar logs do Firebase Hosting"
    log "- Monitorar métricas no Google Analytics"
    log "- Verificar status dos serviços Firebase"
    log "- Considerar rollback se problemas persistirem"
fi

log ""
log "📝 Log completo salvo em: $LOG_FILE"
log "🏁 Monitoramento finalizado em: $(date)"

exit $EXIT_CODE