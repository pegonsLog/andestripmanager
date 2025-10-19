# Guia: Mapa do Google Maps para Paradas

## 📍 Funcionalidades Implementadas

### 1. Componente de Mapa para Lista de Paradas
**Arquivo**: `paradas-map-google.component.ts`

Um componente completo para visualizar múltiplas paradas em um mapa do Google Maps.

#### Recursos:
- ✅ **Marcadores coloridos** por tipo de parada
- ✅ **Filtro por tipo** de parada
- ✅ **InfoWindows** com informações da parada
- ✅ **Legenda interativa** com contagem
- ✅ **Auto-ajuste** do zoom para mostrar todas as paradas
- ✅ **Responsivo** para mobile e desktop

### 2. Mapa nos Detalhes da Parada
**Arquivo**: `parada-detail-dialog.component.ts`

Adicionado mapa na visualização de detalhes de uma parada individual.

#### Recursos:
- ✅ **Aba "Mapa"** no diálogo de detalhes
- ✅ **Marcador único** na localização da parada
- ✅ **Coordenadas exibidas** abaixo do mapa
- ✅ **Carregamento lazy** (só carrega quando a aba é selecionada)

## 🗺️ Como Usar

### Visualizar Múltiplas Paradas no Mapa

#### 1. Usar o Componente de Mapa

```typescript
import { ParadasMapGoogleComponent } from './features/paradas/paradas-map/paradas-map-google.component';

// No template:
<app-paradas-map-google
  [paradas]="minhasParadas"
  [center]="[-23.5505, -46.6333]"
  [zoom]="10"
  [height]="'500px'"
  [showFilters]="true"
  [showLegend]="true"
  (paradaSelected)="onParadaClick($event)"
  (mapReady)="onMapReady($event)">
</app-paradas-map-google>
```

#### 2. Propriedades do Componente

| Propriedade | Tipo | Padrão | Descrição |
|------------|------|--------|-----------|
| `paradas` | `Parada[]` | `[]` | Array de paradas para exibir |
| `center` | `[number, number]` | Brasília | Centro inicial do mapa [lat, lng] |
| `zoom` | `number` | `6` | Nível de zoom inicial |
| `height` | `string` | `'400px'` | Altura do mapa |
| `showFilters` | `boolean` | `true` | Mostrar filtros por tipo |
| `showLegend` | `boolean` | `true` | Mostrar legenda |

#### 3. Eventos

| Evento | Descrição |
|--------|-----------|
| `paradaSelected` | Emitido quando uma parada é clicada |
| `mapReady` | Emitido quando o mapa está pronto |

### Visualizar Parada Individual

#### 1. Abrir Detalhes da Parada

Quando você abre o diálogo de detalhes de uma parada que possui coordenadas, verá duas abas:
- **Informações**: Dados da parada
- **Mapa**: Localização no Google Maps

#### 2. Navegar para a Aba do Mapa

1. Clique em uma parada para abrir os detalhes
2. Clique na aba **"Mapa"**
3. O mapa será carregado automaticamente
4. Você verá:
   - Mapa centralizado na parada
   - Marcador colorido por tipo
   - Coordenadas exatas abaixo do mapa

## 🎨 Cores dos Marcadores por Tipo

