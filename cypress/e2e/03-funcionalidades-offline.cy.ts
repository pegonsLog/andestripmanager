describe('Funcionalidades Offline', () => {
  beforeEach(() => {
    // Interceptar chamadas para Firebase
    cy.intercept('GET', '**/firestore.googleapis.com/**', { fixture: 'viagens-mock.json' }).as('carregarViagens');
    cy.intercept('POST', '**/firestore.googleapis.com/**', { fixture: 'firestore-success.json' }).as('salvarDados');
    
    // Fazer login antes de cada teste
    cy.login('teste@andestripmanager.com', 'senha123');
  });

  describe('Indicador de Conectividade', () => {
    it('deve exibir indicador online por padrão', () => {
      cy.visit('/dashboard');
      
      // Verificar indicador de conectividade
      cy.get('[data-cy="connectivity-indicator"]').should('be.visible');
      cy.get('[data-cy="status-online"]').should('be.visible');
      cy.get('[data-cy="status-online"]').should('contain.text', 'Online');
    });

    it('deve exibir indicador offline quando desconectado', () => {
      cy.visit('/dashboard');
      
      // Simular modo offline
      cy.goOffline();
      
      // Verificar mudança no indicador
      cy.get('[data-cy="status-offline"]').should('be.visible');
      cy.get('[data-cy="status-offline"]').should('contain.text', 'Offline');
    });

    it('deve voltar ao status online', () => {
      cy.visit('/dashboard');
      
      // Simular offline e depois online
      cy.goOffline();
      cy.get('[data-cy="status-offline"]').should('be.visible');
      
      cy.goOnline();
      cy.get('[data-cy="status-online"]').should('be.visible');
    });
  });

  describe('Cache de Dados', () => {
    it('deve carregar dados do cache quando offline', () => {
      cy.visit('/dashboard');
      cy.wait('@carregarViagens');
      
      // Verificar que os dados foram carregados
      cy.get('[data-cy="viagem-card"]').should('have.length.at.least', 1);
      
      // Simular modo offline
      cy.goOffline();
      
      // Recarregar página
      cy.reload();
      
      // Verificar que os dados ainda estão disponíveis via cache
      cy.get('[data-cy="viagem-card"]').should('have.length.at.least', 1);
      cy.get('[data-cy="cache-indicator"]').should('contain.text', 'Dados em cache');
    });

    it('deve exibir aviso sobre dados em cache', () => {
      cy.visit('/dashboard');
      cy.wait('@carregarViagens');
      
      // Simular offline
      cy.goOffline();
      cy.reload();
      
      // Verificar aviso sobre cache
      cy.get('[data-cy="cache-warning"]').should('be.visible');
      cy.get('[data-cy="cache-warning"]')
        .should('contain.text', 'Exibindo dados salvos localmente');
    });
  });

  describe('Operações Offline', () => {
    it('deve permitir criar viagem offline', () => {
      cy.visit('/dashboard');
      
      // Simular modo offline
      cy.goOffline();
      
      // Criar nova viagem
      cy.get('[data-cy="nova-viagem-button"]').click();
      
      const dadosViagem = {
        nome: 'Viagem Offline',
        descricao: 'Viagem criada em modo offline',
        dataInicio: '15/08/2024',
        dataFim: '20/08/2024'
      };
      
      cy.preencherFormularioViagem(dadosViagem);
      cy.get('[data-cy="salvar-viagem-button"]').click();
      
      // Verificar que foi salva localmente
      cy.verificarMensagemSucesso('Viagem salva localmente. Será sincronizada quando voltar online.');
      cy.get('[data-cy="pending-sync-indicator"]').should('be.visible');
    });

    it('deve permitir editar viagem offline', () => {
      cy.visit('/dashboard');
      cy.wait('@carregarViagens');
      
      // Simular offline
      cy.goOffline();
      
      // Editar viagem existente
      cy.get('[data-cy="viagem-card"]').first()
        .find('[data-cy="editar-viagem"]').click();
      
      cy.get('[data-cy="nome-viagem-input"]').clear().type('Viagem Editada Offline');
      cy.get('[data-cy="salvar-viagem-button"]').click();
      
      // Verificar salvamento local
      cy.verificarMensagemSucesso('Alterações salvas localmente');
      cy.get('[data-cy="pending-sync-indicator"]').should('be.visible');
    });

    it('deve armazenar operações pendentes', () => {
      cy.visit('/dashboard');
      
      // Simular offline e fazer várias operações
      cy.goOffline();
      
      // Criar viagem
      cy.criarViagemTeste('Viagem Pendente 1');
      
      // Verificar lista de operações pendentes
      cy.get('[data-cy="sync-menu"]').click();
      cy.get('[data-cy="pending-operations"]').should('be.visible');
      cy.get('[data-cy="pending-operation"]').should('have.length.at.least', 1);
    });
  });

  describe('Sincronização', () => {
    it('deve sincronizar automaticamente ao voltar online', () => {
      cy.visit('/dashboard');
      
      // Criar operação offline
      cy.goOffline();
      cy.criarViagemTeste('Viagem para Sincronizar');
      
      // Voltar online
      cy.goOnline();
      
      // Aguardar sincronização automática
      cy.wait('@salvarDados');
      
      // Verificar que a sincronização foi concluída
      cy.get('[data-cy="sync-success"]').should('be.visible');
      cy.get('[data-cy="pending-sync-indicator"]').should('not.exist');
    });

    it('deve permitir sincronização manual', () => {
      cy.visit('/dashboard');
      
      // Criar operação offline
      cy.goOffline();
      cy.criarViagemTeste('Viagem Sync Manual');
      
      // Voltar online
      cy.goOnline();
      
      // Fazer sincronização manual
      cy.get('[data-cy="sync-menu"]').click();
      cy.get('[data-cy="sync-now-button"]').click();
      
      cy.wait('@salvarDados');
      
      // Verificar sucesso
      cy.verificarMensagemSucesso('Sincronização concluída com sucesso');
    });

    it('deve tratar erros de sincronização', () => {
      // Interceptar erro de sincronização
      cy.intercept('POST', '**/firestore.googleapis.com/**', 
        { statusCode: 500, body: { error: 'Erro interno do servidor' } }).as('erroSync');
      
      cy.visit('/dashboard');
      
      // Criar operação offline
      cy.goOffline();
      cy.criarViagemTeste('Viagem Erro Sync');
      
      // Voltar online
      cy.goOnline();
      
      cy.wait('@erroSync');
      
      // Verificar tratamento do erro
      cy.get('[data-cy="sync-error"]').should('be.visible');
      cy.get('[data-cy="retry-sync-button"]').should('be.visible');
    });

    it('deve permitir retry de sincronização', () => {
      // Primeiro interceptar erro, depois sucesso
      cy.intercept('POST', '**/firestore.googleapis.com/**', 
        { statusCode: 500, body: { error: 'Erro temporário' } }).as('erroSync');
      
      cy.visit('/dashboard');
      cy.goOffline();
      cy.criarViagemTeste('Viagem Retry');
      cy.goOnline();
      
      cy.wait('@erroSync');
      
      // Configurar sucesso para retry
      cy.intercept('POST', '**/firestore.googleapis.com/**', 
        { fixture: 'firestore-success.json' }).as('sucessoSync');
      
      // Tentar novamente
      cy.get('[data-cy="retry-sync-button"]').click();
      
      cy.wait('@sucessoSync');
      cy.verificarMensagemSucesso('Sincronização concluída com sucesso');
    });
  });

  describe('Resolução de Conflitos', () => {
    it('deve detectar conflitos de dados', () => {
      // Simular conflito de dados
      cy.intercept('POST', '**/firestore.googleapis.com/**', {
        statusCode: 409,
        body: { 
          error: 'Conflict detected',
          conflictData: {
            local: { nome: 'Viagem Local', atualizadoEm: '2024-01-01T10:00:00Z' },
            remote: { nome: 'Viagem Remota', atualizadoEm: '2024-01-01T11:00:00Z' }
          }
        }
      }).as('conflito');
      
      cy.visit('/dashboard');
      cy.goOffline();
      cy.criarViagemTeste('Viagem Conflito');
      cy.goOnline();
      
      cy.wait('@conflito');
      
      // Verificar interface de resolução de conflito
      cy.get('[data-cy="conflict-resolver"]').should('be.visible');
      cy.get('[data-cy="local-version"]').should('contain.text', 'Viagem Local');
      cy.get('[data-cy="remote-version"]').should('contain.text', 'Viagem Remota');
    });

    it('deve permitir escolher versão local', () => {
      cy.visit('/dashboard');
      
      // Simular conflito
      cy.intercept('POST', '**/firestore.googleapis.com/**', {
        statusCode: 409,
        body: { 
          error: 'Conflict detected',
          conflictData: {
            local: { nome: 'Versão Local' },
            remote: { nome: 'Versão Remota' }
          }
        }
      }).as('conflito');
      
      cy.goOffline();
      cy.criarViagemTeste('Teste Conflito');
      cy.goOnline();
      
      cy.wait('@conflito');
      
      // Escolher versão local
      cy.get('[data-cy="choose-local"]').click();
      
      // Configurar sucesso após resolução
      cy.intercept('POST', '**/firestore.googleapis.com/**', 
        { fixture: 'firestore-success.json' }).as('resolucao');
      
      cy.wait('@resolucao');
      cy.verificarMensagemSucesso('Conflito resolvido. Versão local mantida.');
    });

    it('deve permitir escolher versão remota', () => {
      cy.visit('/dashboard');
      
      // Simular e resolver conflito com versão remota
      cy.intercept('POST', '**/firestore.googleapis.com/**', {
        statusCode: 409,
        body: { 
          error: 'Conflict detected',
          conflictData: {
            local: { nome: 'Versão Local' },
            remote: { nome: 'Versão Remota' }
          }
        }
      }).as('conflito');
      
      cy.goOffline();
      cy.criarViagemTeste('Teste Conflito Remoto');
      cy.goOnline();
      
      cy.wait('@conflito');
      
      // Escolher versão remota
      cy.get('[data-cy="choose-remote"]').click();
      
      cy.intercept('POST', '**/firestore.googleapis.com/**', 
        { fixture: 'firestore-success.json' }).as('resolucao');
      
      cy.wait('@resolucao');
      cy.verificarMensagemSucesso('Conflito resolvido. Versão remota aplicada.');
    });
  });

  describe('Mapas Offline', () => {
    it('deve permitir download de mapas', () => {
      cy.visit('/viagens/viagem-1');
      cy.get('[data-cy="tab-dias"]').click();
      
      // Clicar em download de mapas
      cy.get('[data-cy="download-maps"]').click();
      
      // Verificar progresso do download
      cy.get('[data-cy="download-progress"]').should('be.visible');
      cy.get('[data-cy="download-status"]').should('contain.text', 'Baixando mapas...');
      
      // Simular conclusão do download
      cy.get('[data-cy="download-complete"]').should('be.visible');
      cy.verificarMensagemSucesso('Mapas baixados com sucesso');
    });

    it('deve usar mapas offline quando desconectado', () => {
      cy.visit('/viagens/viagem-1');
      cy.get('[data-cy="tab-dias"]').click();
      
      // Simular mapas já baixados
      cy.window().then((win) => {
        win.localStorage.setItem('offline-maps-viagem-1', 'true');
      });
      
      // Simular offline
      cy.goOffline();
      
      // Verificar que o mapa ainda funciona
      cy.get('[data-cy="offline-map"]').should('be.visible');
      cy.get('[data-cy="offline-map-indicator"]')
        .should('contain.text', 'Usando mapas offline');
    });
  });

  describe('Responsividade - Offline', () => {
    it('deve exibir indicadores offline em mobile', () => {
      cy.setMobileViewport();
      cy.visit('/dashboard');
      
      cy.goOffline();
      
      // Verificar indicadores em mobile
      cy.get('[data-cy="connectivity-indicator"]').checkResponsiveness();
      cy.get('[data-cy="status-offline"]').should('be.visible');
    });

    it('deve adaptar interface de sincronização para mobile', () => {
      cy.setMobileViewport();
      cy.visit('/dashboard');
      
      cy.goOffline();
      cy.criarViagemTeste('Viagem Mobile Offline');
      cy.goOnline();
      
      // Verificar interface de sync em mobile
      cy.get('[data-cy="sync-menu"]').click();
      cy.get('[data-cy="pending-operations"]').checkResponsiveness();
    });
  });
});