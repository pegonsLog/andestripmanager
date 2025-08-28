describe('Testes de Acessibilidade', () => {
  beforeEach(() => {
    // Interceptar chamadas para Firebase
    cy.intercept('POST', '**/identitytoolkit.googleapis.com/**', { fixture: 'auth-success.json' }).as('auth');
    cy.intercept('GET', '**/firestore.googleapis.com/**', { fixture: 'viagens-mock.json' }).as('carregarDados');
    
    // Fazer login antes de cada teste
    cy.login('teste@andestripmanager.com', 'senha123');
  });

  describe('Navegação por Teclado', () => {
    it('deve permitir navegação completa por teclado no dashboard', () => {
      cy.visit('/dashboard');
      cy.wait('@carregarDados');
      
      // Verificar que elementos focáveis estão acessíveis
      cy.get('body').tab();
      cy.focused().should('have.attr', 'data-cy', 'skip-to-content');
      
      // Navegar pelos elementos principais
      cy.focused().tab();
      cy.focused().should('have.attr', 'data-cy', 'main-navigation');
      
      cy.focused().tab();
      cy.focused().should('have.attr', 'data-cy', 'nova-viagem-button');
      
      // Verificar navegação nos cards de viagem
      cy.focused().tab();
      cy.focused().should('have.attr', 'data-cy').and('match', /viagem-card|editar-viagem/);
    });

    it('deve permitir navegação por teclado em formulários', () => {
      cy.visit('/viagens/nova');
      
      // Navegar pelos campos do formulário
      cy.get('[data-cy="nome-viagem-input"]').focus();
      cy.focused().type('Viagem Teste Acessibilidade');
      
      cy.focused().tab();
      cy.focused().should('have.attr', 'data-cy', 'descricao-viagem-input');
      cy.focused().type('Descrição da viagem para teste de acessibilidade');
      
      cy.focused().tab();
      cy.focused().should('have.attr', 'data-cy', 'data-inicio-input');
      
      cy.focused().tab();
      cy.focused().should('have.attr', 'data-cy', 'data-fim-input');
      
      // Verificar que é possível salvar usando Enter
      cy.focused().tab();
      cy.focused().should('have.attr', 'data-cy', 'salvar-viagem-button');
      cy.focused().type('{enter}');
    });

    it('deve permitir navegação por teclado em modais', () => {
      cy.visit('/dashboard');
      cy.wait('@carregarDados');
      
      // Abrir modal de exclusão
      cy.get('[data-cy="viagem-card"]').first()
        .find('[data-cy="excluir-viagem"]').click();
      
      // Verificar foco no modal
      cy.get('[data-cy="confirmation-dialog"]').should('be.visible');
      cy.focused().should('have.attr', 'data-cy', 'cancelar-exclusao');
      
      // Navegar entre botões do modal
      cy.focused().tab();
      cy.focused().should('have.attr', 'data-cy', 'confirmar-exclusao');
      
      // Fechar modal com Escape
      cy.get('body').type('{esc}');
      cy.get('[data-cy="confirmation-dialog"]').should('not.exist');
    });
  });

  describe('Leitores de Tela', () => {
    it('deve ter estrutura semântica adequada', () => {
      cy.visit('/dashboard');
      cy.wait('@carregarDados');
      
      // Verificar landmarks ARIA
      cy.get('main').should('have.attr', 'role', 'main');
      cy.get('nav').should('have.attr', 'role', 'navigation');
      cy.get('[role="banner"]').should('exist'); // Header
      cy.get('[role="contentinfo"]').should('exist'); // Footer
      
      // Verificar hierarquia de headings
      cy.get('h1').should('exist').and('be.visible');
      cy.get('h1').should('contain.text', 'Minhas Viagens');
      
      // Verificar que não há saltos na hierarquia
      cy.get('h1, h2, h3, h4, h5, h6').then(($headings) => {
        const levels = Array.from($headings).map(h => parseInt(h.tagName.charAt(1)));
        for (let i = 1; i < levels.length; i++) {
          expect(levels[i] - levels[i-1]).to.be.at.most(1);
        }
      });
    });

    it('deve ter labels adequados para elementos interativos', () => {
      cy.visit('/viagens/nova');
      
      // Verificar labels de inputs
      cy.get('[data-cy="nome-viagem-input"]')
        .should('have.attr', 'aria-label')
        .or('have.attr', 'aria-labelledby');
      
      cy.get('[data-cy="descricao-viagem-input"]')
        .should('have.attr', 'aria-label')
        .or('have.attr', 'aria-labelledby');
      
      // Verificar botões com texto ou aria-label
      cy.get('[data-cy="salvar-viagem-button"]')
        .should('satisfy', ($btn) => {
          return $btn.text().trim() !== '' || $btn.attr('aria-label');
        });
    });

    it('deve anunciar mudanças de estado', () => {
      cy.visit('/dashboard');
      
      // Verificar aria-live regions
      cy.get('[aria-live="polite"]').should('exist');
      cy.get('[aria-live="assertive"]').should('exist');
      
      // Simular ação que gera feedback
      cy.get('[data-cy="nova-viagem-button"]').click();
      
      // Verificar que mudanças são anunciadas
      cy.get('[aria-live="polite"]').should('not.be.empty');
    });

    it('deve ter descrições adequadas para elementos complexos', () => {
      cy.visit('/viagens/viagem-1');
      cy.get('[data-cy="tab-dias"]').click();
      
      // Verificar descrições de mapas
      cy.get('[data-cy="map-container"]')
        .should('have.attr', 'aria-label')
        .and('contain', 'Mapa');
      
      // Verificar descrições de gráficos
      cy.get('[data-cy="tab-custos"]').click();
      cy.get('[data-cy="grafico-custos"]')
        .should('have.attr', 'aria-label')
        .or('have.attr', 'aria-describedby');
    });
  });

  describe('Contraste e Visibilidade', () => {
    it('deve ter contraste adequado em todos os elementos', () => {
      cy.visit('/dashboard');
      cy.wait('@carregarDados');
      
      // Verificar contraste de textos principais
      cy.get('[data-cy="viagem-nome"]').should('be.visible')
        .and('have.css', 'color')
        .and('not.match', /rgba?\(128, 128, 128/); // Evitar cinza médio
      
      // Verificar contraste de botões
      cy.get('[data-cy="nova-viagem-button"]').should('be.visible')
        .and('have.css', 'background-color')
        .and('have.css', 'color');
      
      // Verificar contraste de links
      cy.get('a').each(($link) => {
        cy.wrap($link).should('have.css', 'color')
          .and('not.match', /rgba?\(128, 128, 128/);
      });
    });

    it('deve manter visibilidade com zoom de 200%', () => {
      cy.viewport(640, 360); // Simular zoom 200% em 1280x720
      cy.visit('/dashboard');
      cy.wait('@carregarDados');
      
      // Verificar que elementos principais ainda são visíveis
      cy.get('[data-cy="dashboard-title"]').should('be.visible');
      cy.get('[data-cy="nova-viagem-button"]').should('be.visible');
      cy.get('[data-cy="viagem-card"]').should('be.visible');
      
      // Verificar que não há scroll horizontal
      cy.get('body').should('have.css', 'overflow-x', 'hidden');
    });

    it('deve funcionar sem cores (modo alto contraste)', () => {
      // Simular modo alto contraste
      cy.visit('/dashboard', {
        onBeforeLoad: (win) => {
          win.document.documentElement.style.filter = 'grayscale(100%)';
        }
      });
      cy.wait('@carregarDados');
      
      // Verificar que informações ainda são distinguíveis
      cy.get('[data-cy="status-chip"]').should('be.visible')
        .and('have.text'); // Status deve ser textual, não apenas cor
      
      // Verificar ícones informativos
      cy.get('[data-cy="viagem-card"]').within(() => {
        cy.get('[aria-label]').should('exist'); // Ícones devem ter labels
      });
    });
  });

  describe('Formulários Acessíveis', () => {
    it('deve ter validação acessível', () => {
      cy.visit('/viagens/nova');
      
      // Tentar submeter formulário vazio
      cy.get('[data-cy="salvar-viagem-button"]').click();
      
      // Verificar que erros são anunciados
      cy.get('[role="alert"]').should('exist').and('be.visible');
      cy.get('[aria-invalid="true"]').should('exist');
      
      // Verificar associação entre campo e erro
      cy.get('[data-cy="nome-viagem-input"]')
        .should('have.attr', 'aria-describedby')
        .then((describedBy) => {
          cy.get(`#${describedBy}`).should('exist').and('contain.text', 'obrigatório');
        });
    });

    it('deve ter instruções claras para campos complexos', () => {
      cy.visit('/viagens/nova');
      
      // Verificar instruções para campos de data
      cy.get('[data-cy="data-inicio-input"]')
        .should('have.attr', 'aria-describedby')
        .then((describedBy) => {
          cy.get(`#${describedBy}`).should('contain.text', 'DD/MM/AAAA');
        });
      
      // Verificar placeholder acessível
      cy.get('[data-cy="data-inicio-input"]')
        .should('have.attr', 'placeholder', 'DD/MM/AAAA');
    });

    it('deve agrupar campos relacionados', () => {
      cy.visit('/perfil');
      
      // Verificar fieldsets para dados da moto
      cy.get('[data-cy="dados-motocicleta"]')
        .should('have.prop', 'tagName', 'FIELDSET')
        .and('contain', 'legend');
      
      // Verificar agrupamento de endereço
      cy.get('[data-cy="endereco-fieldset"]')
        .should('have.prop', 'tagName', 'FIELDSET')
        .find('legend').should('contain.text', 'Endereço');
    });
  });

  describe('Navegação e Orientação', () => {
    it('deve ter breadcrumbs acessíveis', () => {
      cy.visit('/viagens/viagem-1');
      
      // Verificar estrutura de breadcrumbs
      cy.get('[aria-label="Breadcrumb"]').should('exist');
      cy.get('[aria-label="Breadcrumb"] ol').should('exist');
      
      // Verificar item atual
      cy.get('[aria-current="page"]').should('exist')
        .and('contain.text', 'Detalhes da Viagem');
    });

    it('deve ter skip links funcionais', () => {
      cy.visit('/dashboard');
      
      // Verificar skip to content
      cy.get('body').tab();
      cy.focused().should('contain.text', 'Pular para conteúdo principal');
      
      // Usar skip link
      cy.focused().type('{enter}');
      cy.focused().should('have.attr', 'data-cy', 'main-content');
    });

    it('deve indicar página atual na navegação', () => {
      cy.visit('/dashboard');
      
      // Verificar indicação visual e semântica
      cy.get('[data-cy="nav-dashboard"]')
        .should('have.attr', 'aria-current', 'page')
        .and('have.class', 'active');
      
      // Navegar para outra página
      cy.get('[data-cy="nav-perfil"]').click();
      cy.get('[data-cy="nav-perfil"]')
        .should('have.attr', 'aria-current', 'page');
      cy.get('[data-cy="nav-dashboard"]')
        .should('not.have.attr', 'aria-current');
    });
  });

  describe('Responsividade Acessível', () => {
    it('deve manter acessibilidade em dispositivos móveis', () => {
      cy.setMobileViewport();
      cy.visit('/dashboard');
      cy.wait('@carregarDados');
      
      // Verificar que elementos focáveis têm tamanho adequado
      cy.get('[data-cy="nova-viagem-button"]')
        .should('have.css', 'min-height')
        .and('match', /^([4-9]\d|[1-9]\d{2,})px$/); // Mínimo 44px
      
      // Verificar navegação mobile acessível
      cy.get('[data-cy="mobile-menu-button"]')
        .should('have.attr', 'aria-label')
        .and('have.attr', 'aria-expanded', 'false');
      
      // Abrir menu mobile
      cy.get('[data-cy="mobile-menu-button"]').click();
      cy.get('[data-cy="mobile-menu-button"]')
        .should('have.attr', 'aria-expanded', 'true');
    });

    it('deve adaptar conteúdo para leitores de tela em mobile', () => {
      cy.setMobileViewport();
      cy.visit('/viagens/viagem-1');
      
      // Verificar que abas são acessíveis em mobile
      cy.get('[role="tablist"]').should('exist');
      cy.get('[role="tab"]').should('have.length.at.least', 3);
      
      // Verificar navegação por swipe é anunciada
      cy.get('[aria-live="polite"]').should('exist');
    });
  });

  describe('Conteúdo Multimídia', () => {
    it('deve ter alternativas para imagens', () => {
      cy.visit('/viagens/viagem-1');
      cy.get('[data-cy="tab-diario"]').click();
      
      // Verificar alt text em imagens
      cy.get('img').each(($img) => {
        cy.wrap($img).should('have.attr', 'alt');
        
        // Alt não deve ser apenas nome do arquivo
        cy.wrap($img).should('not.have.attr', 'alt', /\.(jpg|jpeg|png|gif)$/i);
      });
      
      // Verificar imagens decorativas
      cy.get('[data-cy="decorative-image"]')
        .should('have.attr', 'alt', '')
        .and('have.attr', 'role', 'presentation');
    });

    it('deve ter controles acessíveis para mapas', () => {
      cy.visit('/viagens/viagem-1');
      cy.get('[data-cy="tab-dias"]').click();
      
      // Verificar controles de zoom
      cy.get('[data-cy="zoom-in"]')
        .should('have.attr', 'aria-label', 'Aumentar zoom');
      cy.get('[data-cy="zoom-out"]')
        .should('have.attr', 'aria-label', 'Diminuir zoom');
      
      // Verificar alternativa textual para mapa
      cy.get('[data-cy="map-text-alternative"]').should('exist')
        .and('contain.text', 'Rota de');
    });
  });

  describe('Estados e Feedback', () => {
    it('deve anunciar estados de carregamento', () => {
      cy.visit('/dashboard');
      
      // Verificar indicador de carregamento
      cy.get('[aria-live="polite"]').should('contain.text', 'Carregando');
      
      cy.wait('@carregarDados');
      
      // Verificar anúncio de conclusão
      cy.get('[aria-live="polite"]').should('contain.text', 'Dados carregados');
    });

    it('deve anunciar mudanças de estado offline/online', () => {
      cy.visit('/dashboard');
      cy.wait('@carregarDados');
      
      // Simular offline
      cy.goOffline();
      
      // Verificar anúncio de modo offline
      cy.get('[aria-live="assertive"]')
        .should('contain.text', 'Aplicação em modo offline');
      
      // Voltar online
      cy.goOnline();
      
      // Verificar anúncio de volta online
      cy.get('[aria-live="assertive"]')
        .should('contain.text', 'Conexão restaurada');
    });

    it('deve ter feedback acessível para ações', () => {
      cy.visit('/viagens/nova');
      
      const viagemTeste = {
        nome: 'Viagem Acessibilidade',
        descricao: 'Teste de feedback acessível',
        dataInicio: '01/12/2024',
        dataFim: '03/12/2024'
      };
      
      cy.preencherFormularioViagem(viagemTeste);
      cy.get('[data-cy="salvar-viagem-button"]').click();
      
      // Verificar feedback de sucesso acessível
      cy.get('[role="alert"]').should('exist')
        .and('contain.text', 'Viagem salva com sucesso');
      
      // Verificar que o foco é gerenciado adequadamente
      cy.focused().should('exist');
    });
  });
});