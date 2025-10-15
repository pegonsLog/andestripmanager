# Configuração do Google Maps API

## Como obter uma chave da API do Google Maps

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Ative a **Google Maps JavaScript API**:
   - No menu, vá em "APIs e Serviços" > "Biblioteca"
   - Procure por "Maps JavaScript API"
   - Clique em "Ativar"

4. Crie uma chave de API:
   - Vá em "APIs e Serviços" > "Credenciais"
   - Clique em "Criar credenciais" > "Chave de API"
   - Copie a chave gerada

5. (Opcional mas recomendado) Restrinja a chave:
   - Clique na chave criada
   - Em "Restrições de aplicativo", selecione "Referenciadores HTTP (sites)"
   - Adicione seus domínios (ex: `localhost:4200/*`, `seudominio.com/*`)
   - Em "Restrições de API", selecione "Restringir chave"
   - Selecione apenas "Maps JavaScript API"

## Como configurar no projeto

### Opção 1: Adicionar diretamente no index.html (Desenvolvimento)

Edite o arquivo `src/index.html` e substitua a linha:

```html
<script async defer
  src="https://maps.googleapis.com/maps/api/js?libraries=places&language=pt-BR">
</script>
```

Por:

```html
<script async defer
  src="https://maps.googleapis.com/maps/api/js?key=SUA_CHAVE_AQUI&libraries=places&language=pt-BR">
</script>
```

### Opção 2: Usar variável de ambiente (Produção)

1. Adicione a chave no arquivo `src/environments/environment.ts`:

```typescript
export const environment = {
  // ... outras configurações
  googleMaps: {
    apiKey: "SUA_CHAVE_AQUI"
  }
};
```

2. Use a chave no código (futuro: implementar carregamento dinâmico)

## Modo de Desenvolvimento sem Chave

O Google Maps pode funcionar sem chave para desenvolvimento local, mas com limitações:
- Marca d'água "For development purposes only"
- Limite de requisições muito baixo
- Não recomendado para produção

## Custos

O Google Maps oferece:
- **$200 de crédito gratuito por mês**
- Após isso, cobra por uso
- Para uso pessoal/pequeno, geralmente fica dentro do limite gratuito

Mais informações: https://mapsplatform.google.com/pricing/

## Troubleshooting

### Mapa não aparece
1. Verifique se a chave está correta
2. Verifique se a API está ativada no Google Cloud Console
3. Verifique as restrições da chave
4. Abra o console do navegador para ver erros

### Erro "RefererNotAllowedMapError"
- A chave está restrita e seu domínio não está na lista permitida
- Adicione seu domínio nas restrições da chave

### Erro "ApiNotActivatedMapError"
- A Maps JavaScript API não está ativada no projeto
- Ative-a no Google Cloud Console
