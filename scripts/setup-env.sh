#!/bin/bash

# Script para configurar os arquivos de environment
# Execute: ./scripts/setup-env.sh

set -e

ENVS_DIR="src/environments"

echo "🔧 Configurando arquivos de environment..."

# Verifica se os templates existem
if [ ! -f "$ENVS_DIR/environment.template.ts" ]; then
    echo "❌ Erro: Templates não encontrados!"
    exit 1
fi

# Copia os templates se os arquivos não existirem
if [ ! -f "$ENVS_DIR/environment.ts" ]; then
    cp "$ENVS_DIR/environment.template.ts" "$ENVS_DIR/environment.ts"
    echo "✅ Criado: environment.ts"
else
    echo "⚠️  environment.ts já existe (não sobrescrito)"
fi

if [ ! -f "$ENVS_DIR/environment.prod.ts" ]; then
    cp "$ENVS_DIR/environment.prod.template.ts" "$ENVS_DIR/environment.prod.ts"
    echo "✅ Criado: environment.prod.ts"
else
    echo "⚠️  environment.prod.ts já existe (não sobrescrito)"
fi

if [ ! -f "$ENVS_DIR/environment.staging.ts" ]; then
    cp "$ENVS_DIR/environment.staging.template.ts" "$ENVS_DIR/environment.staging.ts"
    echo "✅ Criado: environment.staging.ts"
else
    echo "⚠️  environment.staging.ts já existe (não sobrescrito)"
fi

echo ""
echo "📝 PRÓXIMOS PASSOS:"
echo "1. Edite os arquivos em $ENVS_DIR/"
echo "2. Substitua os placeholders pelas suas API keys reais"
echo "3. OpenWeatherMap: https://home.openweathermap.org/api_keys"
echo "4. Firebase: https://console.firebase.google.com/"
echo ""
echo "⚠️  IMPORTANTE: Nunca commite esses arquivos no Git!"
