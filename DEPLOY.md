# Guia de Deploy - Andes Trip Manager

Este documento descreve o processo de deploy da aplicação Andes Trip Manager para os ambientes de staging e produção.

## 📋 Pré-requisitos

### Ferramentas Necessárias

- **Node.js** 18+ e npm
- **Firebase CLI**: `npm install -g firebase-tools`
- **Google Cloud SDK** (opcional, para backups completos)
- **Git** configurado com acesso ao repositório

### Configuração Inicial

1. **Autenticação Firebase**:
   ```bash
   firebase login
   ```

2. **Configurar projetos Firebase**:
   ```bash
   # Produção
   firebase use --add andestripmanager
   
   # Staging
   firebase use --add andestripmanager-staging
   ```

3. **Instalar dependências**:
   ```bash
   npm ci
   ```

## 🌍 Ambientes

### Desenvolvimento (Local)
- **URL**: http://localhost:4200
- **Comando**: `npm start`
- **Configuração**: `src/environments/environment.ts`

### Staging
- **URL**: https://andestripmanager-staging.web.app
- **Branch**: `develop`
- **Configuração**: `src/environments/environment.staging.ts`

### Produção
- **URL**: https://andestripmanager.web.app
- **Branch**: `main`
- **Configuração**: `src/environments/environment.prod.ts`

## 🚀 Processo de Deploy

### Deploy Manual para Staging

1. **Verificar branch**:
   ```bash
   git checkout develop
   git pull origin develop
   ```

2. **Executar deploy**:
   ```bash
   npm run deploy:staging
   ```

3. **Verificar deploy**:
   - Acesse: https://andestripmanager-staging.web.app
   - Teste funcionalidades críticas

### Deploy Manual para Produção

1. **Verificar branch**:
   ```bash
   git checkout main
   git pull origin main
   ```

2. **Executar deploy**:
   ```bash
   npm run deploy:prod
   ```

3. **Verificar deploy**:
   - Acesse: https://andestripmanager.web.app
   - Execute testes de smoke
   - Monitore por 30 minutos

### Deploy Automático (CI/CD)

O deploy automático é executado via GitHub Actions:

- **Staging**: Automático ao fazer push para `develop`
- **Produção**: Automático ao fazer push para `main`

## 📊 Scripts Disponíveis

### Build
```bash
# Desenvolvimento
npm run build

# Staging
npm run build:staging

# Produção
npm run build:prod
```

### Deploy
```bash
# Deploy para staging
npm run deploy:staging

# Deploy para produção
npm run deploy:prod
```

### Testes
```bash
# Testes unitários
npm run test:ci

# Testes E2E
npm run e2e:ci

# Lint
npm run lint
```

### Monitoramento
```bash
# Monitorar produção por 30 minutos
npm run monitor

# Monitorar staging por 15 minutos
./scripts/monitor.sh staging 15
```

### Backup
```bash
# Backup completo
npm run backup

# Backup de projeto específico
./scripts/backup.sh andestripmanager-staging
```

## 🔧 Configurações de Build

### Otimizações de Produção

- **Tree Shaking**: Remoção de código não utilizado
- **Minificação**: Compressão de JavaScript e CSS
- **Bundle Splitting**: Separação de código por funcionalidade
- **Service Worker**: Cache inteligente para PWA
- **Compressão Gzip**: Redução do tamanho dos arquivos

### Análise de Bundle

```bash
# Gerar análise do bundle
npm run analyze

# Servir build localmente
npm run serve:prod
```

## 🔒 Segurança

### Regras do Firestore

As regras de segurança estão definidas em `firestore.rules`:
- Usuários só acessam seus próprios dados
- Validação de propriedade de documentos
- Controle de acesso baseado em autenticação

### Regras do Storage

As regras do Firebase Storage estão em `storage.rules`:
- Upload apenas para usuários autenticados
- Validação de propriedade de arquivos
- Controle de acesso por tipo de conteúdo

## 📈 Monitoramento

### Métricas Importantes

- **Tempo de carregamento**: < 3 segundos
- **Taxa de erro**: < 1%
- **Disponibilidade**: > 99.9%
- **Tamanho do bundle**: < 1.5MB

### Ferramentas de Monitoramento

- **Firebase Console**: Métricas de hosting e banco
- **Google Analytics**: Comportamento dos usuários
- **Lighthouse**: Performance e acessibilidade
- **Script de monitoramento**: Verificações automáticas

## 🆘 Troubleshooting

### Problemas Comuns

1. **Build falha**:
   ```bash
   # Limpar cache e reinstalar
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Deploy falha**:
   ```bash
   # Verificar autenticação
   firebase login --reauth
   
   # Verificar projeto
   firebase projects:list
   ```

3. **Testes E2E falham**:
   ```bash
   # Executar em modo debug
   npm run e2e:open
   ```

### Rollback

Em caso de problemas em produção:

1. **Rollback via Firebase Console**:
   - Acesse Firebase Console
   - Vá para Hosting
   - Selecione versão anterior
   - Clique em "Promover para live"

2. **Rollback via CLI**:
   ```bash
   firebase hosting:releases:list
   firebase hosting:releases:restore [RELEASE_ID]
   ```

## 📝 Checklist de Deploy

### Pré-Deploy
- [ ] Código revisado e aprovado
- [ ] Testes unitários passando
- [ ] Testes E2E passando
- [ ] Build de produção funcionando
- [ ] Variáveis de ambiente configuradas

### Durante o Deploy
- [ ] Backup realizado
- [ ] Deploy executado com sucesso
- [ ] Testes de smoke passando
- [ ] Monitoramento ativado

### Pós-Deploy
- [ ] Funcionalidades críticas testadas
- [ ] Métricas de performance verificadas
- [ ] Logs verificados por erros
- [ ] Equipe notificada

## 🔗 Links Úteis

- **Firebase Console**: https://console.firebase.google.com
- **GitHub Actions**: https://github.com/[repo]/actions
- **Google Analytics**: https://analytics.google.com
- **Lighthouse**: https://pagespeed.web.dev

## 📞 Contatos

Em caso de problemas críticos:
- **Desenvolvedor Principal**: [email]
- **DevOps**: [email]
- **Suporte Firebase**: https://firebase.google.com/support