# 🔌 Integração MCP no AndesTripManager

## O que é MCP?

**MCP (Model Context Protocol)** é um protocolo aberto criado pela Anthropic que permite que assistentes de IA (como Claude) acessem dados e ferramentas de forma padronizada e segura.

## Por que usar MCP no AndesTripManager?

Com MCP, você pode:

✅ **Consultar suas viagens** diretamente no Claude Desktop  
✅ **Gerar relatórios automáticos** de custos e estatísticas  
✅ **Obter insights** sobre padrões de gastos  
✅ **Otimizar rotas** com sugestões inteligentes  
✅ **Analisar dados** sem precisar abrir o aplicativo  

## 🏗️ Arquitetura

```
┌─────────────────────────────────────┐
│   Claude Desktop / Cliente MCP      │
│   - Interface de conversação        │
│   - Executa ferramentas MCP         │
└──────────────┬──────────────────────┘
               │ MCP Protocol
               ▼
┌─────────────────────────────────────┐
│   MCP Server (Node.js)              │
│   - Expõe recursos e ferramentas    │
│   - Conecta com Firebase            │
└──────────────┬──────────────────────┘
               │ Firebase Admin SDK
               ▼
┌─────────────────────────────────────┐
│   Firebase (Firestore + Storage)    │
│   - Dados de viagens, paradas, etc  │
└─────────────────────────────────────┘
```

## 📦 O que foi implementado

### Servidor MCP (`/mcp-server`)

Um servidor Node.js/TypeScript que:

1. **Conecta com Firebase** usando Admin SDK
2. **Expõe recursos** via URIs padronizadas
3. **Fornece ferramentas** para análise de dados
4. **Comunica via stdio** com clientes MCP

### Recursos Disponíveis

| Recurso | URI | Descrição |
|---------|-----|-----------|
| Viagens | `viagens://list?usuarioId=X` | Lista todas as viagens |
| Viagem | `viagem://detail/{id}` | Detalhes de uma viagem |
| Paradas | `paradas://list/{viagemId}` | Paradas de uma viagem |
| Custos | `custos://list/{viagemId}` | Custos de uma viagem |
| Dias | `dias://list/{viagemId}` | Dias de uma viagem |

### Ferramentas Disponíveis

| Ferramenta | Parâmetros | Retorno |
|------------|------------|---------|
| `listar_viagens` | `usuarioId` | Array de viagens |
| `obter_viagem` | `viagemId` | Detalhes da viagem |
| `calcular_relatorio_custos` | `viagemId` | Relatório financeiro |
| `calcular_estatisticas_viagem` | `viagemId` | Estatísticas completas |
| `sugerir_otimizacao_rota` | `viagemId` | Sugestões de melhoria |
| `analisar_padroes_gastos` | `usuarioId` | Análise de gastos |
| `buscar_viagens_por_status` | `usuarioId`, `status` | Viagens filtradas |
| `listar_paradas` | `viagemId` | Array de paradas |
| `buscar_paradas_por_tipo` | `viagemId`, `tipo` | Paradas filtradas |

## 🚀 Como usar

### 1. Instalar o servidor

```bash
cd mcp-server
./install.sh
```

Ou manualmente:

```bash
cd mcp-server
npm install
npm run build
```

### 2. Configurar credenciais Firebase

Obtenha o arquivo `serviceAccountKey.json` do Firebase Console e coloque em `/mcp-server/`.

### 3. Configurar Claude Desktop

