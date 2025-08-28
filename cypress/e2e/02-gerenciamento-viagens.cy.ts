describe('Gerenciamento de Viagens', () => {
  beforeEach(() => {
    // Interceptar chamadas para Firebase
    cy.intercept('GET', '**/firestore.googleapis.com/**', { fixture: 'viagens-mock.json' }).as('carregarViagens');
    cy.intercept('POST', '**/firestore.googleapis.com/**', { fixture: 'firestore-success.json' }).as('salvarViagem');
    cy.intercept('PATCH', '**/firestore.googleapis.com/**', { fixture: 'firestore-success.json' }).as('atualizarViagem');
    cy.intercept('DELETE', '**/firestore.googleapis.com/**', {}).as('excluirViagem');
    
    // Fazer login antes de cada teste
    cy.login('teste@andestripmanager.com', 'senha123');
  });

  describe('Dashboard de Viagens', () => {
    it('deve exibir lista de viagens no dashboard', () => {
      cy.visit('/dashboard');
      cy.wait('@carregarViagens');
      
      // Verificar elementos do dashboard
      cy.get('[data-cy="dashboard-title"]').should('contain.text', 'Minhas Viagens');
      cy.get('[data-cy="nova-viagem-button"]').should('be.visible');
      cy.get('[data-cy="viagem-card"]').should('have.length.at.least', 1);
    });

    it('deve filtrar viagens por status', () => {
      cy.visit('/dashboard');
      cy.wait('@carregarViagens');
      
      // Aplicar filtro por status
      cy.get('[data-cy="filtro-status"]').click();
      cy.get('[data-cy="status-planejada"]').click();
      
      // Verificar se apenas viagens planejadas são exibidas
      cy.get('[data-cy="viagem-card"]').each(($card) => {
        cy.wrap($card).find('[data-cy="status-chip"]').should('contain.text', 'Planejada');
      });
    });

    it('deve buscar viagens por nome', () => {
      cy.visit('/dashboard');
      cy.wait('@carregarViagens');
      
      // Usar campo de busca
      cy.get('[data-cy="busca-viagem"]').type('Campos do Jordão');
      
      // Verificar resultados da busca
      cy.get('[data-cy="viagem-card"]').should('have.length', 1);
      cy.get('[data-cy="viagem-nome"]').should('contain.text', 'Campos do Jordão');
    });

    it('deve ordenar viagens por data', () => {
      cy.visit('/dashboard');
      cy.wait('@carregarViagens');
      
      // Clicar no botão de ordenação
      cy.get('[data-cy="ordenar-data"]').click();
      
      // Verificar se as viagens estão ordenadas
      cy.get('[data-cy="viagem-card"]').first()
        .find('[data-cy="data-inicio"]')
        .should('contain.text', '01/06/2024');
    });
  });

  describe('Criação de Viagem', () => {
    it('deve abrir formulário de nova viagem', () => {
      cy.visit('/dashboard');
      cy.get('[data-cy="nova-viagem-button"]').click();
      
      // Verificar se o formulário foi aberto
      cy.url().should('include', '/viagens/nova');
      cy.get('[data-cy="form-title"]').should('contain.text', 'Nova Viagem');
    });

    it('deve validar campos obrigatórios', () => {
      cy.visit('/viagens/nova');
      
      // Tentar salvar sem preencher campos
      cy.get('[data-cy="salvar-viagem-button"]').click();
      
      // Verificar mensagens de validação
      cy.get('[data-cy="nome-error"]').should('contain.text', 'Nome é obrigatório');
      cy.get('[data-cy="data-inicio-error"]').should('contain.text', 'Data de início é obrigatória');
      cy.get('[data-cy="data-fim-error"]').should('contain.text', 'Data de fim é obrigatória');
    });

    it('deve validar datas da viagem', () => {
      cy.visit('/viagens/nova');
      
      // Preencher com data de fim anterior à data de início
      cy.get('[data-cy="nome-viagem-input"]').type('Viagem Teste');
      cy.get('[data-cy="data-inicio-input"]').type('10/06/2024');
      cy.get('[data-cy="data-fim-input"]').type('05/06/2024');
      cy.get('[data-cy="salvar-viagem-button"]').click();
      
      // Verificar erro de validação de data
      cy.get('[data-cy="data-fim-error"]').should('contain.text', 'Data de fim deve ser posterior à data de início');
    });

    it('deve criar nova viagem com dados válidos', () => {
      cy.visit('/viagens/nova');
      
      // Preencher formulário
      const dadosViagem = {
        nome: 'Viagem E2E Teste',
        descricao: 'Viagem criada durante teste automatizado',
        dataInicio: '01/08/2024',
        dataFim: '05/08/2024',
        orcamento: 2000
      };
      
      cy.preencherFormularioViagem(dadosViagem);
      cy.get('[data-cy="salvar-viagem-button"]').click();
      
      cy.wait('@salvarViagem');
      
      // Verificar sucesso e redirecionamento
      cy.verificarMensagemSucesso('Viagem criada com sucesso!');
      cy.url().should('include', '/viagens/');
    });
  });

  describe('Edição de Viagem', () => {
    it('deve abrir formulário de edição', () => {
      cy.visit('/dashboard');
      cy.wait('@carregarViagens');
      
      // Clicar no botão de editar da primeira viagem
      cy.get('[data-cy="viagem-card"]').first()
        .find('[data-cy="editar-viagem"]').click();
      
      // Verificar se o formulário de edição foi aberto
      cy.url().should('include', '/viagens/viagem-1/editar');
      cy.get('[data-cy="form-title"]').should('contain.text', 'Editar Viagem');
    });

    it('deve carregar dados da viagem no formulário', () => {
      cy.visit('/viagens/viagem-1/editar');
      
      // Verificar se os campos estão preenchidos
      cy.get('[data-cy="nome-viagem-input"]').should('have.value', 'Viagem para Campos do Jordão');
      cy.get('[data-cy="data-inicio-input"]').should('have.value', '01/06/2024');
      cy.get('[data-cy="data-fim-input"]').should('have.value', '03/06/2024');
    });

    it('deve salvar alterações na viagem', () => {
      cy.visit('/viagens/viagem-1/editar');
      
      // Alterar nome da viagem
      cy.get('[data-cy="nome-viagem-input"]').clear().type('Viagem Editada E2E');
      cy.get('[data-cy="salvar-viagem-button"]').click();
      
      cy.wait('@atualizarViagem');
      
      // Verificar sucesso
      cy.verificarMensagemSucesso('Viagem atualizada com sucesso!');
    });
  });

  describe('Exclusão de Viagem', () => {
    it('deve exibir confirmação antes de excluir', () => {
      cy.visit('/dashboard');
      cy.wait('@carregarViagens');
      
      // Clicar no botão de excluir
      cy.get('[data-cy="viagem-card"]').first()
        .find('[data-cy="excluir-viagem"]').click();
      
      // Verificar modal de confirmação
      cy.get('[data-cy="confirmation-dialog"]').should('be.visible');
      cy.get('[data-cy="confirmation-message"]')
        .should('contain.text', 'Tem certeza que deseja excluir esta viagem?');
    });

    it('deve cancelar exclusão', () => {
      cy.visit('/dashboard');
      cy.wait('@carregarViagens');
      
      // Abrir confirmação e cancelar
      cy.get('[data-cy="viagem-card"]').first()
        .find('[data-cy="excluir-viagem"]').click();
      cy.get('[data-cy="cancelar-exclusao"]').click();
      
      // Verificar que a viagem ainda existe
      cy.get('[data-cy="confirmation-dialog"]').should('not.exist');
      cy.get('[data-cy="viagem-card"]').should('have.length.at.least', 1);
    });

    it('deve excluir viagem confirmada', () => {
      cy.visit('/dashboard');
      cy.wait('@carregarViagens');
      
      // Confirmar exclusão
      cy.get('[data-cy="viagem-card"]').first()
        .find('[data-cy="excluir-viagem"]').click();
      cy.get('[data-cy="confirmar-exclusao"]').click();
      
      cy.wait('@excluirViagem');
      
      // Verificar sucesso
      cy.verificarMensagemSucesso('Viagem excluída com sucesso!');
    });
  });

  describe('Detalhes da Viagem', () => {
    it('deve navegar para detalhes da viagem', () => {
      cy.visit('/dashboard');
      cy.wait('@carregarViagens');
      
      // Clicar no card da viagem
      cy.get('[data-cy="viagem-card"]').first().click();
      
      // Verificar navegação para detalhes
      cy.url().should('include', '/viagens/viagem-1');
      cy.get('[data-cy="viagem-detalhes"]').should('be.visible');
    });

    it('deve exibir abas de navegação', () => {
      cy.visit('/viagens/viagem-1');
      
      // Verificar abas disponíveis
      cy.get('[data-cy="tab-dias"]').should('be.visible');
      cy.get('[data-cy="tab-paradas"]').should('be.visible');
      cy.get('[data-cy="tab-hospedagens"]').should('be.visible');
      cy.get('[data-cy="tab-custos"]').should('be.visible');
      cy.get('[data-cy="tab-clima"]').should('be.visible');
      cy.get('[data-cy="tab-diario"]').should('be.visible');
    });

    it('deve navegar entre abas', () => {
      cy.visit('/viagens/viagem-1');
      
      // Navegar para aba de custos
      cy.get('[data-cy="tab-custos"]').click();
      cy.get('[data-cy="custos-content"]').should('be.visible');
      
      // Navegar para aba de dias
      cy.get('[data-cy="tab-dias"]').click();
      cy.get('[data-cy="dias-content"]').should('be.visible');
    });
  });

  describe('Responsividade - Viagens', () => {
    it('deve ser responsivo em dispositivos móveis', () => {
      cy.setMobileViewport();
      cy.visit('/dashboard');
      cy.wait('@carregarViagens');
      
      // Verificar layout mobile
      cy.get('[data-cy="viagem-card"]').checkResponsiveness();
      cy.get('[data-cy="nova-viagem-button"]').should('be.visible');
    });

    it('deve adaptar formulário para mobile', () => {
      cy.setMobileViewport();
      cy.visit('/viagens/nova');
      
      // Verificar formulário em mobile
      cy.get('[data-cy="viagem-form"]').checkResponsiveness();
      cy.get('[data-cy="salvar-viagem-button"]').should('be.visible');
    });

    it('deve adaptar detalhes para tablet', () => {
      cy.setTabletViewport();
      cy.visit('/viagens/viagem-1');
      
      // Verificar abas em tablet
      cy.get('[data-cy="viagem-tabs"]').should('be.visible');
      cy.get('[data-cy="tab-dias"]').should('be.visible');
    });
  });
});