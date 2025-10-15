# 🔐 Configuração de API Keys

Este projeto utiliza APIs externas que requerem chaves de autenticação. As chaves **NÃO devem ser commitadas** no repositório.

## 📋 APIs Utilizadas

### 1. Google Maps JavaScript API
- **Uso:** Exibição de mapas e rotas nos detalhes dos dias de viagem
- **Como obter:** https://console.cloud.google.com/google/maps-apis
- **Custo:** $200 de crédito gratuito por mês

### 2. OpenWeatherMap API
- **Uso:** Informações climáticas
- **Como obter:** https://home.openweathermap.org/api_keys
- **Custo:** Plano gratuito disponível

## 🔧 Como Configurar

### Passo 1: Copiar os arquivos template

```bash
cp src/environments/environment.template.ts src/environments/environment.ts
cp src/environments/environment.prod.template.ts src/environments/environment.prod.ts
cp src/environments/environment.staging.template.ts src/environments/environment.staging.ts
```

### Passo 2: Adicionar suas chaves

Edite os arquivos criados e substitua os placeholders:

**`src/environments/environment.ts`:**
```typescript
export const environment = {
    // ... outras configurações
    googleMaps: {
        apiKey: "SUA_CHAVE_GOOGLE_MAPS_AQUI"
    },
    weather: {
        apiKey: "SUA_CHAVE_OPENWEATHERMAP_AQUI",
        // ... outras configurações
    }
};
```

### Passo 3: Verificar o .gitignore

Certifique-se de que os arquivos de environment estão no `.gitignore`:

```
# Environment files (contêm API keys)
src/environments/environment.ts
src/environments/environment.prod.ts
src/environments/environment.staging.ts
```

## 🔒 Segurança

### ✅ O que está protegido:
- ✅ Chaves da API no `environment.ts` (não commitado)
- ✅ Google Maps carregado dinamicamente via JavaScript
- ✅ Chaves não expostas no código-fonte público

### ⚠️ Importante:
- **NUNCA** commite os arquivos `environment.ts`, `environment.prod.ts` ou `environment.staging.ts`
- **SEMPRE** use os arquivos `.template.ts` como referência
- Configure **restrições de domínio** no Google Cloud Console para suas chaves

## 🚀 Para Novos Desenvolvedores

1. Clone o repositório
2. Copie os arquivos template (Passo 1 acima)
3. Obtenha suas próprias chaves de API
4. Configure as chaves nos arquivos de environment
5. Execute `npm install` e `npm start`

## 📝 Notas

- Os arquivos `.template.ts` **devem** ser commitados (sem chaves reais)
- Os arquivos sem `.template` **não devem** ser commitados (contêm chaves)
- O GitHub Guardian não detectará chaves nos arquivos do `.gitignore`
