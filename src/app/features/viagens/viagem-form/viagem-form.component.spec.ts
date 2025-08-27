import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';

import { ViagemFormComponent } from './viagem-form.component';
import { ViagensService } from '../../../services/viagens.service';
import { StatusViagem } from '../../../models';

describe('ViagemFormComponent', () => {
    let component: ViagemFormComponent;
    let fixture: ComponentFixture<ViagemFormComponent>;
    let mockViagensService: jasmine.SpyObj<ViagensService>;
    let mockRouter: jasmine.SpyObj<Router>;
    let mockSnackBar: jasmine.SpyObj<MatSnackBar>;

    const mockViagem = {
        id: '1',
        nome: 'Viagem Teste',
        descricao: 'Descrição teste',
        dataInicio: '2024-01-01',
        dataFim: '2024-01-05',
        origem: 'São Paulo',
        destino: 'Rio de Janeiro',
        status: StatusViagem.PLANEJADA,
        usuarioId: 'user1',
        distanciaTotal: 500,
        custoTotal: 1000,
        observacoes: 'Observações teste'
    };

    beforeEach(async () => {
        const viagensServiceSpy = jasmine.createSpyObj('ViagensService', [
            'criarViagem',
            'altera',
            'recuperarPorId'
        ]);
        const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
        const snackBarSpy = jasmine.createSpyObj('MatSnackBar', ['open']);

        await TestBed.configureTestingModule({
            imports: [
                ViagemFormComponent,
                ReactiveFormsModule,
                NoopAnimationsModule
            ],
            providers: [
                { provide: ViagensService, useValue: viagensServiceSpy },
                { provide: Router, useValue: routerSpy },
                { provide: MatSnackBar, useValue: snackBarSpy }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(ViagemFormComponent);
        component = fixture.componentInstance;
        mockViagensService = TestBed.inject(ViagensService) as jasmine.SpyObj<ViagensService>;
        mockRouter = TestBed.inject(Router) as jasmine.SpyObj<Router>;
        mockSnackBar = TestBed.inject(MatSnackBar) as jasmine.SpyObj<MatSnackBar>;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize form with empty values for new trip', () => {
        fixture.detectChanges();

        expect(component.viagemForm).toBeDefined();
        expect(component.isEditMode).toBeFalse();
        expect(component.viagemForm.get('nome')?.value).toBe('');
        expect(component.viagemForm.get('status')?.value).toBe(StatusViagem.PLANEJADA);
    });

    it('should populate form when editing existing trip', () => {
        component.viagem = mockViagem;
        component.isEditMode = true;

        fixture.detectChanges();

        expect(component.viagemForm.get('nome')?.value).toBe(mockViagem.nome);
        expect(component.viagemForm.get('origem')?.value).toBe(mockViagem.origem);
        expect(component.viagemForm.get('destino')?.value).toBe(mockViagem.destino);
    });

    it('should validate required fields', () => {
        fixture.detectChanges();

        const nomeControl = component.viagemForm.get('nome');
        const origemControl = component.viagemForm.get('origem');
        const destinoControl = component.viagemForm.get('destino');
        const dataInicioControl = component.viagemForm.get('dataInicio');
        const dataFimControl = component.viagemForm.get('dataFim');

        expect(nomeControl?.hasError('required')).toBeTruthy();
        expect(origemControl?.hasError('required')).toBeTruthy();
        expect(destinoControl?.hasError('required')).toBeTruthy();
        expect(dataInicioControl?.hasError('required')).toBeTruthy();
        expect(dataFimControl?.hasError('required')).toBeTruthy();
    });

    it('should validate minimum length for nome field', () => {
        fixture.detectChanges();

        const nomeControl = component.viagemForm.get('nome');
        nomeControl?.setValue('ab');

        expect(nomeControl?.hasError('minlength')).toBeTruthy();

        nomeControl?.setValue('abc');
        expect(nomeControl?.hasError('minlength')).toBeFalsy();
    });

    it('should validate date range', () => {
        fixture.detectChanges();

        const dataInicioControl = component.viagemForm.get('dataInicio');
        const dataFimControl = component.viagemForm.get('dataFim');

        dataInicioControl?.setValue('2024-01-05');
        dataFimControl?.setValue('2024-01-01');

        expect(dataFimControl?.hasError('dataFimInvalida')).toBeTruthy();

        dataFimControl?.setValue('2024-01-10');
        expect(dataFimControl?.hasError('dataFimInvalida')).toBeFalsy();
    });

    it('should calculate number of days correctly', () => {
        fixture.detectChanges();

        component.viagemForm.patchValue({
            dataInicio: '2024-01-01',
            dataFim: '2024-01-05'
        });

        expect(component.calcularNumeroDias()).toBe(5);
    });

    it('should create new trip successfully', async () => {
        mockViagensService.criarViagem.and.returnValue(Promise.resolve('new-trip-id'));

        fixture.detectChanges();

        component.viagemForm.patchValue({
            nome: 'Nova Viagem',
            origem: 'São Paulo',
            destino: 'Rio de Janeiro',
            dataInicio: '2024-01-01',
            dataFim: '2024-01-05'
        });

        await component.onSalvar();

        expect(mockViagensService.criarViagem).toHaveBeenCalled();
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/viagens', 'new-trip-id']);
        expect(mockSnackBar.open).toHaveBeenCalledWith(
            'Viagem criada com sucesso!',
            'Fechar',
            jasmine.any(Object)
        );
    });

    it('should update existing trip successfully', async () => {
        mockViagensService.altera.and.returnValue(Promise.resolve());

        component.viagem = mockViagem;
        component.isEditMode = true;

        fixture.detectChanges();

        component.viagemForm.patchValue({
            nome: 'Viagem Atualizada'
        });

        await component.onSalvar();

        expect(mockViagensService.altera).toHaveBeenCalledWith(
            mockViagem.id,
            jasmine.any(Object)
        );
        expect(mockSnackBar.open).toHaveBeenCalledWith(
            'Viagem atualizada com sucesso!',
            'Fechar',
            jasmine.any(Object)
        );
    });

    it('should handle save error', async () => {
        mockViagensService.criarViagem.and.returnValue(
            Promise.reject(new Error('Erro de rede'))
        );

        fixture.detectChanges();

        component.viagemForm.patchValue({
            nome: 'Nova Viagem',
            origem: 'São Paulo',
            destino: 'Rio de Janeiro',
            dataInicio: '2024-01-01',
            dataFim: '2024-01-05'
        });

        await component.onSalvar();

        expect(mockSnackBar.open).toHaveBeenCalledWith(
            'Erro ao salvar viagem. Tente novamente.',
            'Fechar',
            jasmine.any(Object)
        );
    });

    it('should not save invalid form', async () => {
        fixture.detectChanges();

        // Formulário vazio (inválido)
        await component.onSalvar();

        expect(mockViagensService.criarViagem).not.toHaveBeenCalled();
        expect(mockSnackBar.open).toHaveBeenCalledWith(
            'Por favor, corrija os erros no formulário',
            'Fechar',
            jasmine.any(Object)
        );
    });

    it('should emit cancel event', () => {
        spyOn(component.cancelar, 'emit');

        fixture.detectChanges();

        component.onCancelar();

        expect(component.cancelar.emit).toHaveBeenCalled();
    });

    it('should confirm cancel when form is dirty', () => {
        spyOn(window, 'confirm').and.returnValue(false);
        spyOn(component.cancelar, 'emit');

        fixture.detectChanges();

        component.viagemForm.markAsDirty();
        component.onCancelar();

        expect(window.confirm).toHaveBeenCalled();
        expect(component.cancelar.emit).not.toHaveBeenCalled();
    });

    it('should return correct error messages', () => {
        fixture.detectChanges();

        const nomeControl = component.viagemForm.get('nome');
        nomeControl?.markAsTouched();

        expect(component.getErrorMessage('nome')).toBe('Este campo é obrigatório');

        nomeControl?.setValue('ab');
        expect(component.getErrorMessage('nome')).toBe('Mínimo de 3 caracteres');
    });

    it('should check field errors correctly', () => {
        fixture.detectChanges();

        expect(component.hasError('nome')).toBeFalsy();

        const nomeControl = component.viagemForm.get('nome');
        nomeControl?.markAsTouched();

        expect(component.hasError('nome')).toBeTruthy();
    });
});