Adicione ao arquivo de configuração do Claude:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "andestripmanager": {
      "command": "node",
      "args": ["/caminho/completo/para/mcp-server/dist/index.js"],
      "env": {
        "FIREBASE_SERVICE_ACCOUNT_PATH": "/caminho/completo/para/serviceAccountKey.json"
      }
    }
  }
}
```

### 4. Reiniciar Claude Desktop

Feche e abra o Claude Desktop completamente.

### 5. Testar

No Claude Desktop, experimente:

```
Liste minhas viagens usando o servidor AndesTripManager
```

## 💡 Casos de Uso

### 1. Relatório de Viagem

**Prompt:**
```
Gere um relatório completo da minha última viagem, incluindo:
- Estatísticas gerais
- Análise de custos por categoria
- Paradas realizadas
- Sugestões de otimização
```

**O Claude irá:**
1. Listar suas viagens
2. Identificar a mais recente
3. Calcular estatísticas
4. Gerar relatório de custos
5. Listar paradas
6. Sugerir otimizações

### 2. Análise Financeira

**Prompt:**
```
Analise meus gastos em todas as viagens e me diga:
- Qual categoria eu gasto mais
- Qual viagem foi mais cara
- Qual o custo médio por dia
```

**O Claude irá:**
1. Usar `analisar_padroes_gastos`
2. Processar dados de todas as viagens
3. Gerar insights financeiros

### 3. Planejamento de Viagem

**Prompt:**
```
Estou planejando uma viagem de São Paulo para Salvador.
Baseado nas minhas viagens anteriores, quanto devo orçar?
```

**O Claude irá:**
1. Analisar viagens passadas
2. Calcular médias de gastos
3. Sugerir orçamento baseado em histórico

### 4. Otimização de Rota

**Prompt:**
```
Analise a rota da minha viagem para [destino] e sugira melhorias
```

**O Claude irá:**
1. Obter paradas da viagem
2. Analisar sequência e distâncias
3. Sugerir otimizações

## 🔐 Segurança

### Dados Protegidos

- O servidor MCP roda **localmente** na sua máquina
- Credenciais Firebase ficam **apenas no seu computador**
- Nenhum dado é enviado para servidores externos (exceto Firebase)

### Boas Práticas

✅ **Nunca commite** `serviceAccountKey.json`  
✅ **Nunca commite** `.env` com credenciais  
✅ **Use permissões mínimas** na conta de serviço Firebase  
✅ **Mantenha o servidor atualizado**  

## 🛠️ Desenvolvimento

### Estrutura de Arquivos

```
mcp-server/
├── src/
│   ├── index.ts          # Servidor MCP principal
│   ├── firebase.ts       # Configuração Firebase
│   ├── resources.ts      # Acesso a recursos
│   ├── tools.ts          # Ferramentas de análise
│   └── types.ts          # Tipos TypeScript
├── dist/                 # Código compilado
├── package.json
├── tsconfig.json
├── README.md
├── GUIA_RAPIDO.md
└── install.sh
```

### Adicionar Nova Ferramenta

1. Implemente a função em `src/tools.ts`
2. Adicione ao handler em `src/index.ts` (ListToolsRequestSchema)
3. Adicione ao switch case em CallToolRequestSchema
4. Recompile: `npm run build`

### Adicionar Novo Recurso

1. Implemente a função em `src/resources.ts`
2. Adicione ao handler em `src/index.ts` (ListResourcesRequestSchema)
3. Adicione ao switch case em ReadResourceRequestSchema
4. Recompile: `npm run build`

## 📚 Documentação Adicional

- **[README.md](./mcp-server/README.md)**: Documentação completa do servidor
- **[GUIA_RAPIDO.md](./mcp-server/GUIA_RAPIDO.md)**: Guia de instalação rápida
- **[MCP Specification](https://spec.modelcontextprotocol.io/)**: Especificação oficial do protocolo

## 🐛 Troubleshooting

### Servidor não aparece no Claude

1. Verifique se compilou: `npm run build`
2. Confirme o caminho no `claude_desktop_config.json`
3. Reinicie o Claude Desktop completamente
4. Verifique logs do Claude Desktop

### Erro de conexão Firebase

1. Confirme que `serviceAccountKey.json` existe
2. Verifique permissões do arquivo
3. Teste credenciais manualmente

### Ferramentas não funcionam

1. Verifique se o usuarioId está correto
2. Confirme que existem dados no Firestore
3. Verifique logs do servidor

## 🔄 Atualizações Futuras

Possíveis melhorias:

- [ ] Suporte a múltiplos usuários
- [ ] Cache de dados para performance
- [ ] Webhooks para notificações
- [ ] Integração com APIs externas (clima, mapas)
- [ ] Exportação de relatórios em PDF
- [ ] Análise preditiva com ML
- [ ] Sugestões de destinos baseadas em histórico

## 🤝 Contribuindo

Para contribuir com melhorias no servidor MCP:

1. Faça alterações em `mcp-server/src/`
2. Teste localmente
3. Compile e valide
4. Envie pull request

## 📄 Licença

Este servidor MCP é parte do projeto AndesTripManager e segue a mesma licença.
