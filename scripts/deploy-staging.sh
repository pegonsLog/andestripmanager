#!/bin/bash

# Script de deploy para ambiente de staging
# Uso: ./scripts/deploy-staging.sh

set -e

echo "🚀 Iniciando deploy para STAGING..."

# Verificar se está na branch develop
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "develop" ]; then
    echo "❌ Este script deve ser executado na branch 'develop'"
    echo "Branch atual: $CURRENT_BRANCH"
    exit 1
fi

# Verificar se há mudanças não commitadas
if [ -n "$(git status --porcelain)" ]; then
    echo "❌ Há mudanças não commitadas. Faça commit antes do deploy."
    git status --short
    exit 1
fi

# Instalar dependências
echo "📦 Instalando dependências..."
npm ci

# Executar testes
echo "🧪 Executando testes..."
npm run test:ci

# Executar lint
echo "🔍 Executando lint..."
npm run lint

# Build para staging
echo "🔨 Executando build para staging..."
npm run build:staging

# Verificar se o Firebase CLI está instalado
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI não encontrado. Instalando..."
    npm install -g firebase-tools
fi

# Login no Firebase (se necessário)
echo "🔐 Verificando autenticação Firebase..."
firebase login --no-localhost

# Selecionar projeto de staging
echo "🎯 Selecionando projeto de staging..."
firebase use andestripmanager-staging

# Deploy para Firebase Hosting
echo "🚀 Fazendo deploy para Firebase Hosting (Staging)..."
firebase deploy --only hosting:staging

# Executar testes de smoke
echo "🔍 Executando testes de smoke..."
STAGING_URL="https://andestripmanager-staging.web.app"
echo "Aguardando site ficar disponível..."
sleep 10

# Verificar se o site está respondendo
if curl -f -s "$STAGING_URL" > /dev/null; then
    echo "✅ Site está respondendo corretamente!"
else
    echo "❌ Site não está respondendo. Verifique o deploy."
    exit 1
fi

echo ""
echo "🎉 Deploy para STAGING concluído com sucesso!"
echo "🌐 URL: $STAGING_URL"
echo "📊 Logs: https://console.firebase.google.com/project/andestripmanager-staging/hosting"
echo ""