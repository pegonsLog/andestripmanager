import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

// Componente a ser testado
import { ViagemCardComponent } from './viagem-card.component';

// Utilitários de teste
import { TestHelper, MockDataFactory, createComponentTestConfig } from '../../../testing/test-utils';

// Models
import { Viagem, StatusViagem } from '../../../models';

describe('ViagemCardComponent', () => {
    let component: ViagemCardComponent;
    let fixture: ComponentFixture<ViagemCardComponent>;
    let mockViagem: Viagem;

    beforeEach(async () => {
        // Criar dados mock
        mockViagem = MockDataFactory.createViagem();

        await TestBed.configureTestingModule(
            createComponentTestConfig({
                component: ViagemCardComponent,
                imports: [ViagemCardComponent]
            })
        ).compileComponents();

        fixture = TestBed.createComponent(ViagemCardComponent);
        component = fixture.componentInstance;

        // Configurar inputs obrigatórios
        component.viagem = mockViagem;

        fixture.detectChanges();
    });

    describe('Inicialização do Componente', () => {
        it('deve criar o componente', () => {
            expect(component).toBeTruthy();
        });

        it('deve receber viagem como input', () => {
            expect(component.viagem).toEqual(mockViagem);
        });

        it('deve ter showActions como true por padrão', () => {
            expect(component.showActions).toBe(true);
        });

        it('deve ter compact como false por padrão', () => {
            expect(component.compact).toBe(false);
        });
    });

    describe('Renderização do Template', () => {
        it('deve exibir o nome da viagem', () => {
            const nomeElement = TestHelper.getBySelector(fixture, '.viagem-nome');
            expect(nomeElement?.textContent?.trim()).toBe(mockViagem.nome);
        });

        it('deve exibir a descrição da viagem', () => {
            const descricaoElement = TestHelper.getBySelector(fixture, '.viagem-descricao');
            expect(descricaoElement?.textContent?.trim()).toBe(mockViagem.descricao);
        });

        it('deve exibir as datas formatadas', () => {
            const dataInicioElement = TestHelper.getBySelector(fixture, '.data-inicio');
            const dataFimElement = TestHelper.getBySelector(fixture, '.data-fim');

            expect(dataInicioElement?.textContent).toContain('01/06/2024');
            expect(dataFimElement?.textContent).toContain('05/06/2024');
        });

        it('deve exibir o status da viagem', () => {
            const statusElement = TestHelper.getBySelector(fixture, 'mat-chip');
            expect(statusElement?.textContent?.trim()).toBe('Planejada');
        });

        it('deve exibir distância quando disponível', () => {
            const distanciaElement = TestHelper.getBySelector(fixture, '.distancia');
            expect(distanciaElement?.textContent).toContain('450 km');
        });

        it('deve exibir custo total quando disponível', () => {
            const custoElement = TestHelper.getBySelector(fixture, '.custo-total');
            expect(custoElement?.textContent).toContain('R$ 1.500,00');
        });

        it('deve exibir duração calculada da viagem', () => {
            const duracaoElement = TestHelper.getBySelector(fixture, '.duracao');
            expect(duracaoElement?.textContent).toContain('5 dias');
        });
    });

    describe('Exibição de Ações', () => {
        it('deve exibir botões de ação quando showActions é true', () => {
            component.showActions = true;
            fixture.detectChanges();

            const menuButton = TestHelper.getBySelector(fixture, '[data-test="menu-button"]');
            expect(menuButton).toBeTruthy();
        });

        it('deve ocultar botões de ação quando showActions é false', () => {
            component.showActions = false;
            fixture.detectChanges();

            const menuButton = TestHelper.getBySelector(fixture, '[data-test="menu-button"]');
            expect(menuButton).toBeFalsy();
        });

        it('deve exibir todas as opções do menu de ações', () => {
            const menuTrigger = TestHelper.getBySelector(fixture, '[data-test="menu-button"]');
            TestHelper.click(menuTrigger);
            fixture.detectChanges();

            const editarButton = TestHelper.getBySelector(fixture, '[data-test="editar-button"]');
            const excluirButton = TestHelper.getBySelector(fixture, '[data-test="excluir-button"]');
            const duplicarButton = TestHelper.getBySelector(fixture, '[data-test="duplicar-button"]');

            expect(editarButton).toBeTruthy();
            expect(excluirButton).toBeTruthy();
            expect(duplicarButton).toBeTruthy();
        });
    });

    describe('Eventos de Output', () => {
        it('deve emitir evento visualizar ao clicar no card', () => {
            spyOn(component.visualizar, 'emit');

            const card = TestHelper.getBySelector(fixture, 'mat-card');
            TestHelper.click(card);

            expect(component.visualizar.emit).toHaveBeenCalledWith(mockViagem.id);
        });

        it('deve emitir evento editar ao clicar no botão editar', () => {
            spyOn(component.editar, 'emit');

            // Abrir menu
            const menuTrigger = TestHelper.getBySelector(fixture, '[data-test="menu-button"]');
            TestHelper.click(menuTrigger);
            fixture.detectChanges();

            // Clicar em editar
            const editarButton = TestHelper.getBySelector(fixture, '[data-test="editar-button"]');
            TestHelper.click(editarButton);

            expect(component.editar.emit).toHaveBeenCalledWith(mockViagem.id);
        });

        it('deve emitir evento excluir ao clicar no botão excluir', () => {
            spyOn(component.excluir, 'emit');

            // Abrir menu
            const menuTrigger = TestHelper.getBySelector(fixture, '[data-test="menu-button"]');
            TestHelper.click(menuTrigger);
            fixture.detectChanges();

            // Clicar em excluir
            const excluirButton = TestHelper.getBySelector(fixture, '[data-test="excluir-button"]');
            TestHelper.click(excluirButton);

            expect(component.excluir.emit).toHaveBeenCalledWith(mockViagem.id);
        });

        it('deve emitir evento duplicar ao clicar no botão duplicar', () => {
            spyOn(component.duplicar, 'emit');

            // Abrir menu
            const menuTrigger = TestHelper.getBySelector(fixture, '[data-test="menu-button"]');
            TestHelper.click(menuTrigger);
            fixture.detectChanges();

            // Clicar em duplicar
            const duplicarButton = TestHelper.getBySelector(fixture, '[data-test="duplicar-button"]');
            TestHelper.click(duplicarButton);

            expect(component.duplicar.emit).toHaveBeenCalledWith(mockViagem.id);
        });

        it('deve parar propagação de eventos nos botões de ação', () => {
            spyOn(component.visualizar, 'emit');
            spyOn(component.editar, 'emit');

            // Abrir menu
            const menuTrigger = TestHelper.getBySelector(fixture, '[data-test="menu-button"]');
            TestHelper.click(menuTrigger);
            fixture.detectChanges();

            // Clicar em editar (não deve disparar visualizar)
            const editarButton = TestHelper.getBySelector(fixture, '[data-test="editar-button"]');
            TestHelper.click(editarButton);

            expect(component.editar.emit).toHaveBeenCalled();
            expect(component.visualizar.emit).not.toHaveBeenCalled();
        });
    });

    describe('Formatação de Dados', () => {
        it('deve formatar datas corretamente', () => {
            const dataFormatada = component.formatarData('2024-06-01');
            expect(dataFormatada).toBe('01/06/2024');
        });

        it('deve formatar moeda corretamente', () => {
            const moedaFormatada = component.formatarMoeda(1500);
            expect(moedaFormatada).toBe('R$ 1.500,00');
        });

        it('deve formatar distância corretamente', () => {
            const distanciaFormatada = component.formatarDistancia(1500);
            expect(distanciaFormatada).toBe('1.500 km');
        });

        it('deve calcular duração corretamente', () => {
            // Viagem de 01/06 a 05/06 = 5 dias
            const duracao = component.calcularDuracao();
            expect(duracao).toBe(5);
        });
    });

    describe('Status da Viagem', () => {
        it('deve retornar cor correta para status PLANEJADA', () => {
            const cor = component.getCorStatus(StatusViagem.PLANEJADA);
            expect(cor).toBe('primary');
        });

        it('deve retornar cor correta para status EM_ANDAMENTO', () => {
            const cor = component.getCorStatus(StatusViagem.EM_ANDAMENTO);
            expect(cor).toBe('accent');
        });

        it('deve retornar cor correta para status FINALIZADA', () => {
            const cor = component.getCorStatus(StatusViagem.FINALIZADA);
            expect(cor).toBe('warn');
        });

        it('deve retornar texto correto para status PLANEJADA', () => {
            const texto = component.getTextoStatus(StatusViagem.PLANEJADA);
            expect(texto).toBe('Planejada');
        });

        it('deve retornar texto correto para status EM_ANDAMENTO', () => {
            const texto = component.getTextoStatus(StatusViagem.EM_ANDAMENTO);
            expect(texto).toBe('Em Andamento');
        });

        it('deve retornar texto correto para status FINALIZADA', () => {
            const texto = component.getTextoStatus(StatusViagem.FINALIZADA);
            expect(texto).toBe('Finalizada');
        });

        it('deve retornar ícone correto para status PLANEJADA', () => {
            const icone = component.getIconeStatus(StatusViagem.PLANEJADA);
            expect(icone).toBe('schedule');
        });

        it('deve retornar ícone correto para status EM_ANDAMENTO', () => {
            const icone = component.getIconeStatus(StatusViagem.EM_ANDAMENTO);
            expect(icone).toBe('directions_bike');
        });

        it('deve retornar ícone correto para status FINALIZADA', () => {
            const icone = component.getIconeStatus(StatusViagem.FINALIZADA);
            expect(icone).toBe('check_circle');
        });
    });

    describe('Verificação de Atraso', () => {
        it('deve identificar viagem atrasada (planejada com data passada)', () => {
            const viagemAtrasada = MockDataFactory.createViagem({
                status: StatusViagem.PLANEJADA,
                dataInicio: '2023-01-01' // Data no passado
            });

            component.viagem = viagemAtrasada;

            expect(component.isAtrasada()).toBe(true);
        });

        it('não deve identificar como atrasada viagem em andamento', () => {
            const viagemEmAndamento = MockDataFactory.createViagem({
                status: StatusViagem.EM_ANDAMENTO,
                dataInicio: '2023-01-01' // Data no passado
            });

            component.viagem = viagemEmAndamento;

            expect(component.isAtrasada()).toBe(false);
        });

        it('não deve identificar como atrasada viagem finalizada', () => {
            const viagemFinalizada = MockDataFactory.createViagem({
                status: StatusViagem.FINALIZADA,
                dataInicio: '2023-01-01' // Data no passado
            });

            component.viagem = viagemFinalizada;

            expect(component.isAtrasada()).toBe(false);
        });

        it('deve calcular dias restantes corretamente', () => {
            const amanha = new Date();
            amanha.setDate(amanha.getDate() + 5);

            const viagemFutura = MockDataFactory.createViagem({
                dataInicio: amanha.toISOString().split('T')[0]
            });

            component.viagem = viagemFutura;

            expect(component.diasRestantes()).toBe(5);
        });
    });

    describe('Modo Compacto', () => {
        it('deve aplicar classe compact quando compact é true', () => {
            component.compact = true;
            fixture.detectChanges();

            const card = TestHelper.getBySelector(fixture, 'mat-card');
            expect(card.classList.contains('compact')).toBe(true);
        });

        it('não deve aplicar classe compact quando compact é false', () => {
            component.compact = false;
            fixture.detectChanges();

            const card = TestHelper.getBySelector(fixture, 'mat-card');
            expect(card.classList.contains('compact')).toBe(false);
        });
    });

    describe('Casos Extremos', () => {
        it('deve lidar com viagem sem ID', () => {
            const viagemSemId = MockDataFactory.createViagem({ id: undefined });
            component.viagem = viagemSemId;

            spyOn(component.visualizar, 'emit');

            const card = TestHelper.getBySelector(fixture, 'mat-card');
            TestHelper.click(card);

            expect(component.visualizar.emit).not.toHaveBeenCalled();
        });

        it('deve lidar com valores nulos/undefined', () => {
            const viagemIncompleta = MockDataFactory.createViagem({
                distanciaTotal: undefined,
                custoTotal: undefined,
                descricao: ''
            });

            component.viagem = viagemIncompleta;
            fixture.detectChanges();

            // Não deve quebrar a renderização
            expect(component).toBeTruthy();
        });

        it('deve lidar com datas inválidas', () => {
            const viagemDataInvalida = MockDataFactory.createViagem({
                dataInicio: 'data-invalida',
                dataFim: 'data-invalida'
            });

            component.viagem = viagemDataInvalida;

            // Não deve quebrar o cálculo de duração
            expect(() => component.calcularDuracao()).not.toThrow();
        });
    });

    describe('Acessibilidade', () => {
        it('deve ter atributos ARIA apropriados', () => {
            const card = TestHelper.getBySelector(fixture, 'mat-card');
            expect(card.getAttribute('role')).toBe('button');
            expect(card.getAttribute('tabindex')).toBe('0');
        });

        it('deve ter labels descritivos nos botões', () => {
            const menuButton = TestHelper.getBySelector(fixture, '[data-test="menu-button"]');
            expect(menuButton.getAttribute('aria-label')).toContain('Ações da viagem');
        });

        it('deve suportar navegação por teclado', () => {
            spyOn(component.visualizar, 'emit');

            const card = TestHelper.getBySelector(fixture, 'mat-card');

            // Simular Enter
            const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
            card.dispatchEvent(enterEvent);

            expect(component.visualizar.emit).toHaveBeenCalledWith(mockViagem.id);
        });
    });
});