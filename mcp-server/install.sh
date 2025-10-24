#!/bin/bash

# Script de instalação do MCP Server AndesTripManager

echo "🚀 Instalando MCP Server AndesTripManager..."
echo ""

# Verifica se está na pasta correta
if [ ! -f "package.json" ]; then
    echo "❌ Erro: Execute este script dentro da pasta mcp-server/"
    exit 1
fi

# Instala dependências
echo "📦 Instalando dependências..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Erro ao instalar dependências"
    exit 1
fi

# Compila o projeto
echo ""
echo "🔨 Compilando TypeScript..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Erro ao compilar o projeto"
    exit 1
fi

# Verifica se existe arquivo de credenciais
echo ""
if [ ! -f "serviceAccountKey.json" ]; then
    echo "⚠️  ATENÇÃO: Arquivo serviceAccountKey.json não encontrado!"
    echo ""
    echo "Para obter as credenciais do Firebase:"
    echo "1. Acesse https://console.firebase.google.com/"
    echo "2. Selecione o projeto 'andestripmanager'"
    echo "3. Vá em Configurações → Contas de serviço"
    echo "4. Clique em 'Gerar nova chave privada'"
    echo "5. Salve o arquivo como 'serviceAccountKey.json' nesta pasta"
    echo ""
else
    echo "✅ Arquivo de credenciais encontrado"
fi

# Mostra caminho completo para configuração
CURRENT_DIR=$(pwd)
echo ""
echo "✅ Instalação concluída!"
echo ""
echo "📋 Próximos passos:"
echo ""
echo "1. Configure o Claude Desktop adicionando ao arquivo de configuração:"
echo ""

# Detecta sistema operacional
if [[ "$OSTYPE" == "darwin"* ]]; then
    CONFIG_PATH="~/Library/Application Support/Claude/claude_desktop_config.json"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    CONFIG_PATH="%APPDATA%\\Claude\\claude_desktop_config.json"
else
    CONFIG_PATH="~/.config/Claude/claude_desktop_config.json"
fi

echo "   Arquivo: $CONFIG_PATH"
echo ""
echo "   Conteúdo:"
echo '   {'
echo '     "mcpServers": {'
echo '       "andestripmanager": {'
echo '         "command": "node",'
echo "         \"args\": [\"$CURRENT_DIR/dist/index.js\"],"
echo '         "env": {'
echo "           \"FIREBASE_SERVICE_ACCOUNT_PATH\": \"$CURRENT_DIR/serviceAccountKey.json\""
echo '         }'
echo '       }'
echo '     }'
echo '   }'
echo ""
echo "2. Reinicie o Claude Desktop"
echo ""
echo "3. Teste com prompts como:"
echo "   - 'Liste minhas viagens usando o servidor AndesTripManager'"
echo "   - 'Calcule as estatísticas da minha última viagem'"
echo ""
echo "📚 Consulte o GUIA_RAPIDO.md para mais informações"
echo ""
