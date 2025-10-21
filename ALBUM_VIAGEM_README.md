# 📘 Funcionalidade de Geração de Álbum de Viagem em PDF

## Visão Geral

Esta funcionalidade permite gerar um álbum de viagem completo em formato PDF (A4), incluindo todos os dados registrados durante a viagem: dias, paradas, hospedagens, custos, manutenções e diário de bordo.

## Arquivos Criados/Modificados

### 1. **Biblioteca Instalada**
- `pdfmake` - Biblioteca para geração de PDFs
- `@types/pdfmake` - Tipos TypeScript para pdfmake

### 2. **Services**
- **`src/app/services/viagens.service.ts`** (modificado)
  - Adicionado método `recuperarDadosCompletosViagem()` que busca todos os dados relacionados à viagem
  - Integrado `ManutencoesService` no construtor

### 3. **Helpers**
- **`src/app/shared/helpers/formatters.ts`** (novo)
  - Funções de formatação para datas, moedas, distâncias, etc.
  - Formatadores específicos para categorias, status e condições climáticas
  
- **`src/app/shared/helpers/pdf-generator.ts`** (novo)
  - Função principal `gerarAlbumViagem()` que cria o PDF
  - Estrutura completa do documento com seções:
    - Capa personalizada
    - Sumário
    - Introdução
    - Relato diário
    - Resumo financeiro
    - Manutenções realizadas
    - Conclusão com estatísticas

### 4. **Componente**
- **`src/app/features/viagens/gerar-album-viagem/`** (novo)
  - `gerar-album-viagem.component.ts` - Lógica do componente
  - `gerar-album-viagem.component.html` - Template
  - `gerar-album-viagem.component.css` - Estilos

### 5. **Integração**
- **`src/app/features/viagens/viagem-detail/viagem-detail.component.ts`** (modificado)
  - Importado `GerarAlbumViagemComponent`
  
- **`src/app/features/viagens/viagem-detail/viagem-detail.component.html`** (modificado)
  - Adicionado componente na seção de Ações Rápidas do resumo da viagem

## Como Usar

### 1. Acessar a Funcionalidade
1. Navegue até os detalhes de uma viagem
2. Na aba "Resumo", role até a seção "Gerador de Álbum"
3. O componente mostrará um resumo dos dados disponíveis

### 2. Gerar o Álbum
1. Clique no botão **"📘 Gerar Álbum de Viagem"**
2. O sistema carregará todos os dados da viagem do Firestore
3. O PDF será gerado e o download iniciará automaticamente
4. O arquivo será salvo como `album-viagem-[nome-da-viagem].pdf`

## Estrutura do PDF Gerado

### Capa
- Título do álbum
- Nome da viagem
- Nome do piloto
- Período da viagem
- Rota (origem → destino)
- Descrição da viagem

### Sumário
- Lista de todas as seções incluídas no álbum

### Introdução
- Informações gerais da viagem
- Objetivo
- Datas e locais
- Observações iniciais

### Relato Diário
Para cada dia da viagem:
- Data e número do dia
- Condição climática
- Origem e destino
- Distância percorrida
- Horários de partida e chegada
- Paradas e pontos de interesse
- Hospedagem do dia
- Custos do dia
- Diário de bordo/observações

### Resumo Financeiro
- Tabela com custos por categoria
- Valor total e percentuais
- Número de registros
- Dicas financeiras

### Manutenções Realizadas
- Tabela com todas as manutenções
- Data, tipo, descrição e custo
- Total de manutenções

### Conclusão
- Estatísticas finais:
  - Total de dias
  - Distância total percorrida
  - Custo total da viagem
- Reflexão final
- Citação motivacional

## Características Técnicas

### Formatação
- **Tamanho**: A4
- **Margens**: 40px (laterais e topo/rodapé: 60px)
- **Fontes**: Roboto (padrão do pdfmake)
- **Cores**: Paleta profissional com azuis, verdes e cinzas

### Estilos Aplicados
- Cabeçalhos com hierarquia clara
- Tabelas com linhas alternadas
- Ícones e emojis para melhor visualização
- Separadores visuais entre seções
- Numeração de páginas (exceto capa)

### Responsividade
- Layout otimizado para impressão
- Quebras de página inteligentes
- Conteúdo adaptativo baseado nos dados disponíveis

## Tratamento de Erros

O componente inclui tratamento robusto de erros:

### Validações
- Verifica se o ID da viagem foi fornecido
- Valida se a viagem existe no Firestore
- Confirma permissões do usuário
- Verifica dados mínimos necessários

### Mensagens de Erro
- **Viagem não encontrada**: Quando o ID é inválido
- **Sem permissão**: Quando o usuário não tem acesso
- **Dados incompletos**: Quando faltam informações essenciais
- **Erro de conexão**: Problemas de rede

### Feedback ao Usuário
- Loading spinner durante geração
- Mensagens de sucesso (snackbar verde)
- Mensagens de erro (snackbar vermelho)
- Informações sobre o conteúdo do álbum

## Dados Incluídos

O álbum inclui automaticamente:

✅ **Dados da Viagem**
- Nome, descrição, datas
- Origem e destino
- Status e observações

✅ **Dias de Viagem**
- Rota diária
- Distâncias e horários
- Condições climáticas
- Diário de bordo

✅ **Paradas**
- Locais visitados
- Descrições
- Vinculação com dias

✅ **Hospedagens**
- Nome e endereço
- Tipo de hospedagem
- Valores
- Avaliações

✅ **Custos**
- Todas as categorias
- Valores e datas
- Resumo por categoria
- Total geral

✅ **Manutenções**
- Tipo e descrição
- Data e quilometragem
- Custos
- Local/oficina

## Melhorias Futuras Sugeridas

### Funcionalidades
- [ ] Adicionar fotos ao PDF
- [ ] Incluir mapas da rota
- [ ] Gerar QR Code com link da viagem
- [ ] Opção de personalizar template
- [ ] Exportar em outros formatos (DOCX, HTML)
- [ ] Enviar por email diretamente
- [ ] Compartilhar em redes sociais

### Otimizações
- [ ] Cache de dados para regeneração rápida
- [ ] Preview antes de gerar
- [ ] Opções de customização (cores, fontes)
- [ ] Seleção de seções a incluir
- [ ] Múltiplos idiomas

## Dependências

```json
{
  "pdfmake": "^0.2.x",
  "@types/pdfmake": "^0.2.x"
}
```

## Compatibilidade

- ✅ Angular 17+
- ✅ Firebase/Firestore v9+
- ✅ Navegadores modernos (Chrome, Firefox, Safari, Edge)
- ✅ Mobile (iOS/Android)

## Suporte

Para problemas ou dúvidas:
1. Verifique os logs do console do navegador
2. Confirme que todos os dados da viagem estão salvos
3. Teste a conexão com o Firestore
4. Verifique permissões do usuário

## Licença

Este código faz parte do projeto AndesTripManager e segue a mesma licença do projeto principal.
