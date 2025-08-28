// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Configuração para testes em português
Cypress.config('defaultCommandTimeout', 10000);

// Configurar interceptação de requests para Firebase
beforeEach(() => {
  // Interceptar chamadas para Firebase Auth
  cy.intercept('POST', '**/identitytoolkit.googleapis.com/**', { fixture: 'auth-success.json' }).as('firebaseAuth');
  
  // Interceptar chamadas para Firestore
  cy.intercept('POST', '**/firestore.googleapis.com/**', { fixture: 'firestore-success.json' }).as('firestoreCall');
});

// Configurar viewport padrão para dispositivos móveis
Cypress.Commands.add('setMobileViewport', () => {
  cy.viewport(375, 667); // iPhone SE
});

Cypress.Commands.add('setTabletViewport', () => {
  cy.viewport(768, 1024); // iPad
});

Cypress.Commands.add('setDesktopViewport', () => {
  cy.viewport(1280, 720); // Desktop
});

// Comando customizado para login
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/login');
  cy.get('[data-cy="email-input"]').type(email);
  cy.get('[data-cy="password-input"]').type(password);
  cy.get('[data-cy="login-button"]').click();
  cy.wait('@firebaseAuth');
  cy.url().should('include', '/dashboard');
});

// Comando para simular modo offline
Cypress.Commands.add('goOffline', () => {
  cy.log('Simulando modo offline');
  cy.window().then((win) => {
    win.navigator.onLine = false;
    win.dispatchEvent(new Event('offline'));
  });
});

// Comando para simular volta online
Cypress.Commands.add('goOnline', () => {
  cy.log('Simulando volta online');
  cy.window().then((win) => {
    win.navigator.onLine = true;
    win.dispatchEvent(new Event('online'));
  });
});

// Comando para criar viagem de teste
Cypress.Commands.add('criarViagemTeste', (nomeViagem: string) => {
  cy.get('[data-cy="nova-viagem-button"]').click();
  cy.get('[data-cy="nome-viagem-input"]').type(nomeViagem);
  cy.get('[data-cy="descricao-viagem-input"]').type('Viagem criada automaticamente para testes E2E');
  cy.get('[data-cy="data-inicio-input"]').type('01/06/2024');
  cy.get('[data-cy="data-fim-input"]').type('05/06/2024');
  cy.get('[data-cy="salvar-viagem-button"]').click();
  cy.wait('@firestoreCall');
});

// Declaração de tipos para TypeScript
declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>;
      setMobileViewport(): Chainable<void>;
      setTabletViewport(): Chainable<void>;
      setDesktopViewport(): Chainable<void>;
      goOffline(): Chainable<void>;
      goOnline(): Chainable<void>;
      criarViagemTeste(nomeViagem: string): Chainable<void>;
    }
  }
}