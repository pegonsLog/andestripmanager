describe('Responsividade', () => {
  beforeEach(() => {
    // Interceptar chamadas para Firebase
    cy.intercept('GET', '**/firestore.googleapis.com/**', { fixture: 'viagens-mock.json' }).as('carregarViagens');
    cy.intercept('POST', '**/firestore.googleapis.com/**', { fixture: 'firestore-success.json' }).as('salvarDados');
    
    // Fazer login antes de cada teste
    cy.login('teste@andestripmanager.com', 'senha123');
  });

  describe('Breakpoints de Responsividade', () => {
    const viewports = [
      { name: 'Mobile Portrait', width: 375, height: 667 },
      { name: 'Mobile Landscape', width: 667, height: 375 },
      { name: 'Tablet Portrait', width: 768, height: 1024 },
      { name: 'Tablet Landscape', width: 1024, height: 768 },
      { name: 'Desktop Small', width: 1280, height: 720 },
      { name: 'Desktop Large', width: 1920, height: 1080 }
    ];

    viewports.forEach((viewport) => {
      it(`deve ser responsivo em ${viewport.name} (${viewport.width}x${viewport.height})`, () => {
        cy.viewport(viewport.width, viewport.height);
        cy.visit('/dashboard');
        cy.wait('@carregarViagens');

        // Verificar elementos principais
        cy.get('[data-cy="main-header"]').should('be.visible');
        cy.get('[data-cy="dashboard-content"]').should('be.visible');
        cy.get('[data-cy="nova-viagem-button"]').should('be.visible');

        // Verificar que não há overflow horizontal
        cy.get('body').then(($body) => {
          expect($body[0].scrollWidth).to.be.at.most(viewport.width);
        });
      });
    });
  });

  describe('Navegação Mobile', () => {
    beforeEach(() => {
      cy.setMobileViewport();
    });

    it('deve exibir menu hambúrguer em mobile', () => {
      cy.visit('/dashboard');
      
      // Verificar que o menu hambúrguer está visível
      cy.get('[data-cy="mobile-menu-button"]').should('be.visible');
      
      // Verificar que o menu desktop está oculto
      cy.get('[data-cy="desktop-menu"]').should('not.be.visible');
    });

    it('deve abrir e fechar menu lateral', () => {
      cy.visit('/dashboard');
      
      // Abrir menu lateral
      cy.get('[data-cy="mobile-menu-button"]').click();
      cy.get('[data-cy="side-menu"]').should('be.visible');
      
      // Verificar itens do menu
      cy.get('[data-cy="menu-dashboard"]').should('be.visible');
      cy.get('[data-cy="menu-viagens"]').should('be.visible');
      cy.get('[data-cy="menu-perfil"]').should('be.visible');
      
      // Fechar menu
      cy.get('[data-cy="close-menu"]').click();
      cy.get('[data-cy="side-menu"]').should('not.be.visible');
    });

    it('deve navegar através do menu mobile', () => {
      cy.visit('/dashboard');
      
      // Abrir menu e navegar para perfil
      cy.get('[data-cy="mobile-menu-button"]').click();
      cy.get('[data-cy="menu-perfil"]').click();
      
      // Verificar navegação
      cy.url().should('include', '/perfil');
      cy.get('[data-cy="side-menu"]').should('not.be.visible');
    });

    it('deve adaptar cards de viagem para mobile', () => {
      cy.visit('/dashboard');
      cy.wait('@carregarViagens');
      
      // Verificar layout dos cards em mobile
      cy.get('[data-cy="viagem-card"]').each(($card) => {
        cy.wrap($card).should('have.css', 'width').and('match', /100%|375px/);
        
        // Verificar que elementos estão empilhados verticalmente
        cy.wrap($card).find('[data-cy="viagem-info"]').should('be.visible');
        cy.wrap($card).find('[data-cy="viagem-actions"]').should('be.visible');
      });
    });
  });

  describe('Formulários Responsivos', () => {
    it('deve adaptar formulário de viagem para mobile', () => {
      cy.setMobileViewport();
      cy.visit('/viagens/nova');
      
      // Verificar layout do formulário
      cy.get('[data-cy="viagem-form"]').should('be.visible');
      
      // Verificar que campos ocupam largura total
      cy.get('[data-cy="nome-viagem-input"]').should('have.css', 'width').and('match', /100%|343px/);
      cy.get('[data-cy="descricao-viagem-input"]').should('have.css', 'width').and('match', /100%|343px/);
      
      // Verificar que botões estão empilhados
      cy.get('[data-cy="form-actions"]').within(() => {
        cy.get('[data-cy="salvar-viagem-button"]').should('be.visible');
        cy.get('[data-cy="cancelar-button"]').should('be.visible');
      });
    });

    it('deve adaptar seletores de data para mobile', () => {
      cy.setMobileViewport();
      cy.visit('/viagens/nova');
      
      // Clicar no seletor de data
      cy.get('[data-cy="data-inicio-input"]').click();
      
      // Verificar que o datepicker é responsivo
      cy.get('[data-cy="datepicker"]').should('be.visible');
      cy.get('[data-cy="datepicker"]').should('have.css', 'max-width');
    });

    it('deve adaptar campos de upload para mobile', () => {
      cy.setMobileViewport();
      cy.visit('/viagens/viagem-1');
      cy.get('[data-cy="tab-diario"]').click();
      
      // Verificar área de upload de fotos
      cy.get('[data-cy="photo-upload"]').should('be.visible');
      cy.get('[data-cy="upload-button"]').should('be.visible');
      
      // Verificar que a área de upload é touch-friendly
      cy.get('[data-cy="upload-area"]').should('have.css', 'min-height', '120px');
    });
  });

  describe('Tabelas e Listas Responsivas', () => {
    it('deve adaptar lista de custos para mobile', () => {
      cy.setMobileViewport();
      cy.visit('/viagens/viagem-1');
      cy.get('[data-cy="tab-custos"]').click();
      
      // Verificar que a tabela se transforma em cards em mobile
      cy.get('[data-cy="custos-mobile-view"]').should('be.visible');
      cy.get('[data-cy="custos-desktop-table"]').should('not.be.visible');
      
      // Verificar layout dos cards de custo
      cy.get('[data-cy="custo-card"]').each(($card) => {
        cy.wrap($card).find('[data-cy="custo-tipo"]').should('be.visible');
        cy.wrap($card).find('[data-cy="custo-valor"]').should('be.visible');
        cy.wrap($card).find('[data-cy="custo-data"]').should('be.visible');
      });
    });

    it('deve permitir scroll horizontal em tabelas quando necessário', () => {
      cy.setMobileViewport();
      cy.visit('/viagens/viagem-1');
      cy.get('[data-cy="tab-manutencoes"]').click();
      
      // Verificar que tabelas complexas têm scroll horizontal
      cy.get('[data-cy="manutencoes-table-container"]').should('have.css', 'overflow-x', 'auto');
      cy.get('[data-cy="manutencoes-table"]').should('have.css', 'min-width');
    });
  });

  describe('Mapas Responsivos', () => {
    it('deve adaptar mapas para mobile', () => {
      cy.setMobileViewport();
      cy.visit('/viagens/viagem-1');
      cy.get('[data-cy="tab-dias"]').click();
      
      // Verificar que o mapa ocupa a largura total em mobile
      cy.get('[data-cy="map-container"]').should('be.visible');
      cy.get('[data-cy="map-container"]').should('have.css', 'width').and('match', /100%|375px/);
      
      // Verificar controles do mapa
      cy.get('[data-cy="map-controls"]').should('be.visible');
      cy.get('[data-cy="zoom-controls"]').should('be.visible');
    });

    it('deve adaptar lista de paradas junto com mapa', () => {
      cy.setMobileViewport();
      cy.visit('/viagens/viagem-1');
      cy.get('[data-cy="tab-dias"]').click();
      
      // Em mobile, lista e mapa devem estar empilhados
      cy.get('[data-cy="map-section"]').should('be.visible');
      cy.get('[data-cy="paradas-section"]').should('be.visible');
      
      // Verificar que não estão lado a lado
      cy.get('[data-cy="map-paradas-container"]').should('have.css', 'flex-direction', 'column');
    });
  });

  describe('Gestos Touch', () => {
    beforeEach(() => {
      cy.setMobileViewport();
    });

    it('deve suportar swipe para navegar entre abas', () => {
      cy.visit('/viagens/viagem-1');
      
      // Verificar aba atual
      cy.get('[data-cy="tab-dias"]').should('have.class', 'active');
      
      // Simular swipe para a direita (próxima aba)
      cy.get('[data-cy="tab-content"]')
        .trigger('touchstart', { touches: [{ clientX: 300, clientY: 300 }] })
        .trigger('touchmove', { touches: [{ clientX: 100, clientY: 300 }] })
        .trigger('touchend');
      
      // Verificar mudança de aba
      cy.get('[data-cy="tab-paradas"]').should('have.class', 'active');
    });

    it('deve suportar pull-to-refresh', () => {
      cy.visit('/dashboard');
      cy.wait('@carregarViagens');
      
      // Simular pull-to-refresh
      cy.get('[data-cy="dashboard-content"]')
        .trigger('touchstart', { touches: [{ clientX: 200, clientY: 100 }] })
        .trigger('touchmove', { touches: [{ clientX: 200, clientY: 200 }] })
        .trigger('touchend');
      
      // Verificar indicador de refresh
      cy.get('[data-cy="refresh-indicator"]').should('be.visible');
      cy.wait('@carregarViagens');
    });

    it('deve suportar pinch-to-zoom em mapas', () => {
      cy.visit('/viagens/viagem-1');
      cy.get('[data-cy="tab-dias"]').click();
      
      // Simular pinch-to-zoom no mapa
      cy.get('[data-cy="map-container"]')
        .trigger('touchstart', { 
          touches: [
            { clientX: 150, clientY: 150 },
            { clientX: 250, clientY: 250 }
          ] 
        })
        .trigger('touchmove', { 
          touches: [
            { clientX: 100, clientY: 100 },
            { clientX: 300, clientY: 300 }
          ] 
        })
        .trigger('touchend');
      
      // Verificar que o zoom foi aplicado
      cy.get('[data-cy="map-zoom-level"]').should('not.contain', '1');
    });
  });

  describe('Orientação do Dispositivo', () => {
    it('deve adaptar layout para landscape em mobile', () => {
      cy.viewport(667, 375); // Mobile landscape
      cy.visit('/dashboard');
      cy.wait('@carregarViagens');
      
      // Verificar adaptação do layout
      cy.get('[data-cy="dashboard-content"]').should('be.visible');
      cy.get('[data-cy="viagem-card"]').should('be.visible');
      
      // Verificar que o header se adapta
      cy.get('[data-cy="main-header"]').should('have.css', 'height').and('match', /48px|56px/);
    });

    it('deve adaptar formulários para landscape', () => {
      cy.viewport(667, 375); // Mobile landscape
      cy.visit('/viagens/nova');
      
      // Verificar que campos podem ser organizados em duas colunas
      cy.get('[data-cy="form-row"]').should('have.css', 'display', 'flex');
      cy.get('[data-cy="nome-viagem-input"]').should('be.visible');
      cy.get('[data-cy="descricao-viagem-input"]').should('be.visible');
    });
  });

  describe('Acessibilidade Responsiva', () => {
    it('deve manter tamanhos mínimos de toque em mobile', () => {
      cy.setMobileViewport();
      cy.visit('/dashboard');
      
      // Verificar que botões têm tamanho mínimo de 44px
      cy.get('[data-cy="nova-viagem-button"]').should('have.css', 'min-height', '44px');
      cy.get('[data-cy="mobile-menu-button"]').should('have.css', 'min-height', '44px');
    });

    it('deve manter contraste adequado em diferentes tamanhos', () => {
      const viewports = [375, 768, 1280];
      
      viewports.forEach((width) => {
        cy.viewport(width, 667);
        cy.visit('/dashboard');
        
        // Verificar que textos mantêm contraste adequado
        cy.get('[data-cy="viagem-nome"]').should('have.css', 'color');
        cy.get('[data-cy="viagem-descricao"]').should('have.css', 'color');
      });
    });

    it('deve manter navegação por teclado em mobile', () => {
      cy.setMobileViewport();
      cy.visit('/viagens/nova');
      
      // Verificar navegação por tab
      cy.get('[data-cy="nome-viagem-input"]').focus();
      cy.get('[data-cy="nome-viagem-input"]').tab();
      cy.get('[data-cy="descricao-viagem-input"]').should('be.focused');
    });
  });

  describe('Performance Responsiva', () => {
    it('deve carregar imagens otimizadas para mobile', () => {
      cy.setMobileViewport();
      cy.visit('/viagens/viagem-1');
      cy.get('[data-cy="tab-diario"]').click();
      
      // Verificar que imagens têm srcset para diferentes densidades
      cy.get('[data-cy="foto-viagem"]').should('have.attr', 'srcset');
      cy.get('[data-cy="foto-viagem"]').should('have.attr', 'sizes');
    });

    it('deve lazy load conteúdo em mobile', () => {
      cy.setMobileViewport();
      cy.visit('/dashboard');
      
      // Verificar que apenas o conteúdo visível é carregado inicialmente
      cy.get('[data-cy="viagem-card"]:visible').should('have.length.at.most', 10);
      
      // Scroll para carregar mais conteúdo
      cy.scrollTo('bottom');
      cy.get('[data-cy="loading-more"]').should('be.visible');
    });
  });

  describe('Testes Cross-Browser Responsivos', () => {
    it('deve funcionar consistentemente em diferentes navegadores mobile', () => {
      // Este teste seria executado com diferentes user agents
      cy.setMobileViewport();
      
      // Simular diferentes user agents
      const userAgents = [
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15',
        'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36'
      ];
      
      userAgents.forEach((userAgent) => {
        cy.visit('/dashboard', {
          onBeforeLoad: (win) => {
            Object.defineProperty(win.navigator, 'userAgent', {
              value: userAgent
            });
          }
        });
        
        // Verificar que a interface funciona independente do user agent
        cy.get('[data-cy="dashboard-content"]').should('be.visible');
        cy.get('[data-cy="nova-viagem-button"]').should('be.visible');
      });
    });
  });
});