# Como Acessar a Funcionalidade de Waypoints

## 📍 Passo a Passo para Usar Waypoints

### 1. Acesse o App
- Abra o navegador em: `http://localhost:4200`
- Faça login no sistema

### 2. Navegue até uma Viagem
- No menu principal, clique em **"Viagens"** ou acesse o Dashboard
- Selecione uma viagem existente OU crie uma nova viagem

### 3. Adicione ou Edite um Dia de Viagem

#### Para CRIAR um novo dia:
1. Dentro da página de detalhes da viagem
2. Procure o botão **"Adicionar Dia"** ou **"Novo Dia"**
3. Clique para abrir o formulário

#### Para EDITAR um dia existente:
1. Dentro da página de detalhes da viagem
2. Localize a lista de dias da viagem
3. Clique no ícone de **editar (lápis)** no dia desejado

### 4. Localize a Seção de Waypoints
No formulário de dia de viagem, role a página para baixo até encontrar a seção:

```
┌─────────────────────────────────────────┐
│  🗺️ Pontos da Rota (Waypoints)         │
│                                         │
│  [+ Adicionar Ponto]                    │
└─────────────────────────────────────────┘
```

Esta seção aparece **APÓS**:
- ✅ Campos de Data e Número do Dia
- ✅ Campos de Origem e Destino
- ✅ Campos de Distância e Tipo de Estrada
- ✅ Campos de Horários
- ✅ Campo de Observações

E **ANTES** da seção de "Dicas"

### 5. Adicione Waypoints
1. Clique no botão roxo **"Adicionar Ponto"**
2. Preencha:
   - **Nome/Localização**: Ex: "Registro, SP"
   - **Tipo**: Escolha entre Ponto de Passagem, Parada Obrigatória ou Referência
   - **Latitude e Longitude**: Digite ou clique em "Buscar Coords"
3. Adicione quantos pontos precisar
4. Use as setas ⬆️⬇️ para reordenar
5. Clique em **"Salvar"** ou **"Criar Dia"**

### 6. Visualize a Rota com Waypoints
1. Após salvar, volte para a página de detalhes da viagem
2. Clique no dia que você acabou de criar/editar
3. Na janela de detalhes do dia, vá para a aba **"Mapa e Rota"**
4. O mapa mostrará a rota passando por todos os waypoints que você adicionou

## 🔍 Onde Está Cada Coisa?

### Estrutura de Navegação:
```
Home/Dashboard
  └── Viagens
       └── [Selecionar uma Viagem]
            └── Detalhes da Viagem
                 ├── Botão "Adicionar Dia" → FORMULÁRIO (waypoints aqui!)
                 └── Lista de Dias
                      └── [Clicar em um Dia]
                           └── Detalhes do Dia
                                └── Aba "Mapa e Rota" → VISUALIZAÇÃO (rota com waypoints!)
```

## 🎯 Exemplo Visual

### No Formulário:
```
┌────────────────────────────────────────────────────────┐
│ Observações                                            │
│ [____________________________________]                 │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│ 🗺️ Pontos da Rota (Waypoints)  [+ Adicionar Ponto]   │
│                                                        │
│ ℹ️ Adicione pontos intermediários para que o Google   │
│    Maps calcule a rota passando por esses locais...   │
│                                                        │
│ ┌──────────────────────────────────────────────────┐  │
│ │ 📍 Ponto 1              ⬆️ ⬇️ 🗑️                 │  │
│ │ Nome: [Registro, SP_______________] Tipo: [▼]    │  │
│ │ Lat: [-24.4878] Long: [-47.8425] [🔍 Buscar]    │  │
│ └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│ ℹ️ Dicas:                                              │
│ • O tempo estimado é calculado automaticamente...     │
│ • Waypoints: Use pontos de passagem para rotas...    │
└────────────────────────────────────────────────────────┘
```

### No Mapa (após salvar):
```
┌────────────────────────────────────────────────────────┐
│ Detalhes do Dia                                        │
│ ┌──────────────────────────────────────────────────┐  │
│ │ [Mapa e Rota] [Paradas] [Clima] [Progresso]     │  │
│ └──────────────────────────────────────────────────┘  │
│                                                        │
│ ┌──────────────────────────────────────────────────┐  │
│ │           🗺️ Mapa do Google                      │  │
│ │                                                   │  │
│ │  📍 Origem                                        │  │
│ │    ↓ (rota azul)                                 │  │
│ │  📍 Waypoint 1 (Registro)                        │  │
│ │    ↓ (rota azul)                                 │  │
│ │  🏁 Destino                                       │  │
│ └──────────────────────────────────────────────────┘  │
│                                                        │
│ 📍 Origem: São Paulo, SP                               │
│ 🏁 Destino: Curitiba, PR                               │
└────────────────────────────────────────────────────────┘
```

## ❓ Não Está Aparecendo?

### Verifique:

1. **Você está no formulário correto?**
   - URL deve ser algo como: `/viagens/[id]/dias/nova` ou `/viagens/[id]/dias/[diaId]/editar`

2. **Role a página para baixo**
   - A seção de waypoints fica DEPOIS das observações
   - Pode estar fora da área visível da tela

3. **O formulário carregou completamente?**
   - Aguarde o carregamento completo da página
   - Verifique se não há erros no console do navegador (F12)

4. **Teste rápido:**
   - Abra o console do navegador (F12)
   - Digite: `document.querySelector('.pontos-rota-section')`
   - Se retornar `null`, a seção não foi carregada

## 🚀 Teste Rápido

1. Acesse: `http://localhost:4200`
2. Faça login
3. Vá em Viagens → Selecione uma viagem → Clique em "Adicionar Dia"
4. Role até o final do formulário
5. Você verá a seção roxa com "Pontos da Rota (Waypoints)"

Se ainda não aparecer, me avise e verificaremos o código!
