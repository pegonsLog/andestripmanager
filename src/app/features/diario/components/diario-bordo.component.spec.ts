import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { DiarioBordoComponent } from './diario-bordo.component';
import { DiarioBordoService } from '../../../services/diario-bordo.service';
import { ViagensService } from '../../../services/viagens.service';
import { DiasViagemService } from '../../../services/dias-viagem.service';

describe('DiarioBordoComponent', () => {
    let component: DiarioBordoComponent;
    let fixture: ComponentFixture<DiarioBordoComponent>;
    let mockDiarioBordoService: jasmine.SpyObj<DiarioBordoService>;
    let mockViagensService: jasmine.SpyObj<ViagensService>;
    let mockDiasViagemService: jasmine.SpyObj<DiasViagemService>;

    beforeEach(async () => {
        const diarioBordoServiceSpy = jasmine.createSpyObj('DiarioBordoService', [
            'listarEntradas',
            'criarEntrada',
            'atualizarEntrada',
            'removerEntrada'
        ]);
        const viagensServiceSpy = jasmine.createSpyObj('ViagensService', ['recuperarPorId']);
        const diasViagemServiceSpy = jasmine.createSpyObj('DiasViagemService', ['recuperarPorViagem']);

        await TestBed.configureTestingModule({
            imports: [
                DiarioBordoComponent,
                ReactiveFormsModule,
                MatSnackBarModule,
                MatDialogModule,
                NoopAnimationsModule
            ],
            providers: [
                { provide: DiarioBordoService, useValue: diarioBordoServiceSpy },
                { provide: ViagensService, useValue: viagensServiceSpy },
                { provide: DiasViagemService, useValue: diasViagemServiceSpy }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(DiarioBordoComponent);
        component = fixture.componentInstance;
        mockDiarioBordoService = TestBed.inject(DiarioBordoService) as jasmine.SpyObj<DiarioBordoService>;
        mockViagensService = TestBed.inject(ViagensService) as jasmine.SpyObj<ViagensService>;
        mockDiasViagemService = TestBed.inject(DiasViagemService) as jasmine.SpyObj<DiasViagemService>;

        // Setup default mocks
        mockViagensService.recuperarPorId.and.returnValue(of(null));
        mockDiasViagemService.recuperarPorViagem.and.returnValue(of([]));
        mockDiarioBordoService.listarEntradas.and.returnValue(of([]));

        component.viagemId = 'test-viagem-id';
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize form with default values', () => {
        expect(component.entradaForm.get('titulo')?.value).toBe('');
        expect(component.entradaForm.get('conteudo')?.value).toBe('');
        expect(component.entradaForm.get('publico')?.value).toBe(false);
        expect(component.entradaForm.get('tags')?.value).toBe('');
    });

    it('should load data on init', () => {
        component.ngOnInit();

        expect(mockViagensService.recuperarPorId).toHaveBeenCalledWith('test-viagem-id');
        expect(mockDiasViagemService.recuperarPorViagem).toHaveBeenCalledWith('test-viagem-id');
        expect(mockDiarioBordoService.listarEntradas).toHaveBeenCalled();
    });

    it('should enter edit mode when creating new entry', () => {
        component.novaEntrada();

        expect(component.isEditMode$.value).toBe(true);
        expect(component.entradaEditando$.value).toBe(null);
    });

    it('should format date correctly', () => {
        const data = '2024-01-15';
        const resultado = component.formatarData(data);

        expect(resultado).toContain('2024');
        expect(resultado).toContain('janeiro');
        expect(resultado).toContain('15');
    });

    it('should track entries by id', () => {
        const entrada = { id: 'test-id' } as any;
        const result = component.trackByEntrada(0, entrada);

        expect(result).toBe('test-id');
    });

    it('should track entries by index when no id', () => {
        const entrada = {} as any;
        const result = component.trackByEntrada(5, entrada);

        expect(result).toBe('5');
    });
});