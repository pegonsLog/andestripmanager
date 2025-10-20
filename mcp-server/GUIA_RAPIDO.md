# 🚀 Guia Rápido - MCP Server AndesTripManager

## Configuração em 5 minutos

### 1️⃣ Instalar dependências

```bash
cd mcp-server
npm install
```

### 2️⃣ Obter credenciais do Firebase

1. Acesse https://console.firebase.google.com/
2. Selecione o projeto **andestripmanager**
3. Vá em ⚙️ **Configurações do Projeto** → **Contas de serviço**
4. Clique em **Gerar nova chave privada**
5. Salve o arquivo como `serviceAccountKey.json` dentro da pasta `mcp-server/`

### 3️⃣ Compilar

```bash
npm run build
```

### 4️⃣ Testar localmente

```bash
npm start
```

Você deve ver: `🚀 Servidor MCP AndesTripManager iniciado`

## 🔌 Configurar no Claude Desktop

### macOS

Edite o arquivo:
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

### Windows

Edite o arquivo:
```
%APPDATA%\Claude\claude_desktop_config.json
```

### Linux

Edite o arquivo:
```
~/.config/Claude/claude_desktop_config.json
```

### Conteúdo do arquivo

```json
{
  "mcpServers": {
    "andestripmanager": {
      "command": "node",
      "args": ["/home/pegons/apps/andestripmanager/mcp-server/dist/index.js"],
      "env": {
        "FIREBASE_SERVICE_ACCOUNT_PATH": "/home/pegons/apps/andestripmanager/mcp-server/serviceAccountKey.json"
      }
    }
  }
}
```

**⚠️ IMPORTANTE**: Substitua `/CAMINHO_COMPLETO/` pelo caminho real no seu sistema!

Para descobrir o caminho completo, execute na pasta do projeto:
```bash
pwd
```

### Reiniciar Claude Desktop

Feche completamente o Claude Desktop e abra novamente.

## ✅ Verificar se funcionou

No Claude Desktop, você deve ver um ícone de 🔌 ou indicação de servidores MCP conectados.

Teste com prompts como:

- "Liste minhas viagens usando o servidor AndesTripManager"
- "Calcule as estatísticas da minha última viagem"
- "Analise meus padrões de gastos"

## 🎯 Exemplos de Prompts

### Listar viagens
```
Liste todas as minhas viagens do AndesTripManager
```

### Relatório de custos
```
Gere um relatório detalhado de custos da viagem [ID ou nome]
```

### Estatísticas
```
Mostre as estatísticas completas da minha viagem para [destino]
```

### Análise de gastos
```
Analise meus padrões de gastos em todas as viagens e me dê insights
```

### Otimização de rota
```
Sugira otimizações para a rota da minha próxima viagem
```

## 🔧 Comandos úteis

### Desenvolvimento com auto-reload
```bash
npm run dev
```

### Debug com Chrome DevTools
```bash
npm run inspect
```
Depois acesse `chrome://inspect` no Chrome

### Recompilar após mudanças
```bash
npm run build
```

## ❓ Problemas comuns

### "Firebase não inicializado"
- Verifique se o arquivo `serviceAccountKey.json` existe
- Confirme o caminho no `claude_desktop_config.json`

### "Servidor não aparece no Claude"
- Certifique-se de ter compilado: `npm run build`
- Verifique se o caminho está correto (use caminho absoluto)
- Reinicie o Claude Desktop completamente

### "Permission denied"
- Verifique as permissões do arquivo `serviceAccountKey.json`
- Confirme que a conta de serviço tem acesso ao Firestore

## 📚 Próximos passos

Depois de configurar, você pode:

1. **Explorar os dados**: Peça ao Claude para listar suas viagens
2. **Gerar relatórios**: Solicite análises de custos e estatísticas
3. **Obter insights**: Peça sugestões de otimização
4. **Integrar com seu workflow**: Use o MCP em automações

## 🆘 Precisa de ajuda?

Consulte o [README.md](./README.md) completo para mais detalhes.
