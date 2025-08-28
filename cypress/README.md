# Testes E2E - Andes Trip Manager

Este diretório contém todos os testes End-to-End (E2E) para o Andes Trip Manager, implementados usando Cypress.

## Estrutura dos Testes

### Arquivos de Teste

- **01-autenticacao.cy.ts**: Testes de login, registro e logout
- **02-gerenciamento-viagens.cy.ts**: Testes de CRUD de viagens e navegação
- **03-funcionalidades-offline.cy.ts**: Testes de funcionalidades offline e sincronização
- **04-responsividade.cy.ts**: Testes de responsividade em diferentes dispositivos
- **05-fluxo-completo-usuario.cy.ts**: Testes de fluxos completos de usuário

### Arquivos de Suporte

- **support/e2e.ts**: Configurações globais e comandos customizados
- **support/commands.ts**: Comandos Cypress personalizados
- **fixtures/**: Dados de teste mockados para Firebase

## Comandos Disponíveis

### Executar Testes

```bash
# Abrir interface do Cypress
npm run e2e:open

# Executar todos os testes em modo headless
npm run e2e

# Executar testes em modo headless
npm run e2e:headless

# Executar testes para dispositivos móveis
npm run e2e:mobile

# Executar testes para tablets
npm run e2e:tablet

# Executar testes em CI (inicia servidor e executa testes)
npm run e2e:ci
```

### Executar Testes Específicos

```bash
# Executar apenas testes de autenticação
npx cypress run --spec "cypress/e2e/01-autenticacao.cy.ts"

# Executar testes de responsividade
npx cypress run --spec "cypress/e2e/04-responsividade.cy.ts"
```

## Comandos Customizados

### Autenticação

```typescript
// Fazer login
cy.login('email@exemplo.com', 'senha123');

// Fazer logout
cy.logout();
```

### Navegação e Viewport

```typescript
// Configurar viewport mobile
cy.setMobileViewport();

// Configurar viewport tablet
cy.setTabletViewport();

// Configurar viewport desktop
cy.setDesktopViewport();
```

### Funcionalidades Offline

```typescript
// Simular modo offline
cy.goOffline();

// Voltar online
cy.goOnline();
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

// Criar viagem de teste rapidamente
cy.criarViagemTeste('Nome da Viagem');
```

### Verificações

```typescript
// Verificar mensagem de sucesso
cy.verificarMensagemSucesso('Operação realizada com sucesso!');

// Verificar mensagem de erro
cy.verificarMensagemErro('Erro ao realizar operação');

// Verificar responsividade de elemento
cy.get('[data-cy="elemento"]').checkResponsiveness();

// Verificar se elemento está no viewport
cy.get('[data-cy="elemento"]').shouldBeInViewport();
```

## Seletores de Teste

Todos os elementos testáveis devem usar o atributo `data-cy` para seleção:

```html
<!-- Botões -->
<button data-cy="salvar-button">Salvar</button>
<button data-cy="cancelar-button">Cancelar</button>

<!-- Inputs -->
<input data-cy="nome-input" />
<input data-cy="email-input" />

<!-- Cards e containers -->
<div data-cy="viagem-card">...</div>
<div data-cy="dashboard-content">...</div>

<!-- Navegação -->
<nav data-cy="main-navigation">...</nav>
<a data-cy="menu-viagens">Viagens</a>
```

## Interceptação de Requests

Os testes interceptam chamadas para Firebase para garantir execução consistente:

```typescript
// Interceptar autenticação
cy.intercept('POST', '**/identitytoolkit.googleapis.com/**', 
  { fixture: 'auth-success.json' }).as('login');

// Interceptar Firestore
cy.intercept('GET', '**/firestore.googleapis.com/**', 
  { fixture: 'viagens-mock.json' }).as('carregarViagens');

// Interceptar salvamento
cy.intercept('POST', '**/firestore.googleapis.com/**', 
  { fixture: 'firestore-success.json' }).as('salvarDados');
```

## Fixtures (Dados de Teste)

### auth-success.json
Resposta de sucesso para autenticação Firebase.

### firestore-success.json
Resposta de sucesso para operações Firestore.

### viagens-mock.json
Dados mockados de viagens para testes.

## Configuração de Ambiente

### Variáveis de Ambiente

```bash
# Cypress
CYPRESS_baseUrl=http://localhost:4200
CYPRESS_defaultCommandTimeout=10000

# Firebase (para testes)
CYPRESS_FIREBASE_API_KEY=mock-api-key
CYPRESS_FIREBASE_PROJECT_ID=mock-project-id
```

### Configuração CI/CD

Para executar em pipelines de CI/CD:

```yaml
# GitHub Actions exemplo
- name: Run E2E Tests
  run: |
    npm ci
    npm run build
    npm run e2e:ci
```

## Boas Práticas

### 1. Seletores Estáveis
- Use sempre `data-cy` ao invés de classes CSS ou IDs
- Mantenha seletores descritivos e únicos

### 2. Independência de Testes
- Cada teste deve ser independente
- Use `beforeEach` para configuração inicial
- Limpe dados entre testes quando necessário

### 3. Aguardar Elementos
- Use `cy.wait()` para interceptações
- Use `should('be.visible')` para aguardar elementos
- Evite `cy.wait(tempo)` com tempo fixo

### 4. Responsividade
- Teste em múltiplos viewports
- Verifique elementos críticos em mobile
- Use comandos customizados para viewport

### 5. Offline/Online
- Teste funcionalidades offline
- Verifique sincronização
- Teste resolução de conflitos

## Debugging

### Modo Debug
```bash
# Abrir Cypress com debug
DEBUG=cypress:* npm run e2e:open
```

### Screenshots e Vídeos
```bash
# Habilitar screenshots em falhas
cypress run --config screenshotOnRunFailure=true

# Habilitar vídeos
cypress run --config video=true
```

### Logs Detalhados
```typescript
// Adicionar logs customizados
cy.log('Iniciando teste de login');
cy.task('log', 'Mensagem para console do Node');
```

## Troubleshooting

### Problemas Comuns

1. **Timeout em elementos**: Aumentar `defaultCommandTimeout`
2. **Interceptações não funcionam**: Verificar URLs e patterns
3. **Testes flaky**: Adicionar waits apropriados
4. **Viewport não muda**: Usar comandos customizados de viewport

### Performance

- Use `cy.intercept()` para mockar requests lentas
- Evite testes desnecessariamente longos
- Agrupe verificações relacionadas

## Cobertura de Testes

Os testes E2E cobrem:

- ✅ Autenticação completa (login, registro, logout)
- ✅ CRUD de viagens
- ✅ Planejamento de dias e paradas
- ✅ Gerenciamento de hospedagens e custos
- ✅ Funcionalidades offline e sincronização
- ✅ Responsividade em múltiplos dispositivos
- ✅ Fluxos completos de usuário
- ✅ Tratamento de erros e recuperação
- ✅ Resolução de conflitos de dados

## Métricas

Execute `npm run e2e` para ver:
- Tempo total de execução
- Número de testes executados
- Taxa de sucesso/falha
- Performance por teste