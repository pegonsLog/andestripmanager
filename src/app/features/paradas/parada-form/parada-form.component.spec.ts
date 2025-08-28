import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { ParadaFormComponent } from './parada-form.component';
import { ParadasService } from '../../../services/paradas.service';
import { TipoParada, TipoCombustivel } from '../../../models';

describe('ParadaFormComponent', () => {
    let component: ParadaFormComponent;
    let fixture: ComponentFixture<ParadaFormComponent>;
    let mockParadasService: jasmine.SpyObj<ParadasService>;

    beforeEach(async () => {
        const spy = jasmine.createSpyObj('ParadasService', [
            'criarParada',
            'altera',
            'recuperarPorId'
        ]);

        await TestBed.configureTestingModule({
            imports: [
                ParadaFormComponent,
                ReactiveFormsModule,
                NoopAnimationsModule,
                MatSnackBarModule
            ],
            providers: [
                { provide: ParadasService, useValue: spy }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(ParadaFormComponent);
        component = fixture.componentInstance;
        mockParadasService = TestBed.inject(ParadasService) as jasmine.SpyObj<ParadasService>;

        // Definir inputs obrigatórios
        component.diaViagemId = 'dia-123';
        component.viagemId = 'viagem-123';

        fixture.detectChanges();
    });

    it('deve criar o componente', () => {
        expect(component).toBeTruthy();
    });

    it('deve inicializar o formulário com campos vazios', () => {
        expect(component.paradaForm).toBeDefined();
        expect(component.paradaForm.get('tipo')?.value).toBe('');
        expect(component.paradaForm.get('nome')?.value).toBe('');
    });

    it('deve mostrar campos específicos para abastecimento', () => {
        component.paradaForm.patchValue({ tipo: TipoParada.ABASTECIMENTO });
        fixture.detectChanges();

        expect(component.shouldShowFields(TipoParada.ABASTECIMENTO)).toBeTruthy();
        expect(component.shouldShowFields(TipoParada.REFEICAO)).toBeFalsy();
        expect(component.shouldShowFields(TipoParada.PONTO_INTERESSE)).toBeFalsy();
    });

    it('deve mostrar campos específicos para refeição', () => {
        component.paradaForm.patchValue({ tipo: TipoParada.REFEICAO });
        fixture.detectChanges();

        expect(component.shouldShowFields(TipoParada.REFEICAO)).toBeTruthy();
        expect(component.shouldShowFields(TipoParada.ABASTECIMENTO)).toBeFalsy();
        expect(component.shouldShowFields(TipoParada.PONTO_INTERESSE)).toBeFalsy();
    });

    it('deve mostrar campos específicos para ponto de interesse', () => {
        component.paradaForm.patchValue({ tipo: TipoParada.PONTO_INTERESSE });
        fixture.detectChanges();

        expect(component.shouldShowFields(TipoParada.PONTO_INTERESSE)).toBeTruthy();
        expect(component.shouldShowFields(TipoParada.ABASTECIMENTO)).toBeFalsy();
        expect(component.shouldShowFields(TipoParada.REFEICAO)).toBeFalsy();
    });

    it('deve validar campos obrigatórios', () => {
        const tipoControl = component.paradaForm.get('tipo');
        const nomeControl = component.paradaForm.get('nome');

        expect(tipoControl?.hasError('required')).toBeTruthy();
        expect(nomeControl?.hasError('required')).toBeTruthy();

        tipoControl?.setValue(TipoParada.ABASTECIMENTO);
        nomeControl?.setValue('Posto Shell');

        expect(tipoControl?.hasError('required')).toBeFalsy();
        expect(nomeControl?.hasError('required')).toBeFalsy();
    });

    it('deve validar campos específicos de abastecimento', () => {
        component.paradaForm.patchValue({ tipo: TipoParada.ABASTECIMENTO });

        const tipoCombustivelControl = component.paradaForm.get('tipoCombustivel');
        const quantidadeControl = component.paradaForm.get('quantidade');
        const precoPorLitroControl = component.paradaForm.get('precoPorLitro');

        expect(tipoCombustivelControl?.hasError('required')).toBeTruthy();
        expect(quantidadeControl?.hasError('required')).toBeTruthy();
        expect(precoPorLitroControl?.hasError('required')).toBeTruthy();
    });

    it('deve calcular valor total do abastecimento automaticamente', () => {
        component.paradaForm.patchValue({
            tipo: TipoParada.ABASTECIMENTO,
            quantidade: 50,
            precoPorLitro: 5.50
        });

        // Simular mudança nos campos para disparar o cálculo
        component.paradaForm.get('quantidade')?.updateValueAndValidity();

        expect(component.paradaForm.get('custo')?.value).toBe(275);
    });

    it('deve emitir evento ao salvar nova parada', async () => {
        spyOn(component.paradaSalva, 'emit');
        mockParadasService.criarParada.and.returnValue(Promise.resolve('nova-parada-123'));

        component.paradaForm.patchValue({
            tipo: TipoParada.ABASTECIMENTO,
            nome: 'Posto Shell',
            tipoCombustivel: TipoCombustivel.GASOLINA_COMUM,
            quantidade: 50,
            precoPorLitro: 5.50
        });

        await component.onSalvar();

        expect(mockParadasService.criarParada).toHaveBeenCalled();
        expect(component.paradaSalva.emit).toHaveBeenCalled();
    });

    it('deve emitir evento ao cancelar', () => {
        spyOn(component.cancelar, 'emit');

        component.onCancelar();

        expect(component.cancelar.emit).toHaveBeenCalled();
    });

    it('deve retornar mensagem de erro apropriada', () => {
        const nomeControl = component.paradaForm.get('nome');
        nomeControl?.markAsTouched();
        nomeControl?.setErrors({ required: true });

        expect(component.getErrorMessage('nome')).toBe('Este campo é obrigatório');

        nomeControl?.setErrors({ minlength: { requiredLength: 2, actualLength: 1 } });
        expect(component.getErrorMessage('nome')).toBe('Mínimo de 2 caracteres');
    });

    it('deve verificar se campo tem erro', () => {
        const nomeControl = component.paradaForm.get('nome');

        expect(component.hasError('nome')).toBeFalsy();

        nomeControl?.markAsTouched();
        nomeControl?.setErrors({ required: true });

        expect(component.hasError('nome')).toBeTruthy();
    });

    it('deve retornar ícone correto para tipo de parada', () => {
        expect(component.getTipoIcon(TipoParada.ABASTECIMENTO)).toBe('local_gas_station');
        expect(component.getTipoIcon(TipoParada.REFEICAO)).toBe('restaurant');
        expect(component.getTipoIcon(TipoParada.PONTO_INTERESSE)).toBe('place');
    });

    it('deve retornar label correto para tipo de parada', () => {
        expect(component.getTipoLabel(TipoParada.ABASTECIMENTO)).toBe('Abastecimento');
        expect(component.getTipoLabel(TipoParada.REFEICAO)).toBe('Refeição');
        expect(component.getTipoLabel(TipoParada.PONTO_INTERESSE)).toBe('Ponto de Interesse');
    });
});