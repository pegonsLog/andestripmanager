# Guia de Testes E2E - Andes Trip Manager

Este documento fornece instruções completas para executar e manter os testes End-to-End (E2E) do Andes Trip Manager.

## 📋 Visão Geral

Os testes E2E cobrem todos os fluxos críticos da aplicação:

- ✅ **Autenticação**: Login, registro, logout e recuperação de senha
- ✅ **Gerenciamento de Viagens**: CRUD completo, filtros e navegação
- ✅ **Funcionalidades Offline**: Cache, sincronização e resolução de conflitos
- ✅ **Responsividade**: Adaptação para mobile, tablet e desktop
- ✅ **Fluxos Completos**: Jornadas de usuário do início ao fim
- ✅ **Acessibilidade**: Navegação por teclado, leitores de tela e contraste

## 🚀 Execução Rápida

### Comandos Básicos

```bash
# Abrir interface do Cypress
npm run e2e:open

# Executar todos os testes (headless)
npm run e2e

# Executar suite completa com relatórios
npm run e2e:full
```

### Por Dispositivo

```bash
# Desktop (1280x720)
npm run e2e:full

# Mobile (375x667)
npm run e2e:full:mobile

# Tablet (768x1024)
npm run e2e:full:tablet
```

### Testes Específicos

```bash
# Apenas autenticação
npx cypress run --spec "cypress/e2e/01-autenticacao.cy.ts"

# Apenas responsividade
npx cypress run --spec "cypress/e2e/04-responsividade.cy.ts"

# Apenas funcionalidades offline
npx cypress run --spec "cypress/e2e/03-funcionalidades-offline.cy.ts"
```

## 🛠️ Configuração do Ambiente

### Pré-requisitos

- Node.js 18 ou superior
- npm 8 ou superior
- Chrome, Firefox ou Edge instalado

### Instalação

```bash
# Instalar dependências
npm install

# Verificar instalação do Cypress
npx cypress verify

# Abrir Cypress pela primeira vez
npm run e2e:open
```

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
# URLs de teste
CYPRESS_baseUrl=http://localhost:4200

# Firebase (para mocks)
CYPRESS_FIREBASE_API_KEY=mock-api-key
CYPRESS_FIREBASE_PROJECT_ID=mock-project-id

# Configurações de timeout
CYPRESS_defaultCommandTimeout=10000
CYPRESS_requestTimeout=10000
CYPRESS_responseTimeout=10000
```

## 📱 Testes de Responsividade

### Viewports Testados

| Dispositivo | Resolução | Uso |
|-------------|-----------|-----|
| Mobile Portrait | 375x667 | iPhone SE |
| Mobile Landscape | 667x375 | iPhone SE rotacionado |
| Tablet Portrait | 768x1024 | iPad |
| Tablet Landscape | 1024x768 | iPad rotacionado |
| Desktop Small | 1280x720 | Laptop |
| Desktop Large | 1920x1080 | Monitor grande |

### Comandos de Viewport

```typescript
// Nos testes
cy.setMobileViewport();    // 375x667
cy.setTabletViewport();    // 768x1024
cy.setDesktopViewport();   // 1280x720

// Verificar responsividade
cy.get('[data-cy="elemento"]').checkResponsiveness();
```

## 🔄 Testes Offline

### Funcionalidades Testadas

- **Indicador de Conectividade**: Status online/offline
- **Cache de Dados**: Armazenamento local de viagens
- **Operações Offline**: Criar/editar viagens sem internet
- **Sincronização**: Upload automático ao voltar online
- **Resolução de Conflitos**: Merge de dados conflitantes
- **Mapas Offline**: Download e uso de mapas sem internet

### Comandos Offline

```typescript
// Simular modo offline
cy.goOffline();

// Voltar online
cy.goOnline();

// Verificar sincronização
cy.wait('@syncData');
```

## ♿ Testes de Acessibilidade

### Áreas Cobertas

- **Navegação por Teclado**: Tab, Enter, Escape, setas
- **Leitores de Tela**: ARIA labels, roles, landmarks
- **Contraste**: Verificação de cores e visibilidade
- **Formulários**: Labels, validação, agrupamento
- **Estrutura Semântica**: Headings, landmarks, skip links

### Comandos de Acessibilidade

```typescript
// Navegação por teclado
cy.get('input').tab();
cy.focused().should('have.attr', 'data-cy', 'expected-element');

// Verificar ARIA
cy.get('[role="button"]').should('have.attr', 'aria-label');

// Verificar contraste
cy.get('text').should('have.css', 'color').and('not.match', /gray/);
```

## 🎯 Seletores de Teste

### Convenção data-cy

Todos os elementos testáveis usam `data-cy`:

```html
<!-- Botões -->
<button data-cy="salvar-button">Salvar</button>
<button data-cy="cancelar-button">Cancelar</button>

<!-- Formulários -->
<input data-cy="nome-input" />
<select data-cy="tipo-select">

<!-- Navegação -->
<nav data-cy="main-navigation">
<a data-cy="menu-viagens">Viagens</a>

