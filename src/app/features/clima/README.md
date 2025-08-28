# Sistema de Informações Climáticas

Este módulo implementa um sistema completo de informações climáticas para o Andes Trip Manager, incluindo previsão do tempo, registro de clima observado, alertas e histórico.

## Componentes

### ClimaCardComponent

Exibe informações climáticas em formato de card, incluindo previsão e dados observados.

```typescript
<app-clima-card
  [clima]="clima"
  [previsao]="previsao"
  [alertas]="alertas"
  [showActions]="true"
  (registrarObservado)="onRegistrarObservado()"
  (atualizarPrevisao)="onAtualizarPrevisao()">
</app-clima-card>
```

### AlertasClimaComponent

Exibe alertas climáticos baseados na previsão do tempo.

```typescript
<app-alertas-clima
  [alertas]="alertas"
  [expandable]="true">
</app-alertas-clima>
```

### HistoricoClimaComponent

Mostra o histórico de dados climáticos com comparação entre previsão e observado.

```typescript
<app-historico-clima
  [diasViagemIds]="diasIds"
  [maxItems]="10">
</app-historico-clima>
```

### ClimaObservadoFormComponent

Formulário modal para registrar clima observado.

```typescript
const dialogRef = this.dialog.open(ClimaObservadoFormComponent, {
  width: "500px",
  data: { diaViagemId, data, climaExistente },
});
```

### ClimaDashboardComponent

Componente principal que integra todos os outros componentes.

```typescript
<app-clima-dashboard
  [diaViagem]="diaAtual"
  [diasViagem]="todosDias"
  [usuarioId]="usuarioId"
  [showHistorico]="true"
  [showAlertas]="true">
</app-clima-dashboard>
```

## Serviços

### ClimaService

Serviço principal para gerenciar dados climáticos.

#### Métodos principais:

- `buscarPrevisaoTempo(lat, lng, cidade)` - Busca previsão do tempo
- `buscarPrevisaoEstendida(lat, lng)` - Busca previsão de 5 dias
- `salvarClimaDia(...)` - Salva dados climáticos para um dia
- `registrarClimaObservado(...)` - Registra clima observado
- `gerarAlertas(previsao)` - Gera alertas baseados na previsão

## Configuração

### Environment

Adicione as configurações da API do clima no `environment.ts`:

```typescript
export const environment = {
  // ... outras configurações
  weather: {
    apiKey: "YOUR_OPENWEATHER_API_KEY",
    baseUrl: "https://api.openweathermap.org/data/2.5",
    units: "metric",
    lang: "pt_br",
  },
};
```

### API Key

Para obter uma chave da API:

1. Acesse [OpenWeatherMap](https://openweathermap.org/api)
2. Crie uma conta gratuita
3. Gere uma API key
4. Substitua `YOUR_OPENWEATHER_API_KEY` pela sua chave

## Modelos de Dados

### Clima

Interface principal para dados climáticos de um dia.

```typescript
interface Clima extends BaseEntity {
  diaViagemId: string;
  data: string;
  cidade: string;
  coordenadas: { lat: number; lng: number };
  previsao?: PrevisaoTempo;
  observado?: ClimaObservado;
  alertas?: AlertaClimatico[];
}
```

### PrevisaoTempo

Dados de previsão meteorológica.

```typescript
interface PrevisaoTempo {
  temperaturaMin: number;
  temperaturaMax: number;
  condicao: CondicaoClimatica;
  descricao: string;
  chanceChuva: number;
  vento: number;
  umidade: number;
  pressao?: number;
  visibilidade?: number;
  indiceUV?: number;
}
```

### ClimaObservado

Dados de clima observado pelo usuário.

```typescript
interface ClimaObservado {
  temperatura: number;
  condicao: CondicaoClimatica;
  choveu: boolean;
  intensidadeChuva?: "leve" | "moderada" | "forte";
  vento?: number;
  observacoes?: string;
  horarioRegistro: string;
}
```

### AlertaClimatico

Alertas gerados baseados na previsão.

```typescript
interface AlertaClimatico {
  tipo: "chuva" | "tempestade" | "vento" | "temperatura" | "visibilidade";
  severidade: "baixa" | "media" | "alta";
  titulo: string;
  descricao: string;
  inicio: string;
  fim?: string;
}
```

## Funcionalidades

### Cache

- Previsões são cacheadas por 30 minutos
- Cache automático com TTL configurável
- Reduz chamadas desnecessárias à API

### Alertas Automáticos

- Chuva: ≥70% de chance
- Vento forte: ≥50 km/h
- Temperatura alta: ≥35°C
- Temperatura baixa: ≤5°C

### Precisão da Previsão

- Compara previsão vs observado
- Calcula precisão baseada em temperatura, condição e chuva
- Exibe estatísticas no histórico

### Dicas Inteligentes

- Sugestões baseadas na previsão
- Alertas de segurança
- Recomendações de equipamentos

## Uso no Projeto

### Integração com Dias de Viagem

```typescript
// No componente de detalhes do dia
<app-clima-dashboard
  [diaViagem]="diaAtual"
  [usuarioId]="authService.currentUser.id">
</app-clima-dashboard>
```

### Integração com Viagem

```typescript
// No componente de detalhes da viagem
<app-historico-clima
  [diasViagemIds]="viagem.dias.map(d => d.id)">
</app-historico-clima>
```

## Dependências

### Angular Material

- MatCardModule
- MatIconModule
- MatButtonModule
- MatDialogModule
- MatFormFieldModule
- MatInputModule
- MatSelectModule
- MatSliderModule
- MatCheckboxModule
- MatChipsModule
- MatTableModule
- MatProgressSpinnerModule

### Firebase

- Firestore para persistência
- Regras de segurança configuradas

### HTTP Client

- Para chamadas à API do OpenWeatherMap
- Interceptors para tratamento de erros

## Testes

### Testes Unitários

```bash
ng test --include="**/clima/**/*.spec.ts"
```

### Testes E2E

```bash
ng e2e --spec="**/clima.e2e-spec.ts"
```

## Troubleshooting

### API Key Inválida

- Verifique se a chave está correta no environment
- Confirme se a chave está ativa no OpenWeatherMap

### Coordenadas Inválidas

- Verifique se o dia de viagem tem coordenadas válidas
- Coordenadas devem estar no formato { lat: number, lng: number }

### Cache Issues

- Use o CacheService.clear() para limpar o cache
- Verifique o TTL configurado

### Firestore Permissions

- Confirme as regras de segurança do Firestore
- Usuário deve ter permissão para ler/escrever na coleção 'clima'