| Tipo | Cor | Ícone |
|------|-----|-------|
| Abastecimento | 🔴 Vermelho (#ff5722) | local_gas_station |
| Refeição | 🟢 Verde (#4caf50) | restaurant |
| Ponto de Interesse | 🔵 Azul (#2196f3) | place |
| Descanso | 🟣 Roxo (#9c27b0) | hotel |
| Manutenção | 🟠 Laranja (#ff9800) | build |
| Hospedagem | 🟤 Marrom (#795548) | bed |

## 📝 Adicionar Coordenadas às Paradas

### Opção 1: Buscar Automaticamente (Recomendado)

Quando criar/editar uma parada, use a funcionalidade de busca de coordenadas:

1. Digite o endereço da parada
2. Clique em **"Buscar Coordenadas"**
3. As coordenadas serão preenchidas automaticamente

### Opção 2: Inserir Manualmente

Se souber as coordenadas exatas:

1. Latitude: número entre -90 e 90
2. Longitude: número entre -180 e 180

**Exemplo**: São Paulo, SP
- Latitude: `-23.550520`
- Longitude: `-46.633308`

### Opção 3: Obter do Google Maps

1. Abra o Google Maps no navegador
2. Clique com botão direito no local desejado
3. Clique nas coordenadas que aparecem
4. Cole no formulário da parada

## 🔧 Integração com Formulário de Paradas

Para adicionar busca de coordenadas no formulário de paradas, você precisará:

### 1. Adicionar Campos de Coordenadas

```typescript
// No formulário
paradaForm = this.fb.group({
  nome: ['', Validators.required],
  endereco: [''],
  latitude: [null],
  longitude: [null],
  // ... outros campos
});
```

### 2. Adicionar Botão de Busca

```html
<mat-form-field>
  <mat-label>Endereço</mat-label>
  <input matInput formControlName="endereco">
</mat-form-field>

<button mat-raised-button (click)="buscarCoordenadas()">
  <mat-icon>search</mat-icon>
  Buscar Coordenadas
</button>

<div class="coordenadas-row">
  <mat-form-field>
    <mat-label>Latitude</mat-label>
    <input matInput type="number" formControlName="latitude" step="0.000001">
  </mat-form-field>

  <mat-form-field>
    <mat-label>Longitude</mat-label>
    <input matInput type="number" formControlName="longitude" step="0.000001">
  </mat-form-field>
</div>
```

### 3. Implementar Busca de Coordenadas

```typescript
import { GoogleMapsLoaderService } from '../../../services/google-maps-loader.service';

private googleMapsLoader = inject(GoogleMapsLoaderService);

async buscarCoordenadas(): Promise<void> {
  const endereco = this.paradaForm.get('endereco')?.value;
  
  if (!endereco) {
    this.showError('Digite um endereço primeiro');
    return;
  }

  try {
    await this.googleMapsLoader.load();
    const geocoder = new google.maps.Geocoder();
    
    geocoder.geocode({ address: endereco }, (results: any, status: any) => {
      if (status === google.maps.GeocoderStatus.OK && results[0]) {
        const location = results[0].geometry.location;
        this.paradaForm.patchValue({
          latitude: location.lat(),
          longitude: location.lng()
        });
        this.showSuccess('Coordenadas encontradas!');
      } else {
        this.showError('Não foi possível encontrar as coordenadas');
      }
    });
  } catch (error) {
    this.showError('Erro ao buscar coordenadas');
  }
}
```

## 🎯 Exemplos de Uso

### Exemplo 1: Mapa de Todas as Paradas de um Dia

```typescript
// No componente
paradasDoDia: Parada[] = [];

ngOnInit() {
  this.paradasService.listarParadasDia(this.diaId)
    .subscribe(paradas => {
      this.paradasDoDia = paradas;
    });
}
```

```html
<app-paradas-map-google
  [paradas]="paradasDoDia"
  [height]="'600px'"
  (paradaSelected)="abrirDetalhes($event)">
</app-paradas-map-google>
```

### Exemplo 2: Filtrar Apenas Abastecimentos

```typescript
// Filtrar antes de passar para o mapa
paradasAbastecimento = this.todasParadas.filter(
  p => p.tipo === TipoParada.ABASTECIMENTO
);
```

### Exemplo 3: Centralizar em uma Parada Específica

```typescript
@ViewChild(ParadasMapGoogleComponent) mapaComponent!: ParadasMapGoogleComponent;

centralizarNaParada(parada: Parada) {
  this.mapaComponent.centerOnParada(parada);
}
```

## 📱 Responsividade

O mapa é totalmente responsivo:

- **Desktop**: Legenda no canto inferior esquerdo
- **Mobile**: Legenda em linha na parte inferior
- **Altura ajustável**: Use a propriedade `height`

## ⚠️ Requisitos

1. **Google Maps API Key** configurada em `environment.ts`
2. **Coordenadas válidas** nas paradas (latitude e longitude)
3. **Conexão com internet** para carregar o Google Maps

## 🐛 Troubleshooting

### Mapa não aparece
- Verifique se a API key está configurada
- Verifique o console para erros
- Certifique-se de que as paradas têm coordenadas

### Marcadores não aparecem
- Verifique se `parada.coordenadas` está no formato `[lat, lng]`
- Verifique se os valores são números válidos
- Use o console para verificar os dados

### Filtro não funciona
- Certifique-se de que `showFilters="true"`
- Verifique se as paradas têm o campo `tipo` preenchido

## 🚀 Melhorias Futuras

- [ ] Adicionar rota entre paradas
- [ ] Permitir editar coordenadas clicando no mapa
- [ ] Adicionar Street View
- [ ] Exportar mapa como imagem
- [ ] Adicionar medição de distâncias
- [ ] Integrar com navegação (abrir no Google Maps app)

## 📚 Referências

- [Google Maps JavaScript API](https://developers.google.com/maps/documentation/javascript)
- [Google Maps Markers](https://developers.google.com/maps/documentation/javascript/markers)
- [Google Maps InfoWindows](https://developers.google.com/maps/documentation/javascript/infowindows)
