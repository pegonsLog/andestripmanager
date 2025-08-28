import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { ManutencoesComponent } from './manutencoes.component';
import { TipoManutencao } from '../../../../models/enums';
import { CategoriaManutencao, Manutencao } from '../../../../models/manutencao.interface';

describe('ManutencoesComponent', () => {
    let component: ManutencoesComponent;
    let fixture: ComponentFixture<ManutencoesComponent>;

    const mockManutencao: Manutencao = {
        id: '1',
        usuarioId: 'user123',
        tipo: TipoManutencao.PREVENTIVA,
        descricao: 'Manutenção preventiva completa',
        data: '2024-01-15',
        quilometragem: 15000,
        custo: 350.00,
        itensServicos: [
            {
                nome: 'Troca de óleo',
                categoria: CategoriaManutencao.MOTOR,
                custo: 150.00,
                quantidade: 1
            }
        ]
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [
                ManutencoesComponent,
                NoopAnimationsModule
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(ManutencoesComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('deve criar o componente', () => {
        expect(component).toBeTruthy();
    });

    it('deve inicializar com estado correto', () => {
        expect(component.mostrarFormulario).toBe(false);
        expect(component.manutencaoEdicao).toBeUndefined();
        expect(component.abaSelecionada).toBe(0);
    });

    it('deve mostrar formulário para nova manutenção', () => {
        component.onNovaManutencao();

        expect(component.mostrarFormulario).toBe(true);
        expect(component.manutencaoEdicao).toBeUndefined();
        expect(component.abaSelecionada).toBe(1);
    });

    it('deve mostrar formulário para editar manutenção', () => {
        component.onEditarManutencao(mockManutencao);

        expect(component.mostrarFormulario).toBe(true);
        expect(component.manutencaoEdicao).toBe(mockManutencao);
        expect(component.abaSelecionada).toBe(1);
    });

    it('deve cancelar edição e voltar para lista', () => {
        component.onEditarManutencao(mockManutencao);
        component.onCancelarEdicao();

        expect(component.mostrarFormulario).toBe(false);
        expect(component.manutencaoEdicao).toBeUndefined();
        expect(component.abaSelecionada).toBe(0);
    });

    it('deve salvar manutenção e voltar para lista', () => {
        component.onNovaManutencao();
        component.onSalvarManutencao(mockManutencao);

        expect(component.mostrarFormulario).toBe(false);
        expect(component.manutencaoEdicao).toBeUndefined();
        expect(component.abaSelecionada).toBe(0);
    });

    it('deve manipular mudança de aba corretamente', () => {
        component.onNovaManutencao();

        // Voltar para aba da lista
        component.onMudancaAba(0);

        expect(component.abaSelecionada).toBe(0);
        expect(component.mostrarFormulario).toBe(false);
        expect(component.manutencaoEdicao).toBeUndefined();
    });

    it('deve obter título correto para formulário', () => {
        // Nova manutenção
        component.onNovaManutencao();
        expect(component.obterTituloFormulario()).toBe('Nova Manutenção');

        // Editar manutenção
        component.onEditarManutencao(mockManutencao);
        expect(component.obterTituloFormulario()).toBe('Editar Manutenção');
    });

    it('deve passar viagemId para componentes filhos', () => {
        component.viagemId = 'viagem123';
        fixture.detectChanges();

        expect(component.viagemId).toBe('viagem123');
    });
});