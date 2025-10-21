Crie a funcionalidade completa para gerar um álbum de viagem em PDF, a partir dos dados armazenados no Firestore.

🧩 1. Service (Angular Firestore)
Crie um service chamado ViagemService com os métodos:

novo(viagem: Viagem)

altera(id: string, viagem: Viagem)

remove(id: string)

lista(): Observable<Viagem[]>

recuperarPorId(id: string): Observable<Viagem>

recuperarPorParametro(campo: string, valor: any): Observable<Viagem[]>

A coleção principal deve se chamar viagens.
Dentro de cada documento, podem existir subcoleções:

dias (com informações diárias)

custos

manutencoes

fotos

🧱 2. Componente: gerar-album-viagem

Este componente deve:

Permitir selecionar uma viagem existente.

Buscar todos os dados relacionados dessa viagem (dias, custos, manutenções, fotos).

Montar o conteúdo completo do álbum em memória.

Gerar o arquivo PDF usando uma biblioteca (preferência: pdfmake, ou jspdf com html2canvas).

Disponibilizar o botão "📘 Gerar Álbum de Viagem" que faz o download do PDF.

🖋️ 3. Estrutura do PDF
O PDF deve conter as seções:

Capa — título da viagem, nome do piloto, imagem principal, datas.

Sumário

Introdução — resumo da viagem (objetivo, destino, tipo de moto).

Relato diário — para cada dia:

Data, local de partida e chegada

Distância e tempo de viagem

Paradas e pontos de interesse

Hospedagem

Custos e manutenção

Diário pessoal

Resumo financeiro — tabela totalizadora de gastos por categoria

Manutenções realizadas

Galeria de fotos (miniaturas com legenda)

Conclusão/reflexão final

O estilo deve lembrar um álbum de viagem real, com divisões claras, tipografia agradável e margens adequadas (A4).
Use fontes como Roboto, Open Sans ou Lato.

🧭 4. Implementação técnica

Use Observables e tipagem forte em TypeScript.

Centralize o carregamento de dados no service.

Use funções auxiliares para formatação de data, moeda e layout do PDF.

Inclua tratamento para caso de imagens armazenadas no Firebase Storage.

O botão de gerar PDF deve ficar visível na tela de detalhes da viagem.

🧩 5. Entregáveis esperados

viagem.service.ts

gerar-album-viagem.component.ts

gerar-album-viagem.component.html

gerar-album-viagem.component.css

Qualquer helper necessário (pdf-generator.ts, formatters.ts, etc.)

⚙️ 6. Extras opcionais

Adicionar mapa da rota (imagem ou iframe do Google Maps se disponível).

Inserir QR Code com link da viagem no app.

Incluir numeração de páginas e cabeçalho com nome da viagem.

💡 Importante para o Windsurf:

Gere e insira os arquivos diretamente no projeto Angular.

Documente com comentários em cada função.

Quando terminar, exiba um preview do código do componente e do PDF resultante.

Utilize a sintaxe Angular 17+ e Firestore modular (v9+).

🧾 Objetivo final:
O resultado deve ser um gerador de álbuns de viagem PDF, integrado ao Firestore, totalmente funcional e estilizado para impressão profissional.