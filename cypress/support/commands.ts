/// <reference types="cypress" />

// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Comando para aguardar carregamento completo da página
Cypress.Commands.add('waitForPageLoad', () => {
  cy.get('[data-cy="loading-spinner"]', { timeout: 10000 }).should('not.exist');
});

// Comando para verificar se elemento está visível na tela
Cypress.Commands.add('shouldBeInViewport', { prevSubject: true }, (subject) => {
  cy.wrap(subject).should('be.visible');
  cy.wrap(subject).then(($el) => {
    const rect = $el[0].getBoundingClientRect();
    expect(rect.top).to.be.at.least(0);
    expect(rect.left).to.be.at.least(0);
    expect(rect.bottom).to.be.at.most(Cypress.config('viewportHeight'));
    expect(rect.right).to.be.at.most(Cypress.config('viewportWidth'));
  });
});

// Comando para verificar responsividade de elemento
Cypress.Commands.add('checkResponsiveness', { prevSubject: true }, (subject) => {
  // Desktop
  cy.setDesktopViewport();
  cy.wrap(subject).shouldBeInViewport();
  
  // Tablet
  cy.setTabletViewport();
  cy.wrap(subject).shouldBeInViewport();
  
  // Mobile
  cy.setMobileViewport();
  cy.wrap(subject).shouldBeInViewport();
});

// Comando para preencher formulário de viagem
Cypress.Commands.add('preencherFormularioViagem', (dadosViagem: {
  nome: string;
  descricao: string;
  dataInicio: string;
  dataFim: string;
  orcamento?: number;
}) => {
  cy.get('[data-cy="nome-viagem-input"]').clear().type(dadosViagem.nome);
  cy.get('[data-cy="descricao-viagem-input"]').clear().type(dadosViagem.descricao);
  cy.get('[data-cy="data-inicio-input"]').clear().type(dadosViagem.dataInicio);
  cy.get('[data-cy="data-fim-input"]').clear().type(dadosViagem.dataFim);
  
  if (dadosViagem.orcamento) {
    cy.get('[data-cy="orcamento-input"]').clear().type(dadosViagem.orcamento.toString());
  }
});

// Comando para verificar mensagem de sucesso
Cypress.Commands.add('verificarMensagemSucesso', (mensagem: string) => {
  cy.get('[data-cy="snackbar-success"]')
    .should('be.visible')
    .and('contain.text', mensagem);
});

// Comando para verificar mensagem de erro
Cypress.Commands.add('verificarMensagemErro', (mensagem: string) => {
  cy.get('[data-cy="snackbar-error"]')
    .should('be.visible')
    .and('contain.text', mensagem);
});

// Declaração de tipos para TypeScript
declare global {
  namespace Cypress {
    interface Chainable {
      waitForPageLoad(): Chainable<void>;
      shouldBeInViewport(): Chainable<JQuery<HTMLElement>>;
      checkResponsiveness(): Chainable<JQuery<HTMLElement>>;
      preencherFormularioViagem(dadosViagem: {
        nome: string;
        descricao: string;
        dataInicio: string;
        dataFim: string;
        orcamento?: number;
      }): Chainable<void>;
      verificarMensagemSucesso(mensagem: string): Chainable<void>;
      verificarMensagemErro(mensagem: string): Chainable<void>;
    }
  }
}