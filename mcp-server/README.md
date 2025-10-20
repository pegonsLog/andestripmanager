# AndesTripManager MCP Server

Servidor MCP (Model Context Protocol) para expor dados do AndesTripManager via protocolo padronizado, permitindo que assistentes de IA acessem e analisem informações de viagens.

## 📋 Funcionalidades

### Recursos Disponíveis

O servidor expõe os seguintes recursos via MCP:

- **Viagens**: Lista e detalhes de viagens
- **Paradas**: Informações sobre paradas durante viagens
- **Custos**: Controle de gastos e despesas
- **Dias de Viagem**: Detalhamento dia a dia das viagens

### Ferramentas Disponíveis

O servidor fornece as seguintes ferramentas para análise:

1. **listar_viagens**: Lista todas as viagens de um usuário
2. **obter_viagem**: Obtém detalhes de uma viagem específica
3. **calcular_relatorio_custos**: Gera relatório detalhado de custos
4. **calcular_estatisticas_viagem**: Calcula estatísticas completas
5. **sugerir_otimizacao_rota**: Sugere melhorias na rota
6. **analisar_padroes_gastos**: Analisa padrões de gastos do usuário
7. **buscar_viagens_por_status**: Filtra viagens por status
8. **listar_paradas**: Lista paradas de uma viagem
9. **buscar_paradas_por_tipo**: Filtra paradas por tipo

## 🚀 Instalação

### 1. Instalar dependências

```bash
cd mcp-server
npm install
```

### 2. Configurar Firebase

Você precisa das credenciais do Firebase Admin SDK. Há duas formas:

#### Opção A: Arquivo de credenciais (Recomendado)

1. Acesse o [Console do Firebase](https://console.firebase.google.com/)
2. Vá em **Configurações do Projeto** > **Contas de serviço**
3. Clique em **Gerar nova chave privada**
4. Salve o arquivo como `serviceAccountKey.json` na pasta `mcp-server/`

#### Opção B: Variáveis de ambiente

Copie o arquivo `.env.example` para `.env` e preencha:

```bash
cp .env.example .env
```

Edite o `.env`:

```env
FIREBASE_PROJECT_ID=andestripmanager
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@andestripmanager.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 3. Compilar o projeto

```bash
npm run build
```

## 🔧 Uso

### Executar o servidor

```bash
npm start
```

### Modo desenvolvimento (com watch)

```bash
npm run dev
```

### Modo debug

```bash
npm run inspect
```

## 🔌 Integração com Claude Desktop

Para usar este servidor MCP com o Claude Desktop, adicione ao arquivo de configuração:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "andestripmanager": {
      "command": "node",
      "args": ["/caminho/completo/para/andestripmanager/mcp-server/dist/index.js"],
      "env": {
        "FIREBASE_SERVICE_ACCOUNT_PATH": "/caminho/completo/para/serviceAccountKey.json"
      }
    }
  }
}
```

Reinicie o Claude Desktop após adicionar a configuração.

## 📖 Exemplos de Uso

### Listar viagens de um usuário

```
Prompt para Claude: "Liste todas as minhas viagens usando o servidor AndesTripManager"
```

O Claude usará a ferramenta `listar_viagens` com seu usuarioId.

### Gerar relatório de custos

```
Prompt: "Gere um relatório de custos da minha última viagem"
```

O Claude usará `calcular_relatorio_custos` para gerar análise detalhada.

### Analisar padrões de gastos

```
Prompt: "Analise meus padrões de gastos em todas as viagens"
```

O Claude usará `analisar_padroes_gastos` para identificar tendências.

### Otimizar rota

```
Prompt: "Sugira otimizações para a rota da viagem X"
```

O Claude usará `sugerir_otimizacao_rota` para analisar a sequência de paradas.

## 🛠️ Estrutura do Projeto

```
mcp-server/
├── src/
│   ├── index.ts          # Servidor MCP principal
│   ├── firebase.ts       # Configuração Firebase
│   ├── resources.ts      # Funções de acesso a recursos
│   ├── tools.ts          # Implementação de ferramentas
│   └── types.ts          # Tipos TypeScript
├── dist/                 # Código compilado
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## 🔐 Segurança

- **Nunca** commite o arquivo `serviceAccountKey.json`
- **Nunca** commite o arquivo `.env` com credenciais reais
- O `.gitignore` já está configurado para ignorar esses arquivos
- Use variáveis de ambiente em produção

## 📊 URIs de Recursos

### Listar viagens
```
viagens://list?usuarioId=USER_ID
```

### Detalhes de viagem
```
viagem://detail/VIAGEM_ID
```

### Listar paradas
```
paradas://list/VIAGEM_ID
```

### Listar custos
```
custos://list/VIAGEM_ID
```

### Listar dias
```
dias://list/VIAGEM_ID
```

## 🐛 Troubleshooting

### Erro: "Firebase não inicializado"

Verifique se as credenciais estão corretas e o arquivo existe no caminho especificado.

### Erro: "Permission denied"

Verifique as regras de segurança do Firestore e se a conta de serviço tem permissões adequadas.

### Servidor não aparece no Claude Desktop

1. Verifique se o caminho no `claude_desktop_config.json` está correto
2. Certifique-se de que o projeto foi compilado (`npm run build`)
3. Reinicie o Claude Desktop completamente
4. Verifique os logs do Claude Desktop para erros

## 📝 Logs

O servidor usa `console.error()` para logs, que são capturados pelo cliente MCP. Para debug:

```bash
npm run inspect
```

Depois conecte o Chrome DevTools em `chrome://inspect`.

## 🤝 Contribuindo

Este servidor é parte do projeto AndesTripManager. Para contribuir:

1. Faça suas alterações em `src/`
2. Compile com `npm run build`
3. Teste localmente
4. Envie um pull request

## 📄 Licença

MIT
