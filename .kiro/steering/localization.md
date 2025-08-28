# Localização e Formatação - Brasil

## Configuração Regional

### Idioma

- **Idioma Principal**: Português do Brasil (pt-BR)
- **Encoding**: UTF-8
- **Direção do Texto**: Left-to-Right (LTR)

### Moeda

- **Moeda**: Real Brasileiro (BRL)
- **Símbolo**: R$
- **Formato**: R$ 1.234,56
- **Separador Decimal**: vírgula (,)
- **Separador de Milhares**: ponto (.)

### Formato de Data

- **Formato Padrão**: DD/MM/YYYY
- **Formato com Hora**: DD/MM/YYYY HH:mm
- **Formato Completo**: DD/MM/YYYY HH:mm:ss
- **Separador**: barra (/)

### Formato de Hora

- **Formato**: 24 horas (HH:mm)
- **Separador**: dois pontos (:)

## Implementação Angular

### Configuração no app.config.ts

```typescript
import { LOCALE_ID } from "@angular/core";
import { registerLocaleData } from "@angular/common";
import localePt from "@angular/common/locales/pt";

registerLocaleData(localePt);

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: LOCALE_ID, useValue: "pt-BR" },
    // outros providers...
  ],
};
```

### Pipes de Formatação

- **Moeda**: `{{ valor | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}`
- **Data**: `{{ data | date:'dd/MM/yyyy':'pt-BR' }}`
- **Data e Hora**: `{{ data | date:'dd/MM/yyyy HH:mm':'pt-BR' }}`
- **Número**: `{{ numero | number:'1.2-2':'pt-BR' }}`

### Validação de Formulários

- **CPF**: Validar formato XXX.XXX.XXX-XX
- **CNPJ**: Validar formato XX.XXX.XXX/XXXX-XX
- **CEP**: Validar formato XXXXX-XXX
- **Telefone**: Validar formato (XX) XXXXX-XXXX

### Textos e Labels

- **Títulos**: Primeira letra maiúscula
- **Botões**: Verbos no infinitivo (Salvar, Cancelar, Excluir)
- **Mensagens de Erro**: Linguagem clara e objetiva
- **Placeholders**: Exemplos práticos em português

### Formatação de Números

- **Distância**: XXX,X km
- **Combustível**: XX,X litros
- **Consumo**: XX,X km/l
- **Velocidade**: XXX km/h

### Configuração de Timezone

- **Timezone**: America/Sao_Paulo
- **Horário de Verão**: Automático conforme legislação brasileira

## Exemplos de Uso

### Formatação de Moeda

```typescript
// Service
formatarMoeda(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
}

// Template
{{ custo.valor | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
```

### Formatação de Data

```typescript
// Service
formatarData(data: Date): string {
  return new Intl.DateTimeFormat('pt-BR').format(data);
}

// Template
{{ viagem.dataInicio | date:'dd/MM/yyyy':'pt-BR' }}
```

### Validadores Customizados

```typescript
// CPF Validator
export function cpfValidator(control: AbstractControl): ValidationErrors | null {
  const cpf = control.value?.replace(/\D/g, "");
  if (!cpf || cpf.length !== 11) {
    return { cpfInvalido: true };
  }
  // Lógica de validação do CPF
  return null;
}

// CEP Validator
export function cepValidator(control: AbstractControl): ValidationErrors | null {
  const cep = control.value?.replace(/\D/g, "");
  if (!cep || cep.length !== 8) {
    return { cepInvalido: true };
  }
  return null;
}
```

### Máscaras de Input

```typescript
// Máscara para moeda
maskMoeda = {
  mask: "R$ separator.2",
  thousandSeparator: ".",
  decimalMarker: ",",
};

// Máscara para data
maskData = {
  mask: "00/00/0000",
};

// Máscara para telefone
maskTelefone = {
  mask: "(00) 00000-0000",
};
```

## Mensagens Padrão

### Validação

- "Campo obrigatório"
- "Email inválido"
- "CPF inválido"
- "Data inválida"
- "Valor deve ser maior que zero"

### Ações

- "Salvar"
- "Cancelar"
- "Excluir"
- "Editar"
- "Visualizar"
- "Voltar"

### Status

- "Carregando..."
- "Salvando..."
- "Processando..."
- "Concluído"
- "Erro"

### Confirmações

- "Tem certeza que deseja excluir?"
- "Alterações não salvas serão perdidas"
- "Operação realizada com sucesso"
