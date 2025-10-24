#!/bin/bash

# Script de deploy para ambiente de produção
# Uso: ./scripts/deploy-production.sh

set -e

echo "🚀 Iniciando deploy para PRODUÇÃO..."

# Verificar se está na branch main
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "❌ Este script deve ser executado na branch 'main'"
    echo "Branch atual: $CURRENT_BRANCH"
    exit 1
fi

# Verificar se há mudanças não commitadas
if [ -n "$(git status --porcelain)" ]; then
    echo "❌ Há mudanças não commitadas. Faça commit antes do deploy."
    git status --short
    exit 1
fi

# Confirmação do usuário
echo "⚠️  ATENÇÃO: Você está prestes a fazer deploy para PRODUÇÃO!"
read -p "Tem certeza que deseja continuar? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deploy cancelado."
    exit 1
fi

# Instalar dependências
echo "📦 Instalando dependências..."
npm ci

# Executar testes completos
echo "🧪 Executando testes unitários..."
npm run test:ci

echo "🧪 Executando testes E2E..."
npm run e2e:ci

# Executar lint
echo "🔍 Executando lint..."
npm run lint

# Build para produção
echo "🔨 Executando build para produção..."
npm run build:prod

# Verificar tamanho do bundle
echo "📊 Analisando tamanho do bundle..."
BUNDLE_SIZE=$(du -sh dist/andestripmanager | cut -f1)
echo "Tamanho do bundle: $BUNDLE_SIZE"

# Verificar se o Firebase CLI está instalado
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI não encontrado. Instalando..."
    npm install -g firebase-tools
fi

# Login no Firebase (se necessário)
echo "🔐 Verificando autenticação Firebase..."
firebase login --no-localhost

# Selecionar projeto de produção
echo "🎯 Selecionando projeto de produção..."
firebase use andestripmanager

# Backup antes do deploy
echo "💾 Executando backup antes do deploy..."
./scripts/backup.sh

# Deploy para Firebase Hosting
echo "🚀 Fazendo deploy para Firebase Hosting (Produção)..."
firebase deploy --only hosting

# Executar testes de smoke
echo "🔍 Executando testes de smoke..."
PROD_URL="https://andestripmanager.web.app"
echo "Aguardando site ficar disponível..."
sleep 15

# Verificar se o site está respondendo
if curl -f -s "$PROD_URL" > /dev/null; then
    echo "✅ Site está respondendo corretamente!"
else
    echo "❌ Site não está respondendo. Verifique o deploy."
    exit 1
fi

# Executar monitoramento pós-deploy
echo "📊 Iniciando monitoramento pós-deploy..."
./scripts/monitor.sh &

echo ""
echo "🎉 Deploy para PRODUÇÃO concluído com sucesso!"
echo "🌐 URL: $PROD_URL"
echo "📊 Console: https://console.firebase.google.com/project/andestripmanager"
echo "📈 Analytics: https://analytics.google.com"
echo ""

# Criar tag de release
TAG_NAME="v$(date +%Y%m%d-%H%M%S)"
git tag -a "$TAG_NAME" -m "Deploy para produção - $TAG_NAME"
git push origin "$TAG_NAME"
echo "🏷️  Tag criada: $TAG_NAME"