# Project Structure & Organization

## Angular Application Architecture

### Component Architecture Standard

**IMPORTANTE: Todos os novos componentes devem ser criados como Standalone Components**

- **Standalone Components são o padrão** - Todos os novos componentes devem usar a abordagem standalone
- **Migração gradual** - Componentes existentes podem ser migrados para standalone quando modificados
- **Benefícios**: Melhor tree-shaking, carregamento mais rápido, menos dependências de módulos

### Module Organization (Legacy - para componentes existentes)

- **Core Module** - Singleton services, guards, interceptors (imported once in AppModule)
- **Shared Module** - Reusable components, pipes, directives (imported in feature modules)
- **Feature Modules** - Lazy-loaded business logic modules
- **Standalone Components** - Abordagem moderna e padrão para novos componentes

### Folder Structure

```
src/
├── app/
│   ├── core/                    # Singleton services and core functionality
│   │   ├── guards/             # Route guards (AuthGuard, RoleGuard)
│   │   ├── interceptors/       # HTTP interceptors
│   │   └── services/           # Core services (Firebase, Cache)
│   ├── shared/                 # Reusable components and utilities
│   │   ├── components/         # Shared UI components
│   │   ├── pipes/             # Custom pipes
│   │   ├── directives/        # Custom directives
│   │   └── services/          # Shared services
│   ├── features/              # Business feature modules
│   │   ├── auth/              # Authentication (login, register)
│   │   ├── dashboard/         # Main dashboard
│   │   ├── viagens/           # Trip management
│   │   ├── profile/           # User profile
│   │   └── [feature]/         # Other features
│   ├── models/                # TypeScript interfaces and types
│   ├── services/              # Business logic services
│   ├── utils/                 # Utility functions and helpers
│   ├── app.config.ts          # Application configuration
│   ├── app.routes.ts          # Main routing configuration
│   └── app.ts                 # Root component
├── environments/              # Environment configurations
├── assets/                    # Static assets (images, icons, etc.)
└── styles/                    # Global styles and themes
```

## Naming Conventions

### Files and Folders

- **Components**: `kebab-case.component.ts` (e.g., `viagem-card.component.ts`)
- **Services**: `kebab-case.service.ts` (e.g., `viagens.service.ts`)
- **Models**: `kebab-case.interface.ts` (e.g., `viagem.interface.ts`)
- **Modules**: `kebab-case.module.ts` (e.g., `viagens.module.ts`)
- **Folders**: `kebab-case` (e.g., `dias-viagem/`)

### Classes and Interfaces

- **Components**: `PascalCase` + `Component` (e.g., `ViagemCardComponent`)
- **Services**: `PascalCase` + `Service` (e.g., `ViagensService`)
- **Interfaces**: `PascalCase` (e.g., `Viagem`, `Usuario`)
- **Enums**: `PascalCase` (e.g., `StatusViagem`)

### Variables and Methods

- **Properties**: `camelCase` (e.g., `viagemAtual`, `isLoading`)
- **Methods**: `camelCase` with descriptive verbs (e.g., `carregarViagens()`, `salvarViagem()`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `MAX_FILE_SIZE`)

## Component Structure

### Standalone Component Template (PADRÃO)

```typescript
@Component({
  selector: "app-exemplo",
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    // outros imports necessários
  ],
  templateUrl: "./exemplo.component.html",
  styleUrls: ["./exemplo.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExemploComponent implements OnInit, OnDestroy {
  // 1. Inputs and Outputs
  @Input() dadosEntrada!: any;
  @Output() eventoSaida = new EventEmitter<any>();

  // 2. Public properties (used in template)
  isLoading = false;
  dados$ = new BehaviorSubject<any[]>([]);

  // 3. Private properties
  private destroy$ = new Subject<void>();

  // 4. Constructor with dependency injection
  constructor(private service: ExemploService, private cdr: ChangeDetectorRef) {}

  // 5. Lifecycle hooks
  ngOnInit(): void {
    this.carregarDados();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // 6. Public methods (template methods)
  onAction(): void {
    // Implementation
  }

  // 7. Private methods
  private carregarDados(): void {
    // Implementation
  }
}
```

## Service Structure

### Base Service Pattern

All CRUD services extend `BaseService<T>` interface:

```typescript
@Injectable({ providedIn: "root" })
export class ExemploService implements BaseService<Exemplo> {
  protected collectionName = "exemplos";

  constructor(protected firestore: AngularFirestore, private cache: CacheService) {}

  // Base CRUD methods
  async novo(dados: Exemplo): Promise<void> {}
  async altera(id: string, dados: Partial<Exemplo>): Promise<void> {}
  async remove(id: string): Promise<void> {}
  lista(): Observable<Exemplo[]> {}
  recuperarPorId(id: string): Observable<Exemplo | undefined> {}
  recuperarPorOutroParametro(param: string, valor: any): Observable<Exemplo[]> {}

  // Specific business methods
  metodoEspecifico(): Observable<any> {}
}
```

