# Como Testar a Funcionalidade de Waypoints

## ✅ Correção Implementada

A função `buscarCoordenadas()` foi implementada com integração real ao **Google Maps Geocoding API**.

## 🧪 Como Testar

### 1. Reinicie o servidor de desenvolvimento
```bash
# Pare o servidor atual (Ctrl+C)
# Inicie novamente
ng serve
```

### 2. Acesse o formulário de dia de viagem
1. Abra `http://localhost:4200`
2. Faça login
3. Navegue até uma viagem
4. Clique em "Adicionar Dia" ou edite um dia existente

### 3. Teste a busca de coordenadas

#### Teste 1: Cidade simples
1. Clique em "Adicionar Ponto"
2. No campo "Nome/Localização", digite: **São Paulo, SP**
3. Clique em "Buscar Coords"
4. **Resultado esperado**: 
   - Mensagem: "Buscando coordenadas..."
   - Depois: "Coordenadas encontradas: -23.550520, -46.633308"
   - Campos de Latitude e Longitude preenchidos automaticamente

#### Teste 2: Endereço específico
1. Adicione outro ponto
2. Digite: **Avenida Paulista, 1578, São Paulo**
3. Clique em "Buscar Coords"
4. **Resultado esperado**: Coordenadas do MASP preenchidas

#### Teste 3: Cidade com estado
1. Adicione outro ponto
2. Digite: **Curitiba, PR**
3. Clique em "Buscar Coords"
4. **Resultado esperado**: Coordenadas de Curitiba

#### Teste 4: Ponto de referência
1. Adicione outro ponto
2. Digite: **Registro, SP**
3. Clique em "Buscar Coords"
4. **Resultado esperado**: Coordenadas da cidade de Registro

## 🔍 Verificando se Funcionou

### Console do Navegador (F12)
Abra o console e você verá mensagens como:
```
Coordenadas encontradas para "São Paulo, SP": -23.550520 -46.633308
```

### Campos Preenchidos
Os campos de Latitude e Longitude devem ser preenchidos automaticamente com valores numéricos.

### Mensagem de Sucesso
Uma notificação verde deve aparecer no canto da tela com as coordenadas encontradas.

## ⚠️ Possíveis Problemas e Soluções

### Problema 1: "Google Maps não está carregado"
**Causa**: A API do Google Maps não foi carregada ainda.

**Solução**: 
- Verifique se a chave da API está configurada em `src/environments/environment.ts`
- O sistema tentará carregar automaticamente

### Problema 2: "Geocoding falhou"
**Causa**: O endereço não foi encontrado ou está mal formatado.

**Solução**:
- Use endereços mais específicos (ex: "São Paulo, SP" em vez de só "São Paulo")
- Adicione o estado ou país
- Tente variações do nome

### Problema 3: Erro de quota da API
**Causa**: Limite de requisições do Google Maps atingido.

**Solução**:
- Verifique o console do Google Cloud Platform
- Aguarde alguns minutos
- Digite as coordenadas manualmente

### Problema 4: Nada acontece ao clicar
**Causa**: Erro de JavaScript ou campo vazio.

**Solução**:
1. Abra o console do navegador (F12)
2. Verifique se há erros em vermelho
3. Certifique-se de que digitou um nome no campo antes de clicar

## 📝 Exemplos de Locais para Testar

### Cidades
- São Paulo, SP
- Rio de Janeiro, RJ
- Curitiba, PR
- Belo Horizonte, MG
- Salvador, BA

### Pontos Específicos
- Aeroporto de Congonhas, São Paulo
- Cristo Redentor, Rio de Janeiro
- Parque Ibirapuera, São Paulo
- Mercado Municipal, São Paulo

### Rodovias/KM
- BR-116 km 200
- Rodovia dos Bandeirantes km 50
- Via Dutra km 150

## 🎯 Fluxo Completo de Teste

### Cenário: Viagem São Paulo → Curitiba

1. **Criar um dia de viagem**
   - Origem: São Paulo, SP
   - Destino: Curitiba, PR

2. **Adicionar Waypoint 1**
   - Nome: Registro, SP
   - Tipo: Parada Obrigatória
   - Clicar em "Buscar Coords"
   - ✅ Verificar se as coordenadas foram preenchidas

3. **Adicionar Waypoint 2**
   - Nome: Cajati, SP
   - Tipo: Ponto de Passagem
   - Clicar em "Buscar Coords"
   - ✅ Verificar se as coordenadas foram preenchidas

4. **Salvar o dia**

5. **Visualizar no mapa**
   - Voltar para a viagem
   - Clicar no dia criado
   - Ir para aba "Mapa e Rota"
   - ✅ Verificar se a rota passa por Registro e Cajati

## 🔧 Debug

Se ainda não funcionar, execute no console do navegador:

```javascript
// Verificar se o Google Maps está carregado
console.log('Google Maps carregado?', typeof google !== 'undefined');

// Testar geocoding manualmente
const geocoder = new google.maps.Geocoder();
geocoder.geocode({ address: 'São Paulo, SP' }, (results, status) => {
    console.log('Status:', status);
    console.log('Resultados:', results);
    if (results && results[0]) {
        const loc = results[0].geometry.location;
        console.log('Lat:', loc.lat(), 'Lng:', loc.lng());
    }
});
```

## 📊 Checklist de Verificação

- [ ] Servidor reiniciado após as alterações
- [ ] Google Maps API key configurada
- [ ] Console do navegador aberto (F12)
- [ ] Campo "Nome/Localização" preenchido
- [ ] Clicou no botão "Buscar Coords"
- [ ] Verificou mensagens no console
- [ ] Campos de Lat/Long foram preenchidos
- [ ] Mensagem de sucesso apareceu

Se todos os itens estiverem OK e ainda não funcionar, compartilhe as mensagens do console para investigarmos mais!
