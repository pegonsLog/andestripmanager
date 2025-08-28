describe('Autenticação', () => {
  beforeEach(() => {
    // Interceptar chamadas para Firebase
    cy.intercept('POST', '**/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword*', 
      { fixture: 'auth-success.json' }).as('login');
    cy.intercept('POST', '**/identitytoolkit.googleapis.com/v1/accounts:signUp*', 
      { fixture: 'auth-success.json' }).as('register');
  });

  describe('Login', () => {
    it('deve exibir a tela de login corretamente', () => {
      cy.visit('/login');
      
      // Verificar elementos da tela de login
      cy.get('[data-cy="login-title"]').should('contain.text', 'Entrar');
      cy.get('[data-cy="email-input"]').should('be.visible');
      cy.get('[data-cy="password-input"]').should('be.visible');
      cy.get('[data-cy="login-button"]').should('be.visible');
      cy.get('[data-cy="register-link"]').should('be.visible');
      cy.get('[data-cy="forgot-password-link"]').should('be.visible');
    });

    it('deve validar campos obrigatórios', () => {
      cy.visit('/login');
      
      // Tentar fazer login sem preencher campos
      cy.get('[data-cy="login-button"]').click();
      
      // Verificar mensagens de validação
      cy.get('[data-cy="email-error"]').should('contain.text', 'Email é obrigatório');
      cy.get('[data-cy="password-error"]').should('contain.text', 'Senha é obrigatória');
    });

    it('deve validar formato do email', () => {
      cy.visit('/login');
      
      // Inserir email inválido
      cy.get('[data-cy="email-input"]').type('email-invalido');
      cy.get('[data-cy="password-input"]').type('senha123');
      cy.get('[data-cy="login-button"]').click();
      
      // Verificar mensagem de validação
      cy.get('[data-cy="email-error"]').should('contain.text', 'Email deve ter um formato válido');
    });

    it('deve fazer login com credenciais válidas', () => {
      cy.visit('/login');
      
      // Preencher formulário de login
      cy.get('[data-cy="email-input"]').type('teste@andestripmanager.com');
      cy.get('[data-cy="password-input"]').type('senha123');
      cy.get('[data-cy="login-button"]').click();
      
      // Aguardar chamada de autenticação
      cy.wait('@login');
      
      // Verificar redirecionamento para dashboard
      cy.url().should('include', '/dashboard');
      cy.get('[data-cy="dashboard-title"]').should('be.visible');
    });

    it('deve exibir erro para credenciais inválidas', () => {
      // Interceptar erro de autenticação
      cy.intercept('POST', '**/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword*', 
        { statusCode: 400, body: { error: { message: 'INVALID_PASSWORD' } } }).as('loginError');
      
      cy.visit('/login');
      
      // Preencher com credenciais inválidas
      cy.get('[data-cy="email-input"]').type('teste@andestripmanager.com');
      cy.get('[data-cy="password-input"]').type('senhaerrada');
      cy.get('[data-cy="login-button"]').click();
      
      cy.wait('@loginError');
      
      // Verificar mensagem de erro
      cy.verificarMensagemErro('Senha incorreta');
    });
  });

  describe('Registro', () => {
    it('deve navegar para tela de registro', () => {
      cy.visit('/login');
      cy.get('[data-cy="register-link"]').click();
      
      cy.url().should('include', '/register');
      cy.get('[data-cy="register-title"]').should('contain.text', 'Criar Conta');
    });

    it('deve validar campos do registro', () => {
      cy.visit('/register');
      
      // Tentar registrar sem preencher campos
      cy.get('[data-cy="register-button"]').click();
      
      // Verificar mensagens de validação
      cy.get('[data-cy="nome-error"]').should('contain.text', 'Nome é obrigatório');
      cy.get('[data-cy="email-error"]').should('contain.text', 'Email é obrigatório');
      cy.get('[data-cy="password-error"]').should('contain.text', 'Senha é obrigatória');
    });

    it('deve validar confirmação de senha', () => {
      cy.visit('/register');
      
      cy.get('[data-cy="nome-input"]').type('Usuário Teste');
      cy.get('[data-cy="email-input"]').type('novo@andestripmanager.com');
      cy.get('[data-cy="password-input"]').type('senha123');
      cy.get('[data-cy="confirm-password-input"]').type('senha456');
      cy.get('[data-cy="register-button"]').click();
      
      // Verificar erro de confirmação de senha
      cy.get('[data-cy="confirm-password-error"]').should('contain.text', 'As senhas não coincidem');
    });

    it('deve criar conta com dados válidos', () => {
      cy.visit('/register');
      
      // Preencher formulário de registro
      cy.get('[data-cy="nome-input"]').type('Usuário Teste');
      cy.get('[data-cy="email-input"]').type('novo@andestripmanager.com');
      cy.get('[data-cy="password-input"]').type('senha123');
      cy.get('[data-cy="confirm-password-input"]').type('senha123');
      cy.get('[data-cy="register-button"]').click();
      
      cy.wait('@register');
      
      // Verificar redirecionamento para dashboard
      cy.url().should('include', '/dashboard');
      cy.verificarMensagemSucesso('Conta criada com sucesso!');
    });
  });

  describe('Logout', () => {
    beforeEach(() => {
      // Fazer login antes de cada teste
      cy.login('teste@andestripmanager.com', 'senha123');
    });

    it('deve fazer logout corretamente', () => {
      // Clicar no menu do usuário
      cy.get('[data-cy="user-menu"]').click();
      cy.get('[data-cy="logout-button"]').click();
      
      // Verificar redirecionamento para login
      cy.url().should('include', '/login');
      cy.get('[data-cy="login-title"]').should('be.visible');
    });
  });

  describe('Responsividade - Autenticação', () => {
    it('deve ser responsivo em dispositivos móveis', () => {
      cy.setMobileViewport();
      cy.visit('/login');
      
      // Verificar elementos visíveis em mobile
      cy.get('[data-cy="login-form"]').checkResponsiveness();
      cy.get('[data-cy="login-button"]').should('be.visible');
    });

    it('deve ser responsivo em tablets', () => {
      cy.setTabletViewport();
      cy.visit('/login');
      
      // Verificar layout em tablet
      cy.get('[data-cy="login-form"]').should('be.visible');
      cy.get('[data-cy="email-input"]').should('be.visible');
    });
  });
});