## Data Models Structure

### Interface Organization

```typescript
// Base interface for all entities
interface BaseEntity {
  id?: string;
  criadoEm?: Timestamp;
  atualizadoEm?: Timestamp;
}

// Main entities
interface Viagem extends BaseEntity {
  usuarioId: string;
  nome: string;
  descricao: string;
  dataInicio: string;
  dataFim: string;
  status: StatusViagem;
  // ... other properties
}

// Enums for type safety
enum StatusViagem {
  PLANEJADA = "planejada",
  EM_ANDAMENTO = "em-andamento",
  FINALIZADA = "finalizada",
}
```

## Routing Structure

### Feature Module Routing

```typescript
// Feature routing (lazy-loaded)
const routes: Routes = [
  {
    path: "viagens",
    loadChildren: () => import("./features/viagens/viagens.module").then((m) => m.ViagensModule),
    canActivate: [AuthGuard],
  },
  {
    path: "dashboard",
    loadChildren: () => import("./features/dashboard/dashboard.module").then((m) => m.DashboardModule),
    canActivate: [AuthGuard],
  },
];

// Child routes within feature
const viagensRoutes: Routes = [
  { path: "", component: ViagensListComponent },
  { path: "nova", component: ViagemFormComponent },
  { path: ":id", component: ViagemDetailComponent },
  { path: ":id/editar", component: ViagemFormComponent },
];
```

## Import Organization

### Import Order

```typescript
// 1. Angular core imports
import { Component, OnInit, Input, Output, EventEmitter } from "@angular/core";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";

// 2. Angular Material imports
import { MatDialog } from "@angular/material/dialog";
import { MatSnackBar } from "@angular/material/snack-bar";

// 3. Third-party library imports
import { Observable, Subject, BehaviorSubject } from "rxjs";
import { takeUntil, switchMap, tap } from "rxjs/operators";

// 4. Application imports (services, models, components)
import { ViagensService } from "../../services/viagens.service";
import { Viagem } from "../../models/viagem.interface";
import { AuthService } from "../../core/services/auth.service";
```

## File Organization Rules

### Component Files

- Each component in its own folder
- Include `.component.ts`, `.component.html`, `.component.scss`, `.component.spec.ts`
- Shared components in `shared/components/`
- Feature-specific components in `features/[feature]/components/`

### Service Files

- Business services in `services/` folder
- Core services in `core/services/`
- One service per file
- Include corresponding `.spec.ts` test file

### Model Files

- All interfaces in `models/` folder
- Group related interfaces in same file when appropriate
- Export all models from `models/index.ts`

### Asset Organization

```
assets/
├── images/
│   ├── icons/          # App icons and small graphics
│   ├── logos/          # Brand logos
│   └── backgrounds/    # Background images
├── fonts/              # Custom fonts
└── data/              # Static JSON data files
```

## Code Organization Best Practices

### Barrel Exports

Use index.ts files for clean imports:

```typescript
// models/index.ts
export * from "./viagem.interface";
export * from "./usuario.interface";
export * from "./parada.interface";

// Usage
import { Viagem, Usuario, Parada } from "../models";
```

### Feature Module Structure

```
features/viagens/
├── components/
│   ├── viagem-card/
│   ├── viagem-form/
│   └── viagem-list/
├── services/
├── models/
├── viagens.module.ts
├── viagens.routes.ts
└── index.ts
```

### Lazy Loading

#### Standalone Components (PADRÃO)

Novos componentes devem usar lazy loading com standalone:

```typescript
const routes: Routes = [
  {
    path: "exemplo",
    loadComponent: () => import("./components/exemplo/exemplo.component").then((c) => c.ExemploComponent),
    canActivate: [AuthGuard],
  },
];
```

#### Feature Modules (Legacy)

Para módulos existentes que ainda não foram migrados:

```typescript
const routes: Routes = [
  {
    path: "feature",
    loadChildren: () => import("./features/feature/feature.module").then((m) => m.FeatureModule),
  },
];
```

## Standalone Components Guidelines

### Imports Obrigatórios

```typescript
import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-exemplo',
  standalone: true,
  imports: [
    CommonModule, // Sempre incluir para *ngIf, *ngFor, etc.
    // Adicionar outros imports conforme necessário
  ],
  // ...
})
```

### Estrutura de Imports Recomendada

```typescript
// 1. Angular core
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

// 2. Angular Material (se necessário)
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

// 3. Outros componentes standalone
import { LoadingSpinnerComponent } from '../loading-spinner/loading-spinner.component';

// 4. Services e models
import { ExemploService } from '../../services/exemplo.service';
import { Exemplo } from '../../models/exemplo.interface';
```

### Migração de Componentes Existentes

Ao modificar componentes existentes, considere migrar para standalone:

1. Adicionar `standalone: true`
2. Adicionar array `imports` com dependências necessárias
3. Remover do módulo onde estava declarado
4. Atualizar rotas se necessário
5. Atualizar imports em outros componentes que o utilizam
