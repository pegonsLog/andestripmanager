#!/bin/bash

# Script de backup do Firestore e Storage
# Uso: ./scripts/backup.sh [projeto]

set -e

PROJECT_ID=${1:-"andestripmanager"}
BACKUP_DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="backups/$BACKUP_DATE"

echo "💾 Iniciando backup do projeto: $PROJECT_ID"
echo "📅 Data: $BACKUP_DATE"

# Criar diretório de backup
mkdir -p "$BACKUP_DIR"

# Verificar se o Firebase CLI está instalado
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI não encontrado. Instalando..."
    npm install -g firebase-tools
fi

# Verificar se gcloud está instalado para backup do Firestore
if ! command -v gcloud &> /dev/null; then
    echo "❌ Google Cloud SDK não encontrado."
    echo "Para backup completo do Firestore, instale: https://cloud.google.com/sdk/docs/install"
    echo "Continuando com backup limitado..."
    GCLOUD_AVAILABLE=false
else
    GCLOUD_AVAILABLE=true
fi

# Selecionar projeto
firebase use "$PROJECT_ID"

echo "📊 Coletando informações do projeto..."

# Backup das regras do Firestore
echo "🔒 Backup das regras do Firestore..."
firebase firestore:rules > "$BACKUP_DIR/firestore.rules"

# Backup dos índices do Firestore
echo "📇 Backup dos índices do Firestore..."
firebase firestore:indexes > "$BACKUP_DIR/firestore.indexes.json"

# Backup das regras do Storage
echo "🗄️ Backup das regras do Storage..."
firebase storage:rules > "$BACKUP_DIR/storage.rules"

# Backup da configuração do Firebase
echo "⚙️ Backup da configuração do Firebase..."
cp firebase.json "$BACKUP_DIR/"

# Backup das configurações de hosting
echo "🌐 Backup das configurações de hosting..."
firebase hosting:sites:list --json > "$BACKUP_DIR/hosting-sites.json"

# Backup completo do Firestore (se gcloud disponível)
if [ "$GCLOUD_AVAILABLE" = true ]; then
    echo "🗃️ Executando backup completo do Firestore..."
    
    # Configurar projeto no gcloud
    gcloud config set project "$PROJECT_ID"
    
    # Criar backup do Firestore
    BACKUP_NAME="backup-$BACKUP_DATE"
    BUCKET_NAME="gs://$PROJECT_ID-backups"
    
    echo "Criando backup: $BACKUP_NAME"
    gcloud firestore export "$BUCKET_NAME/$BACKUP_NAME" \
        --collection-ids=users,viagens,dias-viagem,paradas,hospedagens,custos,clima,manutencoes,diario-bordo
    
    echo "✅ Backup do Firestore criado em: $BUCKET_NAME/$BACKUP_NAME"
else
    echo "⚠️ Backup limitado - apenas regras e configurações"
fi

# Backup das variáveis de ambiente (sem valores sensíveis)
echo "🔧 Backup das configurações de ambiente..."
cat > "$BACKUP_DIR/environment-template.ts" << EOF
// Template das configurações de ambiente
// Gerado em: $BACKUP_DATE
export const environment = {
    production: false,
    staging: false,
    firebase: {
        apiKey: "YOUR_API_KEY",
        authDomain: "YOUR_PROJECT.firebaseapp.com",
        projectId: "YOUR_PROJECT_ID",
        storageBucket: "YOUR_PROJECT.firebasestorage.app",
        messagingSenderId: "YOUR_SENDER_ID",
        appId: "YOUR_APP_ID",
        measurementId: "YOUR_MEASUREMENT_ID"
    },
    weather: {
        apiKey: "YOUR_OPENWEATHER_API_KEY",
        baseUrl: "https://api.openweathermap.org/data/2.5",
        units: "metric",
        lang: "pt_br"
    },
    debug: true,
    logLevel: 'debug'
};
EOF

# Backup do package.json e package-lock.json
echo "📦 Backup das dependências..."
cp package.json "$BACKUP_DIR/"
cp package-lock.json "$BACKUP_DIR/"

# Backup das configurações do Angular
echo "🅰️ Backup das configurações do Angular..."
cp angular.json "$BACKUP_DIR/"
cp tsconfig.json "$BACKUP_DIR/"

# Criar arquivo de informações do backup
cat > "$BACKUP_DIR/backup-info.json" << EOF
{
  "project": "$PROJECT_ID",
  "date": "$BACKUP_DATE",
  "timestamp": $(date +%s),
  "version": "$(git describe --tags --always 2>/dev/null || echo 'unknown')",
  "branch": "$(git branch --show-current 2>/dev/null || echo 'unknown')",
  "commit": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "gcloud_available": $GCLOUD_AVAILABLE,
  "files": [
    "firestore.rules",
    "firestore.indexes.json",
    "storage.rules",
    "firebase.json",
    "hosting-sites.json",
    "environment-template.ts",
    "package.json",
    "package-lock.json",
    "angular.json",
    "tsconfig.json"
  ]
}
EOF

# Compactar backup
echo "🗜️ Compactando backup..."
tar -czf "backup-$PROJECT_ID-$BACKUP_DATE.tar.gz" -C backups "$BACKUP_DATE"

# Limpar diretório temporário
rm -rf "$BACKUP_DIR"

echo ""
echo "✅ Backup concluído com sucesso!"
echo "📁 Arquivo: backup-$PROJECT_ID-$BACKUP_DATE.tar.gz"
echo "📊 Tamanho: $(du -h backup-$PROJECT_ID-$BACKUP_DATE.tar.gz | cut -f1)"

# Manter apenas os últimos 10 backups
echo "🧹 Limpando backups antigos..."
ls -t backup-*.tar.gz 2>/dev/null | tail -n +11 | xargs -r rm
echo "Mantidos os 10 backups mais recentes"

echo ""
echo "💡 Para restaurar um backup:"
echo "   1. Extrair: tar -xzf backup-$PROJECT_ID-$BACKUP_DATE.tar.gz"
echo "   2. Restaurar regras: firebase deploy --only firestore:rules,storage:rules"
echo "   3. Restaurar índices: firebase deploy --only firestore:indexes"
echo ""