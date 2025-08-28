import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { ManutencaoFormComponent } from './manutencao-form.component';
import { ManutencoesService } from '../../../../services/manutencoes.service';
import { AuthService } from '../../../../core/services/auth.service';
import { TipoManutencao } from '../../../../models/enums';
import { CategoriaManutencao } from '../../../../models/manutencao.interface';

describe('ManutencaoFormComponent', () => {
    let component: ManutencaoFormComponent;
    let fixture: ComponentFixture<ManutencaoFormComponent>;
    let mockManutencoesService: jasmine.SpyObj<ManutencoesService>;
    let mockAuthService: jasmine.SpyObj<AuthService>;

    const mockManutencao = {
        id: '1',
        usuarioId: 'user123',
        tipo: TipoManutencao.PREVENTIVA,
        descricao: 'Manutenção preventiva completa',
        data: '2024-01-15',
        quilometragem: 15000,
        custo: 350.00,
        local: 'São Paulo, SP',
        oficina: 'Oficina do João',
        telefoneOficina: '(11) 99999-9999',
        observacoes: 'Tudo ok',
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
        const manutencoesServiceSpy = jasmine.createSpyObj('ManutencoesService', [
            'novo', 'altera', 'criarChecklistPreventiva', 'criarChecklistViagem'
        ]);
        const authServiceSpy = jasmine.createSpyObj('AuthService', ['getCurrentUser']);

        await TestBed.configureTestingModule({
            imports: [
                ManutencaoFormComponent,
                ReactiveFormsModule,
                MatSnackBarModule,
                MatDatepickerModule,
                MatNativeDateModule,
                NoopAnimationsModule
            ],
            providers: [
                { provide: ManutencoesService, useValue: manutencoesServiceSpy },
                { provide: AuthService, useValue: authServiceSpy }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(ManutencaoFormComponent);
        component = fixture.componentInstance;
        mockManutencoesService = TestBed.inject(ManutencoesService) as jasmine.SpyObj<ManutencoesService>;
        mockAuthService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;

        // Setup default mocks
        mockManutencoesService.criarChecklistPreventiva.and.returnValue([]);
        mockManutencoesService.criarChecklistViagem.and.returnValue([]);
        mockAuthService.getCurrentUser.and.returnValue(Promise.resolve({ uid: 'user123' } as any));
    });

    it('deve criar o componente', () => {
        expect(component).toBeTruthy();
    });

    it('deve inicializar o formulário corretamente', () => {
        component.ngOnInit();

        expect(component.manutencaoForm).toBeDefined();
        expect(component.manutencaoForm.get('tipo')?.value).toBe(TipoManutencao.PREVENTIVA);
        expect(component.manutencaoForm.get('data')?.value).toBeInstanceOf(Date);
    });

    it('deve estar em modo de edição quando recebe manutenção', () => {
        component.manutencao = mockManutencao;
        component.ngOnInit();

        expect(component.isEditMode).toBe(true);
        expect(component.manutencaoForm.get('descricao')?.value).toBe(mockManutencao.descricao);
    });

    it('deve adicionar item ao checklist', () => {
        component.ngOnInit();
        const initialLength = component.itensServicos.length;

        component.adicionarItem();

        expect(component.itensServicos.length).toBe(initialLength + 1);
    });

    it('deve remover item do checklist', () => {
        component.ngOnInit();
        component.adicionarItem();
        component.adicionarItem(); // Adicionar 2 itens para poder remover 1
        const initialLength = component.itensServicos.length;

        component.removerItem(0);

        expect(component.itensServicos.length).toBe(initialLength - 1);
    });

    it('deve calcular custo total corretamente', () => {
        component.ngOnInit();
        component.adicionarItem();

        // Simular valores nos itens
        const item = component.itensServicos.at(0);
        item.patchValue({ custo: 100, quantidade: 2 });

        component.calcularCustoTotal();

        expect(component.manutencaoForm.get('custo')?.value).toBe(200);
    });

    it('deve validar campos obrigatórios', () => {
        component.ngOnInit();

        // Limpar campos obrigatórios
        component.manutencaoForm.patchValue({
            tipo: '',
            descricao: '',
            quilometragem: null,
            custo: null
        });

        expect(component.manutencaoForm.valid).toBe(false);
        expect(component.temErro('tipo')).toBe(false); // Ainda não foi tocado

        // Marcar como tocado
        component.manutencaoForm.get('tipo')?.markAsTouched();
        expect(component.temErro('tipo')).toBe(true);
    });

    it('deve emitir evento de cancelar', () => {
        spyOn(component.cancelar, 'emit');

        component.onCancelar();

        expect(component.cancelar.emit).toHaveBeenCalled();
    });

    it('deve obter labels corretos para tipos de manutenção', () => {
        expect(component.obterLabelTipoManutencao(TipoManutencao.PREVENTIVA)).toBe('Preventiva');
        expect(component.obterLabelTipoManutencao(TipoManutencao.CORRETIVA)).toBe('Corretiva');
        expect(component.obterLabelTipoManutencao(TipoManutencao.EMERGENCIAL)).toBe('Emergencial');
    });

    it('deve obter labels corretos para categorias de manutenção', () => {
        expect(component.obterLabelCategoriaManutencao(CategoriaManutencao.MOTOR)).toBe('Motor');
        expect(component.obterLabelCategoriaManutencao(CategoriaManutencao.FREIOS)).toBe('Freios');
        expect(component.obterLabelCategoriaManutencao(CategoriaManutencao.PNEUS)).toBe('Pneus');
    });

    it('deve usar checklist de viagem quando viagemId é fornecido', () => {
        component.viagemId = 'viagem123';
        component.ngOnInit();

        expect(mockManutencoesService.criarChecklistViagem).toHaveBeenCalled();
    });

    it('deve usar checklist preventiva quando não há viagemId', () => {
        component.ngOnInit();

        expect(mockManutencoesService.criarChecklistPreventiva).toHaveBeenCalled();
    });
});