describe('Fluxo Completo do Usuário', () => {
  beforeEach(() => {
    // Interceptar todas as chamadas necessárias
    cy.intercept('POST', '**/identitytoolkit.googleapis.com/**', { fixture: 'auth-success.json' }).as('auth');
    cy.intercept('GET', '**/firestore.googleapis.com/**', { fixture: 'viagens-mock.json' }).as('carregarDados');
    cy.intercept('POST', '**/firestore.googleapis.com/**', { fixture: 'firestore-success.json' }).as('salvarDados');
    cy.intercept('PATCH', '**/firestore.googleapis.com/**', { fixture: 'firestore-success.json' }).as('atualizarDados');
    cy.intercept('DELETE', '**/firestore.googleapis.com/**', {}).as('excluirDados');
  });

  describe('Jornada Completa - Novo Usuário', () => {
    it('deve completar todo o fluxo de um novo usuário', () => {
      // 1. Registro de novo usuário
      cy.visit('/register');

      cy.get('[data-cy="nome-input"]').type('João Motociclista');
      cy.get('[data-cy="email-input"]').type('joao@andestripmanager.com');
      cy.get('[data-cy="password-input"]').type('minhasenha123');
      cy.get('[data-cy="confirm-password-input"]').type('minhasenha123');
      cy.get('[data-cy="register-button"]').click();

      cy.wait('@auth');
      cy.url().should('include', '/dashboard');

      // 2. Configurar perfil
      cy.get('[data-cy="user-menu"]').click();
      cy.get('[data-cy="perfil-link"]').click();

      cy.get('[data-cy="telefone-input"]').type('(11) 99999-9999');
      cy.get('[data-cy="moto-marca-input"]').type('Honda');
      cy.get('[data-cy="moto-modelo-input"]').type('CB 600F Hornet');
      cy.get('[data-cy="moto-ano-input"]').type('2020');
      cy.get('[data-cy="moto-placa-input"]').type('ABC-1234');
      cy.get('[data-cy="salvar-perfil-button"]').click();

      cy.wait('@salvarDados');
      cy.verificarMensagemSucesso('Perfil atualizado com sucesso!');

      // 3. Criar primeira viagem
      cy.visit('/dashboard');
      cy.get('[data-cy="nova-viagem-button"]').click();

      const viagemCompleta = {
        nome: 'Minha Primeira Aventura',
        descricao: 'Viagem inaugural pelo interior de São Paulo',
        dataInicio: '15/09/2024',
        dataFim: '18/09/2024',
        orcamento: 2500
      };

      cy.preencherFormularioViagem(viagemCompleta);
      cy.get('[data-cy="salvar-viagem-button"]').click();

      cy.wait('@salvarDados');
      cy.url().should('match', /\/viagens\/[a-zA-Z0-9-]+$/);

      // 4. Planejar dias da viagem
      cy.get('[data-cy="tab-dias"]').click();
      cy.get('[data-cy="adicionar-dia"]').click();

      // Dia 1
      cy.get('[data-cy="cidade-origem-input"]').type('São Paulo, SP');
      cy.get('[data-cy="cidade-destino-input"]').type('Campos do Jordão, SP');
      cy.get('[data-cy="distancia-input"]').type('180');
      cy.get('[data-cy="tempo-estimado-input"]').type('3');
      cy.get('[data-cy="salvar-dia-button"]').click();

      cy.wait('@salvarDados');

      // Dia 2
      cy.get('[data-cy="adicionar-dia"]').click();
      cy.get('[data-cy="cidade-origem-input"]').type('Campos do Jordão, SP');
      cy.get('[data-cy="cidade-destino-input"]').type('Ubatuba, SP');
      cy.get('[data-cy="distancia-input"]').type('220');
      cy.get('[data-cy="tempo-estimado-input"]').type('4');
      cy.get('[data-cy="salvar-dia-button"]').click();

      cy.wait('@salvarDados');

      // 5. Adicionar paradas
      cy.get('[data-cy="dia-card"]').first().click();
      cy.get('[data-cy="adicionar-parada"]').click();

      // Parada de abastecimento
      cy.get('[data-cy="tipo-parada-select"]').click();
      cy.get('[data-cy="tipo-abastecimento"]').click();
      cy.get('[data-cy="nome-parada-input"]').type('Posto Shell - Rodovia Fernão Dias');
      cy.get('[data-cy="endereco-input"]').type('Rod. Fernão Dias, Km 45');
      cy.get('[data-cy="combustivel-select"]').click();
      cy.get('[data-cy="gasolina-comum"]').click();
      cy.get('[data-cy="litros-input"]').type('15');
      cy.get('[data-cy="preco-litro-input"]').type('5.89');
      cy.get('[data-cy="salvar-parada-button"]').click();

      cy.wait('@salvarDados');

      // 6. Reservar hospedagem
      cy.get('[data-cy="tab-hospedagens"]').click();
      cy.get('[data-cy="adicionar-hospedagem"]').click();

      cy.get('[data-cy="nome-hospedagem-input"]').type('Pousada Serra Verde');
      cy.get('[data-cy="endereco-hospedagem-input"]').type('Rua das Flores, 123 - Campos do Jordão');
      cy.get('[data-cy="data-checkin-input"]').type('15/09/2024');
      cy.get('[data-cy="data-checkout-input"]').type('16/09/2024');
      cy.get('[data-cy="preco-hospedagem-input"]').type('280');
      cy.get('[data-cy="estacionamento-coberto"]').check();
      cy.get('[data-cy="salvar-hospedagem-button"]').click();

      cy.wait('@salvarDados');

      // 7. Registrar custos
      cy.get('[data-cy="tab-custos"]').click();
      cy.get('[data-cy="adicionar-custo"]').click();

      cy.get('[data-cy="tipo-custo-select"]').click();
      cy.get('[data-cy="tipo-combustivel"]').click();
      cy.get('[data-cy="descricao-custo-input"]').type('Abastecimento inicial');
      cy.get('[data-cy="valor-custo-input"]').type('88.35');
      cy.get('[data-cy="data-custo-input"]').type('15/09/2024');
      cy.get('[data-cy="salvar-custo-button"]').click();

      cy.wait('@salvarDados');

      // 8. Verificar clima
      cy.get('[data-cy="tab-clima"]').click();
      cy.get('[data-cy="clima-dia"]').should('be.visible');
      cy.get('[data-cy="previsao-tempo"]').should('contain.text', 'Previsão');

      // 9. Planejar manutenção
      cy.get('[data-cy="tab-manutencoes"]').click();
      cy.get('[data-cy="adicionar-manutencao"]').click();

      cy.get('[data-cy="tipo-manutencao-select"]').click();
      cy.get('[data-cy="pre-viagem"]').click();
      cy.get('[data-cy="descricao-manutencao-input"]').type('Revisão pré-viagem completa');
      cy.get('[data-cy="item-pneus"]').check();
      cy.get('[data-cy="item-freios"]').check();
      cy.get('[data-cy="item-oleo"]').check();
      cy.get('[data-cy="custo-manutencao-input"]').type('350');
      cy.get('[data-cy="salvar-manutencao-button"]').click();

      cy.wait('@salvarDados');

      // 10. Iniciar diário de bordo
      cy.get('[data-cy="tab-diario"]').click();
      cy.get('[data-cy="nova-entrada-diario"]').click();

      cy.get('[data-cy="titulo-entrada-input"]').type('Preparativos para a aventura');
      cy.get('[data-cy="conteudo-entrada"]').type('Hoje finalizei todos os preparativos para minha primeira viagem de moto. A ansiedade está grande!');
      cy.get('[data-cy="salvar-entrada-button"]').click();

      cy.wait('@salvarDados');

      // 11. Verificar resumo da viagem
      cy.get('[data-cy="tab-resumo"]').click();
      cy.get('[data-cy="resumo-dias"]').should('contain.text', '2 dias');
      cy.get('[data-cy="resumo-distancia"]').should('contain.text', '400 km');
      cy.get('[data-cy="resumo-custos"]').should('contain.text', 'R$ 718,35');

      // 12. Exportar dados da viagem
      cy.get('[data-cy="exportar-viagem"]').click();
      cy.get('[data-cy="formato-json"]').click();
      cy.get('[data-cy="confirmar-exportacao"]').click();

      cy.wait('@salvarDados');
      cy.verificarMensagemSucesso('Viagem exportada com sucesso!');
    });
  });

  describe('Jornada Completa - Usuário Experiente', () => {
    beforeEach(() => {
      cy.login('joao@andestripmanager.com', 'minhasenha123');
    });

    it('deve gerenciar múltiplas viagens eficientemente', () => {
      cy.visit('/dashboard');
      cy.wait('@carregarDados');

      // 1. Visualizar viagens existentes
      cy.get('[data-cy="viagem-card"]').should('have.length.at.least', 2);

      // 2. Filtrar viagens por status
      cy.get('[data-cy="filtro-status"]').click();
      cy.get('[data-cy="status-em-andamento"]').click();
      cy.get('[data-cy="viagem-card"]').should('have.length', 1);

      // 3. Editar viagem existente
      cy.get('[data-cy="filtro-status"]').click();
      cy.get('[data-cy="todos-status"]').click();

      cy.get('[data-cy="viagem-card"]').first()
        .find('[data-cy="editar-viagem"]').click();

      cy.get('[data-cy="orcamento-input"]').clear().type('3500');
      cy.get('[data-cy="salvar-viagem-button"]').click();

      cy.wait('@atualizarDados');
      cy.verificarMensagemSucesso('Viagem atualizada com sucesso!');

      // 4. Duplicar viagem para reutilizar planejamento
      cy.visit('/dashboard');
      cy.get('[data-cy="viagem-card"]').first()
        .find('[data-cy="menu-viagem"]').click();
      cy.get('[data-cy="duplicar-viagem"]').click();

      cy.get('[data-cy="nome-viagem-input"]').clear().type('Rota dos Cânions - Edição 2024');
      cy.get('[data-cy="data-inicio-input"]').clear().type('01/10/2024');
      cy.get('[data-cy="data-fim-input"]').clear().type('08/10/2024');
      cy.get('[data-cy="confirmar-duplicacao"]').click();

      cy.wait('@salvarDados');
      cy.verificarMensagemSucesso('Viagem duplicada com sucesso!');

      // 5. Comparar custos entre viagens
      cy.visit('/dashboard');
      cy.get('[data-cy="comparar-viagens"]').click();

      cy.get('[data-cy="viagem-1-select"]').click();
      cy.get('[data-cy="viagem-campos-jordao"]').click();

      cy.get('[data-cy="viagem-2-select"]').click();
      cy.get('[data-cy="viagem-canions"]').click();

      cy.get('[data-cy="gerar-comparacao"]').click();

      // Verificar relatório de comparação
      cy.get('[data-cy="comparacao-custos"]').should('be.visible');
      cy.get('[data-cy="comparacao-distancia"]').should('be.visible');
      cy.get('[data-cy="comparacao-tempo"]').should('be.visible');
    });
  });

  describe('Cenários de Uso Offline', () => {
    beforeEach(() => {
      cy.login('joao@andestripmanager.com', 'minhasenha123');
    });

    it('deve funcionar completamente offline durante uma viagem', () => {
      cy.visit('/dashboard');
      cy.wait('@carregarDados');

      // 1. Preparar para modo offline
      cy.get('[data-cy="viagem-card"]').first().click();
      cy.get('[data-cy="preparar-offline"]').click();
      cy.get('[data-cy="download-mapas"]').click();
      cy.get('[data-cy="confirmar-download"]').click();

      // Aguardar download dos mapas
      cy.get('[data-cy="download-complete"]').should('be.visible');

      // 2. Simular início da viagem (offline)
      cy.goOffline();

      // 3. Registrar parada durante a viagem
      cy.get('[data-cy="tab-dias"]').click();
      cy.get('[data-cy="dia-atual"]').click();
      cy.get('[data-cy="adicionar-parada"]').click();

      cy.get('[data-cy="tipo-parada-select"]').click();
      cy.get('[data-cy="tipo-refeicao"]').click();
      cy.get('[data-cy="nome-parada-input"]').type('Restaurante da Estrada');
      cy.get('[data-cy="endereco-input"]').type('Rodovia dos Bandeirantes, Km 120');
      cy.get('[data-cy="tipo-refeicao-select"]').click();
      cy.get('[data-cy="almoco"]').click();
      cy.get('[data-cy="preco-refeicao-input"]').type('45');
      cy.get('[data-cy="salvar-parada-button"]').click();

      // Verificar salvamento offline
      cy.get('[data-cy="offline-indicator"]').should('contain.text', 'Salvo offline');

      // 4. Adicionar entrada no diário
      cy.get('[data-cy="tab-diario"]').click();
      cy.get('[data-cy="nova-entrada-diario"]').click();

      cy.get('[data-cy="titulo-entrada-input"]').type('Primeira parada da viagem');
      cy.get('[data-cy="conteudo-entrada"]').type('Parei para almoçar em um restaurante muito acolhedor na estrada. A comida estava deliciosa!');
      cy.get('[data-cy="salvar-entrada-button"]').click();

      cy.get('[data-cy="offline-indicator"]').should('be.visible');

      // 5. Registrar custo offline
      cy.get('[data-cy="tab-custos"]').click();
      cy.get('[data-cy="adicionar-custo"]').click();

      cy.get('[data-cy="tipo-custo-select"]').click();
      cy.get('[data-cy="tipo-alimentacao"]').click();
      cy.get('[data-cy="descricao-custo-input"]').type('Almoço no restaurante da estrada');
      cy.get('[data-cy="valor-custo-input"]').type('45');
      cy.get('[data-cy="salvar-custo-button"]').click();

      // 6. Verificar lista de operações pendentes
      cy.get('[data-cy="sync-menu"]').click();
      cy.get('[data-cy="pending-operations"]').should('be.visible');
      cy.get('[data-cy="pending-operation"]').should('have.length', 3);

      // 7. Voltar online e sincronizar
      cy.goOnline();

      // Aguardar sincronização automática
      cy.wait('@salvarDados');
      cy.wait('@salvarDados');
      cy.wait('@salvarDados');

      cy.get('[data-cy="sync-success"]').should('be.visible');
      cy.get('[data-cy="pending-operations"]').should('not.exist');
    });
  });

  describe('Fluxo de Responsividade Completo', () => {
    beforeEach(() => {
      cy.login('joao@andestripmanager.com', 'minhasenha123');
    });

    it('deve funcionar perfeitamente em dispositivos móveis', () => {
      cy.setMobileViewport();

      // 1. Navegação mobile
      cy.visit('/dashboard');
      cy.wait('@carregarDados');

      cy.get('[data-cy="mobile-menu-button"]').click();
      cy.get('[data-cy="menu-nova-viagem"]').click();

      // 2. Criar viagem em mobile
      const viagemMobile = {
        nome: 'Viagem Mobile',
        descricao: 'Criada no celular',
        dataInicio: '20/10/2024',
        dataFim: '22/10/2024'
      };

      cy.preencherFormularioViagem(viagemMobile);
      cy.get('[data-cy="salvar-viagem-button"]').click();

      cy.wait('@salvarDados');

      // 3. Usar gestos touch
      cy.get('[data-cy="tab-content"]')
        .trigger('touchstart', { touches: [{ clientX: 300, clientY: 300 }] })
        .trigger('touchmove', { touches: [{ clientX: 100, clientY: 300 }] })
        .trigger('touchend');

      // 4. Verificar adaptação do mapa
      cy.get('[data-cy="tab-dias"]').click();
      cy.get('[data-cy="map-container"]').should('be.visible');
      cy.get('[data-cy="map-container"]').should('have.css', 'width').and('match', /375px/);

      // 5. Testar upload de foto mobile
      cy.get('[data-cy="tab-diario"]').click();
      cy.get('[data-cy="nova-entrada-diario"]').click();

      // Simular seleção de foto da galeria
      cy.get('[data-cy="adicionar-foto"]').click();
      cy.get('[data-cy="galeria-fotos"]').should('be.visible');

      // 6. Verificar orientação landscape
      cy.viewport(667, 375); // Landscape
      cy.get('[data-cy="viagem-form"]').should('be.visible');
      cy.get('[data-cy="form-row"]').should('have.css', 'display', 'flex');
    });
  });

  describe('Cenários de Erro e Recuperação', () => {
    beforeEach(() => {
      cy.login('joao@andestripmanager.com', 'minhasenha123');
    });

    it('deve lidar graciosamente com erros de rede', () => {
      cy.visit('/dashboard');

      // 1. Simular erro de rede durante salvamento
      cy.intercept('POST', '**/firestore.googleapis.com/**',
        { statusCode: 500, body: { error: 'Network error' } }).as('erroRede');

      cy.get('[data-cy="nova-viagem-button"]').click();

      const viagemErro = {
        nome: 'Viagem com Erro',
        descricao: 'Teste de erro de rede',
        dataInicio: '25/10/2024',
        dataFim: '27/10/2024'
      };

      cy.preencherFormularioViagem(viagemErro);
      cy.get('[data-cy="salvar-viagem-button"]').click();

      cy.wait('@erroRede');

      // 2. Verificar tratamento do erro
      cy.verificarMensagemErro('Erro de conexão. Dados salvos localmente.');
      cy.get('[data-cy="retry-button"]').should('be.visible');

      // 3. Tentar novamente com sucesso
      cy.intercept('POST', '**/firestore.googleapis.com/**',
        { fixture: 'firestore-success.json' }).as('sucessoRetry');

      cy.get('[data-cy="retry-button"]').click();
      cy.wait('@sucessoRetry');

      cy.verificarMensagemSucesso('Viagem salva com sucesso!');
    });

    it('deve recuperar de conflitos de dados', () => {
      cy.visit('/dashboard');
      cy.wait('@carregarDados');

      // 1. Simular conflito de dados
      cy.intercept('PATCH', '**/firestore.googleapis.com/**', {
        statusCode: 409,
        body: {
          error: 'Conflict detected',
          conflictData: {
            local: { nome: 'Versão Local', atualizadoEm: '2024-01-01T10:00:00Z' },
            remote: { nome: 'Versão Remota', atualizadoEm: '2024-01-01T11:00:00Z' }
          }
        }
      }).as('conflito');

      cy.get('[data-cy="viagem-card"]').first()
        .find('[data-cy="editar-viagem"]').click();

      cy.get('[data-cy="nome-viagem-input"]').clear().type('Viagem Editada');
      cy.get('[data-cy="salvar-viagem-button"]').click();

      cy.wait('@conflito');

      // 2. Resolver conflito
      cy.get('[data-cy="conflict-resolver"]').should('be.visible');
      cy.get('[data-cy="choose-local"]').click();

      // 3. Verificar resolução
      cy.intercept('PATCH', '**/firestore.googleapis.com/**',
        { fixture: 'firestore-success.json' }).as('resolucao');

      cy.wait('@resolucao');
      cy.verificarMensagemSucesso('Conflito resolvido com sucesso!');
    });
  });
});