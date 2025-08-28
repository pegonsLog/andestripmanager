import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { ManutencaoListComponent } from './manutencao-list.component';
import { ManutencoesService } from '../../../../services/manutencoes.service';
import { AuthService } from '../../../../core/services/auth.service';
import { TipoManutencao } from '../../../../models/enums';
import { CategoriaManutencao, Manutencao } from '../../../../models/manutencao.interface';

describe('ManutencaoListComponent', () => {
    let component: ManutencaoListComponent;
    let fixture: ComponentFixture<ManutencaoListComponent>;
    let mockManutencoesService: jasmine.SpyObj<ManutencoesService>;
    let mockAuthService: jasmine.SpyObj<AuthService>;

    const mockManutencoes: Manutencao[] = [
        {
            id: '1',
            usuarioId: 'user123',
            tipo: TipoManutencao.PREVENTIVA,
            descricao: 'Manutenção preventiva completa',
            data: '2024-01-15',
            quilometragem: 15000,
            custo: 350.00,
            local: 'São Paulo, SP',
            oficina: 'Oficina do João',
            itensServicos: [
                {
                    nome: 'Troca de óleo',
                    categoria: CategoriaManutencao.MOTOR,
                    custo: 150.00,
                    quantidade: 1
                },
                {
                    nome: 'Filtro de ar',
                    categoria: CategoriaManutencao.MOTOR,
                    custo: 50.00,
                    quantidade: 1
                }
            ]
        },
        {
            id: '2',
            usuarioId: 'user123',
            tipo: TipoManutencao.CORRETIVA,
            descricao: 'Reparo no freio',
            data: '2024-02-10',
            quilometragem: 16000,
            custo: 200.00,
            local: 'Rio de Janeiro, RJ',
            itensServicos: [
                {
                    nome: 'Pastilha de freio',
                    categoria: CategoriaManutencao.FREIOS,
                    custo: 120.00,
                    quantidade: 2
                }
            ]
        }
    ];

    const mockEstatisticas = {
        totalManutencoes: 2,
        custoTotal: 550.00,
        custoMedio: 275.00,
        manutencoesPorTipo: {
            [TipoManutencao.PREVENTIVA]: 1,
            [TipoManutencao.CORRETIVA]: 1
        },
        ultimaManutencao: mockManutencoes[1]
    };

    beforeEach(async () => {
        const manutencoesServiceSpy = jasmine.createSpyObj('ManutencoesService', [
            'recuperarPorUsuario', 'recuperarPorViagem', 'recuperarEstatisticas', 'remove'
        ]);
        const authServiceSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser']);

        await TestBed.configureTestingModule({
            imports: [
                ManutencaoListComponent,
                ReactiveFormsModule,
                MatSnackBarModule,
                MatDialogModule,
                MatDatepickerModule,
                MatNativeDateModule,
                NoopAnimationsModule
            ],
            providers: [
                { provide: ManutencoesService, useValue: manutencoesServiceSpy },
                { provide: AuthService, useValue: authServiceSpy }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(ManutencaoListComponent);
        component = fixture.componentInstance;
        mockManutencoesService = TestBed.inject(ManutencoesService) as jasmine.SpyObj<ManutencoesService>;
        mockAuthService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;

        // Setup default mocks
        mockAuthService.getCurrentUser.and.returnValue(Promise.resolve({ uid: 'user123' } as any));
        mockManutencoesService.recuperarPorUsuario.and.returnValue(of(mockManutencoes));
        mockManutencoesService.recuperarPorViagem.and.returnValue(of(mockManutencoes));
        mockManutencoesService.recuperarEstatisticas.and.returnValue(of(mockEstatisticas));
    });

    it('deve criar o componente', () => {
        expect(component).toBeTruthy();
    });

    it('deve inicializar o formulário de filtros', () => {
        component.ngOnInit();

        expect(component.filtrosForm).toBeDefined();
        expect(component.filtrosForm.get('tipo')).toBeDefined();
        expect(component.filtrosForm.get('categoria')).toBeDefined();
        expect(component.filtrosForm.get('textoBusca')).toBeDefined();
    });

    it('deve carregar manutenções do usuário por padrão', async () => {
        component.ngOnInit();
        await fixture.whenStable();

        expect(mockAuthService.getCurrentUser).toHaveBeenCalled();
        expect(mockManutencoesService.recuperarPorUsuario).toHaveBeenCalledWith('user123');
    });

    it('deve carregar manutenções da viagem quando viagemId é fornecido', async () => {
        component.viagemId = 'viagem123';
        component.ngOnInit();
        await fixture.whenStable();

        expect(mockManutencoesService.recuperarPorViagem).toHaveBeenCalledWith('viagem123');
    });

    it('deve carregar estatísticas quando não há viagemId', async () => {
        component.ngOnInit();
        await fixture.whenStable();

        expect(mockManutencoesService.recuperarEstatisticas).toHaveBeenCalledWith('user123');
    });

    it('deve filtrar manutenções por tipo', () => {
        const manutencoes = mockManutencoes;
        const filtros = { tipo: TipoManutencao.PREVENTIVA };

        const resultado = component['aplicarFiltros'](manutencoes, filtros);

        expect(resultado.length).toBe(1);
        expect(resultado[0].tipo).toBe(TipoManutencao.PREVENTIVA);
    });

    it('deve filtrar manutenções por categoria', () => {
        const manutencoes = mockManutencoes;
        const filtros = { categoria: CategoriaManutencao.FREIOS };

        const resultado = component['aplicarFiltros'](manutencoes, filtros);

        expect(resultado.length).toBe(1);
        expect(resultado[0].itensServicos.some(item => item.categoria === CategoriaManutencao.FREIOS)).toBe(true);
    });

    it('deve filtrar manutenções por texto de busca', () => {
        const manutencoes = mockManutencoes;
        const filtros = { textoBusca: 'freio' };

        const resultado = component['aplicarFiltros'](manutencoes, filtros);

        expect(resultado.length).toBe(1);
        expect(resultado[0].descricao.toLowerCase()).toContain('freio');
    });

    it('deve filtrar manutenções por período de datas', () => {
        const manutencoes = mockManutencoes;
        const filtros = {
            dataInicio: '2024-02-01',
            dataFim: '2024-02-28'
        };

        const resultado = component['aplicarFiltros'](manutencoes, filtros);

        expect(resultado.length).toBe(1);
        expect(resultado[0].data).toBe('2024-02-10');
    });

    it('deve calcular custo total corretamente', () => {
        const custo = component.calcularCustoTotal(mockManutencoes);

        expect(custo).toBe(550.00);
    });

    it('deve limpar filtros', () => {
        component.ngOnInit();
        component.filtrosForm.patchValue({
            tipo: TipoManutencao.PREVENTIVA,
            textoBusca: 'teste'
        });

        component.limparFiltros();

        expect(component.filtrosForm.get('tipo')?.value).toBe(null);
        expect(component.filtrosForm.get('textoBusca')?.value).toBe(null);
    });

    it('deve emitir evento para nova manutenção', () => {
        spyOn(component.novaManutencao, 'emit');

        component.onNovaManutencao();

        expect(component.novaManutencao.emit).toHaveBeenCalled();
    });

    it('deve emitir evento para editar manutenção', () => {
        spyOn(component.editarManutencao, 'emit');
        const manutencao = mockManutencoes[0];

        component.onEditarManutencao(manutencao);

        expect(component.editarManutencao.emit).toHaveBeenCalledWith(manutencao);
    });

    it('deve excluir manutenção após confirmação', async () => {
        spyOn(window, 'confirm').and.returnValue(true);
        mockManutencoesService.remove.and.returnValue(Promise.resolve());
        const manutencao = mockManutencoes[0];

        await component.onExcluirManutencao(manutencao);

        expect(mockManutencoesService.remove).toHaveBeenCalledWith(manutencao.id);
    });

    it('não deve excluir manutenção se não confirmado', async () => {
        spyOn(window, 'confirm').and.returnValue(false);
        const manutencao = mockManutencoes[0];

        await component.onExcluirManutencao(manutencao);

        expect(mockManutencoesService.remove).not.toHaveBeenCalled();
    });

    it('deve obter labels corretos para tipos de manutenção', () => {
        expect(component.obterLabelTipoManutencao(TipoManutencao.PREVENTIVA)).toBe('Preventiva');
        expect(component.obterLabelTipoManutencao(TipoManutencao.CORRETIVA)).toBe('Corretiva');
        expect(component.obterLabelTipoManutencao(TipoManutencao.EMERGENCIAL)).toBe('Emergencial');
    });

    it('deve obter cores corretas para tipos de manutenção', () => {
        expect(component.obterCorTipoManutencao(TipoManutencao.PREVENTIVA)).toBe('primary');
        expect(component.obterCorTipoManutencao(TipoManutencao.CORRETIVA)).toBe('accent');
        expect(component.obterCorTipoManutencao(TipoManutencao.EMERGENCIAL)).toBe('warn');
    });

    it('deve formatar data corretamente', () => {
        const dataFormatada = component.formatarData('2024-01-15');

        expect(dataFormatada).toBe('15/01/2024');
    });

    it('deve formatar moeda corretamente', () => {
        const moedaFormatada = component.formatarMoeda(350.50);

        expect(moedaFormatada).toBe('R$ 350,50');
    });

    it('deve verificar se tem próxima manutenção', () => {
        const manutencaoComProxima = {
            ...mockManutencoes[0],
            proximaManutencaoKm: 20000
        };

        expect(component.temProximaManutencao(manutencaoComProxima)).toBe(true);
        expect(component.temProximaManutencao(mockManutencoes[0])).toBe(false);
    });

    it('deve obter texto da próxima manutenção', () => {
        const manutencao = {
            ...mockManutencoes[0],
            proximaManutencaoKm: 20000,
            proximaManutencaoData: '2024-06-15'
        };

        const texto = component.obterTextoProximaManutencao(manutencao);

        expect(texto).toContain('20.000 km');
        expect(texto).toContain('15/06/2024');
    });
});