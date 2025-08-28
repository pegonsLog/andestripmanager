# Tipografia - Fonte Padrão

## Fonte Principal

- **Fonte Padrão**: Montserrat
- **Fallbacks**: 'Helvetica Neue', Arial, sans-serif
- **Importação**: Google Fonts

## Implementação

### Importação no index.html

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap"
  rel="stylesheet"
/>
```

### Configuração no styles.scss

```scss
// Definir Montserrat como fonte padrão
$custom-typography: mat.define-typography-config(
  $font-family: 'Montserrat, "Helvetica Neue", Arial, sans-serif',
);

// Aplicar em todo o tema
$custom-theme: mat.define-light-theme(
  (
    color: (
      primary: $primary-palette,
      accent: $accent-palette,
      warn: $warn-palette,
    ),
    typography: $custom-typography,
    density: 0,
  )
);
```

### Estilos Globais

```scss
body {
  font-family: "Montserrat", "Helvetica Neue", Arial, sans-serif;
}

// Classes utilitárias para diferentes pesos
.font-light {
  font-weight: 300;
}
.font-regular {
  font-weight: 400;
}
.font-medium {
  font-weight: 500;
}
.font-semibold {
  font-weight: 600;
}
.font-bold {
  font-weight: 700;
}
```

## Pesos Disponíveis

- **Light (300)**: Para textos secundários
- **Regular (400)**: Para corpo de texto
- **Medium (500)**: Para labels e botões
- **SemiBold (600)**: Para subtítulos
- **Bold (700)**: Para títulos principais

## Aplicação

- Todos os componentes devem usar Montserrat como fonte padrão
- Manter consistência tipográfica em toda a aplicação
- Usar os pesos apropriados conforme a hierarquia de informação