<!-- Containers -->
<div data-cy="viagem-card">
<div data-cy="dashboard-content">
```

### Padrões de Nomenclatura

- **Ações**: `{acao}-button` (ex: `salvar-button`, `excluir-button`)
- **Inputs**: `{campo}-input` (ex: `nome-input`, `email-input`)
- **Cards**: `{tipo}-card` (ex: `viagem-card`, `usuario-card`)
- **Menus**: `menu-{item}` (ex: `menu-viagens`, `menu-perfil`)
- **Abas**: `tab-{nome}` (ex: `tab-dias`, `tab-custos`)

## 🔧 Comandos Customizados

### Autenticação

```typescript
// Login completo
cy.login('email@exemplo.com', 'senha123');

// Logout
cy.logout();
```

### Formulários

```typescript
// Preencher formulário de viagem
cy.preencherFormularioViagem({
  nome: 'Minha Viagem',
  descricao: 'Descrição da viagem',
  dataInicio: '01/06/2024',
  dataFim: '05/06/2024',
  orcamento: 2000
});

// Criar viagem rapidamente
cy.criarViagemTeste('Nome da Viagem');
```

### Verificações

```typescript
// Mensagens de feedback
cy.verificarMensagemSucesso('Operação realizada!');
cy.verificarMensagemErro('Erro na operação');

// Aguardar carregamento
cy.waitForPageLoad();

// Verificar elemento no viewport
cy.get('[data-cy="elemento"]').shouldBeInViewport();
```

## 📊 Relatórios

### Estrutura de Relatórios

```
cypress/
├── reports/
│   ├── index.html              # Relatório consolidado
│   ├── auth-results.json       # Resultados de autenticação
│   ├── viagem-results.json     # Resultados de viagens
│   ├── offline-results.json    # Resultados offline
│   ├── responsive-results.json # Resultados responsividade
│   ├── complete-flow-results.json # Fluxos completos
│   └── accessibility-results.json # Acessibilidade
├── screenshots/                # Screenshots de falhas
└── videos/                    # Vídeos dos testes
```

### Visualizar Relatórios

```bash
# Executar testes com relatórios
npm run e2e:full

# Abrir relatório no navegador
open cypress/reports/index.html
```

## 🚨 Troubleshooting

### Problemas Comuns

#### 1. Timeout em Elementos

```bash
# Aumentar timeout
npx cypress run --config defaultCommandTimeout=15000
```

#### 2. Interceptações Não Funcionam

```typescript
// Verificar URL pattern
cy.intercept('POST', '**/firestore.googleapis.com/**', fixture).as('api');

// Aguardar interceptação
cy.wait('@api');
```

#### 3. Testes Flaky

```typescript
// Aguardar elemento estar visível
cy.get('[data-cy="elemento"]').should('be.visible');

// Aguardar condição específica
cy.get('[data-cy="lista"]').should('have.length.at.least', 1);
```

#### 4. Viewport Não Muda

```typescript
// Usar comandos customizados
cy.setMobileViewport();

// Verificar mudança
cy.viewport(375, 667);
cy.get('body').should('have.css', 'width', '375px');
```

### Debug

```bash
# Modo debug
DEBUG=cypress:* npm run e2e:open

# Screenshots em falhas
npx cypress run --config screenshotOnRunFailure=true

# Vídeos habilitados
npx cypress run --config video=true
```

## 🔄 CI/CD

### GitHub Actions

O arquivo `.github/workflows/e2e-tests.yml` configura execução automática:

- **Push/PR**: Executa testes em múltiplos viewports
- **Cross-browser**: Chrome, Firefox, Edge
- **Artefatos**: Screenshots e vídeos salvos
- **Performance**: Testes com build de produção

### Comandos CI

```bash
# Executar como no CI
npm run e2e:ci

# Com múltiplos browsers
npm run e2e -- --browser firefox
npm run e2e -- --browser edge
```

## 📈 Métricas e KPIs

### Métricas Coletadas

- **Cobertura**: % de funcionalidades testadas
- **Performance**: Tempo de execução por teste
- **Estabilidade**: Taxa de sucesso/falha
- **Responsividade**: Testes por viewport
- **Acessibilidade**: Conformidade WCAG

### Metas

- ✅ Cobertura > 90% das funcionalidades críticas
- ✅ Taxa de sucesso > 95%
- ✅ Tempo de execução < 15 minutos
- ✅ Zero falhas de acessibilidade críticas

## 🔮 Próximos Passos

### Melhorias Planejadas

- [ ] Testes de performance com Lighthouse
- [ ] Testes visuais com Percy/Applitools
- [ ] Testes de API isolados
- [ ] Testes de segurança automatizados
- [ ] Integração com Browserstack

### Contribuindo

1. Adicione `data-cy` em novos elementos
2. Escreva testes para novas funcionalidades
3. Mantenha comandos customizados atualizados
4. Documente novos padrões de teste

## 📞 Suporte

Para dúvidas sobre testes E2E:

1. Consulte a documentação do Cypress
2. Verifique os exemplos nos arquivos de teste
3. Execute `npm run e2e:open` para debug interativo
4. Consulte logs detalhados com `DEBUG=cypress:*`