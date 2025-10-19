# Guia de Uso: Waypoints (Pontos da Rota)

## O que são Waypoints?

Waypoints são pontos intermediários que você pode adicionar a uma rota para que o Google Maps calcule o trajeto passando por esses locais específicos. Isso é especialmente útil quando a viagem real desvia do trajeto padrão sugerido pelo Google Maps.

## Quando usar Waypoints?

Use waypoints quando:

- **A rota real passa por cidades/locais específicos** que não estão no trajeto direto
- **Há desvios planejados** (ex: evitar pedágios, passar por uma atração turística)
- **A estrada principal está fechada** e você precisa usar rotas alternativas
- **Você quer registrar pontos importantes** ao longo da viagem

## Como adicionar Waypoints

### 1. Acesse o formulário de Dia de Viagem

- Ao criar ou editar um dia de viagem, role até a seção **"Pontos da Rota (Waypoints)"**

### 2. Adicione um novo ponto

- Clique no botão **"Adicionar Ponto"**
- Preencha as informações:
  - **Nome/Localização**: Descrição do local (ex: "Posto BR km 120", "Cidade de Campinas")
  - **Tipo**: Escolha entre:
    - **Ponto de Passagem**: O Google Maps calcula a rota passando por este ponto, mas não é uma parada obrigatória
    - **Parada Obrigatória**: Indica que você vai parar neste local (aparece como stopover no mapa)
    - **Referência**: Apenas um ponto de referência visual
  - **Latitude e Longitude**: Coordenadas do ponto

### 3. Buscar coordenadas automaticamente

- Digite o nome/localização do ponto
- Clique no botão **"Buscar Coords"**
- O sistema tentará encontrar as coordenadas automaticamente
- Se não encontrar, você pode digitar manualmente

### 4. Organizar os pontos

- Use os botões de **seta para cima/baixo** para reordenar os pontos
- A ordem dos pontos define a sequência da rota
- O primeiro ponto será o primeiro waypoint após a origem
- O último ponto será o último waypoint antes do destino

### 5. Remover pontos

- Clique no botão de **lixeira** para remover um ponto específico

## Exemplo Prático

### Cenário: Viagem de São Paulo para Curitiba passando por Registro

**Origem**: São Paulo, SP  
**Destino**: Curitiba, PR

**Waypoint 1**:
- Nome: Registro, SP
- Tipo: Parada Obrigatória
- Latitude: -24.4878
- Longitude: -47.8425

**Resultado**: O Google Maps calculará a rota saindo de São Paulo, passando por Registro (onde você pode fazer uma parada), e seguindo até Curitiba.

## Tipos de Pontos

### 🗺️ Ponto de Passagem (waypoint)
- O Google Maps ajusta a rota para passar por este ponto
- Não indica necessariamente uma parada
- Útil para forçar o trajeto por uma estrada específica

### ⏸️ Parada Obrigatória (parada)
- Indica que você vai parar neste local
- Aparece como um stopover no cálculo da rota
- Útil para registrar paradas para refeição, abastecimento, etc.

### 🚩 Referência (referencia)
- Apenas um ponto de referência visual
- Não afeta o cálculo da rota
- Útil para marcar pontos de interesse ao longo do caminho

## Dicas Importantes

1. **Ordem importa**: Os waypoints são processados na ordem em que aparecem na lista
2. **Limite do Google Maps**: O Google Maps permite até 25 waypoints por rota
3. **Coordenadas precisas**: Use coordenadas precisas para garantir que a rota passe exatamente onde você deseja
4. **Teste a rota**: Após adicionar os waypoints, visualize o mapa para confirmar que a rota está correta

## Visualização no Mapa

Após salvar o dia com waypoints:

1. Acesse a visualização do dia de viagem
2. Vá para a aba **"Mapa e Rota"**
3. O mapa mostrará:
   - A rota completa passando por todos os waypoints
   - Marcadores nos pontos de parada
   - O trajeto calculado pelo Google Maps

## Solução de Problemas

### O mapa não mostra a rota correta
- Verifique se as coordenadas dos waypoints estão corretas
- Confirme que os pontos estão na ordem correta
- Tente usar "Buscar Coords" novamente para pontos problemáticos

### Não consigo encontrar as coordenadas
- Use o Google Maps web para encontrar o local
- Clique com o botão direito no local desejado
- Selecione as coordenadas que aparecem
- Cole no formulário

### A rota está muito longa
- Verifique se não há waypoints duplicados
- Confirme que a ordem dos pontos faz sentido geograficamente
- Remova waypoints desnecessários

## Tecnologia

Esta funcionalidade utiliza a **Google Maps Directions API** com suporte a waypoints. Os waypoints são armazenados no Firestore junto com os dados do dia de viagem e são automaticamente carregados quando você visualiza o mapa.
