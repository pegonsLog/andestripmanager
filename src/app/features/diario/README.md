# Diário de Bordo - Componentes

Este módulo implementa o sistema completo de diário de bordo para o Andes Trip Manager.

## Componentes Implementados

### 1. DiarioBordoComponent

**Arquivo:** `diario-bordo.component.ts`

Componente principal que gerencia o diário de bordo de uma viagem.

**Funcionalidades:**

- ✅ Editor de texto rico para notas
- ✅ Organização por dias da viagem
- ✅ Timestamps automáticos
- ✅ Sistema de tags
- ✅ Entradas públicas/privadas
- ✅ Filtros por data e texto
- ✅ Integração com upload de fotos

**Inputs:**

- `viagemId: string` - ID da viagem (obrigatório)
- `diaViagemId?: string` - ID do dia específico (opcional)

**Requisitos atendidos:** 9.1, 9.2

### 2. FotoUploadComponent

**Arquivo:** `foto-upload.component.ts`

Componente para upload de múltiplas fotos com drag & drop.

**Funcionalidades:**

- ✅ Upload automático organizado por data
- ✅ Drag & drop de arquivos
- ✅ Preview das fotos selecionadas
- ✅ Validação de formato e tamanho
- ✅ Compressão automática (via service)

**Inputs:**

- `maxFiles: number` - Máximo de arquivos (padrão: 10)
- `maxFileSize: number` - Tamanho máximo por arquivo (padrão: 5MB)

**Outputs:**

- `fotosAdicionadas: EventEmitter<File[]>` - Emite fotos selecionadas

**Requisitos atendidos:** 9.3

### 3. GaleriaFotosComponent

**Arquivo:** `galeria-fotos.component.ts`

Componente para visualização de galeria de fotos responsiva.

**Funcionalidades:**

- ✅ Galeria responsiva de fotos
- ✅ Visualização em tela cheia
- ✅ Navegação por teclado (setas, ESC)
- ✅ Funcionalidade de compartilhamento
- ✅ Download de fotos
- ✅ Remoção de fotos

**Inputs:**

- `fotos: FotoGaleria[]` - Array de fotos para exibir
- `titulo?: string` - Título da galeria
- `permitirRemocao: boolean` - Permite remover fotos
- `permitirAdicao: boolean` - Permite adicionar fotos

**Outputs:**

- `fotoRemovida: EventEmitter<number>` - Emite índice da foto removida
- `adicionarFotos: EventEmitter<void>` - Emite quando solicitar adicionar fotos

**Requisitos atendidos:** 9.4, 9.5

## Interfaces

### DiarioBordo

Interface principal para entradas do diário.

```typescript
interface DiarioBordo extends BaseEntity {
  viagemId: string;
  diaViagemId?: string;
  usuarioId: string;
  data: string;
  titulo?: string;
  conteudo: string;
  fotos?: string[];
  publico: boolean;
  tags?: string[];
  localizacao?: {
    latitude: number;
    longitude: number;
    endereco?: string;
  };
  clima?: {
    temperatura?: number;
    condicao?: string;
    descricao?: string;
  };
}
```

### FotoGaleria

Interface para dados das fotos na galeria.

```typescript
interface FotoGaleria {
  url: string;
  nome?: string;
  data?: string;
  descricao?: string;
}
```

## Serviços

### DiarioBordoService

**Arquivo:** `../../../services/diario-bordo.service.ts`

Serviço que gerencia todas as operações CRUD do diário de bordo.

**Métodos principais:**

- `criarEntrada(viagemId, dados, diaViagemId?)` - Cria nova entrada
- `atualizarEntrada(id, dados)` - Atualiza entrada existente
- `removerEntrada(id)` - Remove entrada
- `listarEntradas(filtros)` - Lista entradas com filtros
- `removerFoto(entradaId, fotoUrl)` - Remove foto específica

## Uso

### Exemplo básico

```typescript
// No template
<app-diario-bordo
  [viagemId]="viagemId"
  [diaViagemId]="diaViagemId">
</app-diario-bordo>
```

### Exemplo com galeria independente

```typescript
// No template
<app-galeria-fotos
  [fotos]="fotosArray"
  titulo="Fotos da Viagem"
  [permitirRemocao]="true"
  (fotoRemovida)="onFotoRemovida($event)">
</app-galeria-fotos>
```

## Funcionalidades Implementadas

### ✅ Sistema de Diário (Requisito 9.1, 9.2)

- Editor de texto rico básico usando textarea com auto-resize
- Organização automática por dias
- Timestamps automáticos de criação e atualização
- Sistema de tags para categorização
- Filtros por data e texto
- Entradas públicas/privadas

### ✅ Galeria de Fotos (Requisito 9.3, 9.4, 9.5)

- Upload automático organizado por data
- Galeria responsiva com grid adaptativo
- Visualização em tela cheia com navegação
- Funcionalidade de compartilhamento (Web Share API + fallback)
- Download de fotos
- Remoção individual de fotos

## Tecnologias Utilizadas

- **Angular 18+** com componentes standalone
- **Angular Material** para UI components
- **Firebase Storage** para armazenamento de fotos
- **Firestore** para persistência de dados
- **RxJS** para programação reativa
- **TypeScript** para tipagem estática

## Responsividade

Todos os componentes são totalmente responsivos:

- **Desktop:** Layout em grid com múltiplas colunas
- **Tablet:** Layout adaptativo com menos colunas
- **Mobile:** Layout em coluna única com otimizações touch

## Acessibilidade

- Navegação por teclado completa
- Labels e ARIA attributes apropriados
- Contraste adequado de cores
- Suporte a leitores de tela
- Focus management em modais

## Testes

Cada componente possui arquivo de teste correspondente:

- `diario-bordo.component.spec.ts`
- `foto-upload.component.spec.ts`
- `galeria-fotos.component.spec.ts`

## Próximas Melhorias

- [ ] Editor de texto rico mais avançado (Quill.js ou similar)
- [ ] Geolocalização automática para entradas
- [ ] Integração com dados climáticos
- [ ] Exportação de diário em PDF
- [ ] Sincronização offline melhorada
- [ ] Compressão automática de imagens
- [ ] Suporte a vídeos
- [ ] Sistema de comentários em entradas públicas
