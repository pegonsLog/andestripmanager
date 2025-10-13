# Configuração de Environments

## ⚠️ IMPORTANTE: Segurança

Os arquivos `environment.ts`, `environment.prod.ts` e `environment.staging.ts` **NÃO devem ser commitados** no Git pois contêm informações sensíveis (API keys, tokens, etc.).

## Como Configurar

### 1. Copie os templates

```bash
cd src/environments
cp environment.template.ts environment.ts
cp environment.prod.template.ts environment.prod.ts
cp environment.staging.template.ts environment.staging.ts
```

### 2. Configure suas API Keys

Edite cada arquivo e substitua os placeholders:

#### Firebase
- Obtenha as credenciais em: https://console.firebase.google.com/
- Acesse: Project Settings > General > Your apps

#### OpenWeatherMap
- Obtenha sua API key em: https://home.openweathermap.org/api_keys
- Crie uma conta gratuita se necessário

### 3. Exemplo de configuração

```typescript
export const environment = {
    production: false,
    staging: false,
    firebase: {
        apiKey: "AIzaSyAp4EW44oPvCZKixAE7dIg2UHHb_I5WQ0Y",
        authDomain: "andestripmanager.firebaseapp.com",
        projectId: "andestripmanager",
        storageBucket: "andestripmanager.firebasestorage.app",
        messagingSenderId: "178668301606",
        appId: "1:178668301606:web:206de5961fd902d16f25e7",
        measurementId: "G-63GWRS6QVR"
    },
    weather: {
        apiKey: "sua_chave_real_aqui",
        baseUrl: "https://api.openweathermap.org/data/2.5",
        units: "metric",
        lang: "pt_br"
    },
    debug: true,
    logLevel: 'debug'
};
```

## Arquivos

- `*.template.ts` - Templates versionados no Git (sem secrets)
- `environment.ts` - Desenvolvimento (não versionado)
- `environment.prod.ts` - Produção (não versionado)
- `environment.staging.ts` - Staging (não versionado)

## Troubleshooting

Se você receber erros de compilação sobre environments faltando, certifique-se de ter criado os arquivos a partir dos templates.
