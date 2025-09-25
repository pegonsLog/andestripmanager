import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ChangeDetectionStrategy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, firstValueFrom } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

// Models e Services
import { Viagem, StatusViagem } from '../../../models';
import { ViagensService } from '../../../services/viagens.service';
import { dataFuturaValidator, dataFimValidator } from '../../../models/validators';

@Component({
    selector: 'app-viagem-form',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatCardModule,
        MatButtonModule,
        MatInputModule,
        MatFormFieldModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatSelectModule,
        MatIconModule,
        MatSnackBarModule,
        MatProgressSpinnerModule
    ],
    templateUrl: './viagem-form.component.html',
    styleUrls: ['./viagem-form.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ViagemFormComponent implements OnInit, OnDestroy {
    @Input() viagemId?: string;
    @Input() viagem?: Viagem;
    @Output() viagemSalva = new EventEmitter<Viagem>();
    @Output() cancelar = new EventEmitter<void>();

    private fb = inject(FormBuilder);
    private viagensService = inject(ViagensService);
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private snackBar = inject(MatSnackBar);
    private cdr = inject(ChangeDetectorRef);
    private destroy$ = new Subject<void>();

    viagemForm!: FormGroup;
    isEditMode = false;
    isLoading = false;
    isSaving = false;

    // Opções para o formulário
    statusOptions = [
        { value: StatusViagem.PLANEJADA, label: 'Planejada' },
        { value: StatusViagem.EM_ANDAMENTO, label: 'Em Andamento' },
        { value: StatusViagem.FINALIZADA, label: 'Finalizada' },
        { value: StatusViagem.CANCELADA, label: 'Cancelada' }
    ];

    ngOnInit(): void {
        this.initializeForm();
        this.setupFormValidation();

        // Observa alterações de parâmetros da rota
        this.route.paramMap
            .pipe(takeUntil(this.destroy$))
            .subscribe(params => {
                const routeId = params.get('id');
                this.viagemId = routeId ?? this.viagemId;
                this.isEditMode = !!(this.viagemId || this.viagem);
                if (this.isEditMode) {
                    this.loadViagem();
                }
            });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Inicializa o formulário reativo
     */
    private initializeForm(): void {
        this.viagemForm = this.fb.group({
            nome: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
            descricao: ['', [Validators.maxLength(500)]],
            dataInicio: ['', [Validators.required, dataFuturaValidator]],
            dataFim: ['', [Validators.required]],
            origem: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
            destino: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
            status: [StatusViagem.PLANEJADA, [Validators.required]],
            distanciaTotal: [null, [Validators.min(1)]],
            custoTotal: [null, [Validators.min(0)]],
            observacoes: ['', [Validators.maxLength(1000)]]
        });
    }

    /**
     * Configura validação dinâmica entre datas
     */
    private setupFormValidation(): void {
        // Validação dinâmica da data de fim baseada na data de início
        this.viagemForm.get('dataInicio')?.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe(dataInicio => {
                const dataFimControl = this.viagemForm.get('dataFim');
                if (dataInicio && dataFimControl) {
                    dataFimControl.setValidators([
                        Validators.required,
                        dataFimValidator(dataInicio)
                    ]);
                    dataFimControl.updateValueAndValidity();
                }
            });
    }

    /**
     * Carrega dados da viagem para edição
     */
    private async loadViagem(): Promise<void> {
        if (this.viagem) {
            console.log('[ViagemForm] Populando formulário a partir de @Input viagem');
            this.populateForm(this.viagem);
            return;
        }

        if (!this.viagemId) {
            console.warn('[ViagemForm] viagemId ausente na rota. Interrompendo carga.');
            this.isLoading = false;
            this.cdr.markForCheck();
            return;
        }

        this.isLoading = true;
        this.cdr.markForCheck();
        try {
            console.log('[ViagemForm] Carregando viagem por id:', this.viagemId);
            const viagem = await firstValueFrom(this.viagensService.recuperarPorId(this.viagemId));
            if (viagem) {
                console.log('[ViagemForm] Viagem carregada com sucesso:', viagem.id);
                this.populateForm(viagem);
            } else {
                this.showError('Viagem não encontrada');
                this.router.navigate(['/viagens']);
            }
        } catch (error) {
            console.error('Erro ao carregar viagem:', error);
            this.showError('Erro ao carregar dados da viagem');
        } finally {
            this.isLoading = false;
            this.cdr.markForCheck();
        }
    }

    /**
     * Popula o formulário com dados da viagem
     */
    private populateForm(viagem: Viagem): void {
        const toDate = (val: any): Date | null => {
            if (!val) return null;
            if (val instanceof Date) return val;
            // Firestore Timestamp
            if (val?.toDate) {
                try { return val.toDate(); } catch {}
            }
            // String ISO ou yyyy-MM-dd
            const d = new Date(val);
            return isNaN(d.getTime()) ? null : d;
        };

        const dataInicio = toDate(viagem.dataInicio) ?? viagem.dataInicio;
        const dataFim = toDate(viagem.dataFim) ?? viagem.dataFim;

        this.viagemForm.patchValue({
            nome: viagem.nome,
            descricao: viagem.descricao || '',
            dataInicio,
            dataFim,
            origem: viagem.origem,
            destino: viagem.destino,
            status: viagem.status,
            distanciaTotal: viagem.distanciaTotal || null,
            custoTotal: viagem.custoTotal || null,
            observacoes: viagem.observacoes || ''
        });
        this.cdr.markForCheck();
    }

    /**
     * Salva a viagem (criação ou edição)
     */
    async onSalvar(): Promise<void> {
        // Evita múltiplos envios simultâneos
        if (this.isSaving) {
            return;
        }
        if (this.viagemForm.invalid) {
            this.markFormGroupTouched();
            this.showError('Por favor, corrija os erros no formulário');
            return;
        }

        this.isSaving = true;
        this.cdr.markForCheck();
        try {
            const formData = this.viagemForm.value;

            // Normaliza datas para string ISO (compatível com Firestore e pipes)
            const toIso = (val: any): string | null => {
                if (!val) return null;
                if (val instanceof Date) return val.toISOString();
                if (val?.toDate) {
                    try { return val.toDate().toISOString(); } catch {}
                }
                const d = new Date(val);
                return isNaN(d.getTime()) ? null : d.toISOString();
            };

            const payload: Partial<Viagem> = {
                ...formData,
                dataInicio: toIso(formData.dataInicio) as any,
                dataFim: toIso(formData.dataFim) as any
            };

            if (this.isEditMode && (this.viagemId || this.viagem?.id)) {
                // Edição
                const id = this.viagemId || this.viagem!.id!;
                console.log('[ViagemForm] Salvando (editar) viagem', id, payload);
                await this.viagensService.altera(id, payload);
                this.showSuccess('Viagem atualizada com sucesso!');

                // Emitir evento com dados atualizados
                const viagemAtualizada: Viagem = {
                    ...this.viagem!,
                    ...payload,
                    id
                };
                this.viagemSalva.emit(viagemAtualizada);
            } else {
                // Criação
                console.log('[ViagemForm] Salvando (nova) viagem', payload);
                const novaViagemId = await this.viagensService.criarViagem(payload as any);
                this.showSuccess('Viagem criada com sucesso!');

                // Navegar para detalhes da nova viagem
                this.router.navigate(['/viagens', novaViagemId]);
            }
        } catch (error) {
            console.error('Erro ao salvar viagem:', error);
            this.showError('Erro ao salvar viagem. Tente novamente.');
        } finally {
            this.isSaving = false;
            this.cdr.markForCheck();
        }
    }

    /**
     * Cancela a edição/criação
     */
    onCancelar(): void {
        if (this.viagemForm.dirty) {
            const confirmacao = confirm('Existem alterações não salvas. Deseja realmente cancelar?');
            if (!confirmacao) return;
        }

        this.cancelar.emit();

        if (!this.isEditMode) {
            this.router.navigate(['/viagens']);
        }
    }

    /**
     * Marca todos os campos do formulário como tocados para exibir erros
     */
    private markFormGroupTouched(): void {
        Object.keys(this.viagemForm.controls).forEach(key => {
            const control = this.viagemForm.get(key);
            control?.markAsTouched();
        });
    }

    /**
     * Obtém mensagem de erro para um campo específico
     */
    getErrorMessage(fieldName: string): string {
        const control = this.viagemForm.get(fieldName);
        if (!control || !control.errors || !control.touched) {
            return '';
        }

        const errors = control.errors;

        if (errors['required']) {
            return 'Este campo é obrigatório';
        }
        if (errors['minlength']) {
            return `Mínimo de ${errors['minlength'].requiredLength} caracteres`;
        }
        if (errors['maxlength']) {
            return `Máximo de ${errors['maxlength'].requiredLength} caracteres`;
        }
        if (errors['min']) {
            return `Valor mínimo: ${errors['min'].min}`;
        }
        if (errors['dataPassado']) {
            return errors['dataPassado'].message;
        }
        if (errors['dataFimInvalida']) {
            return errors['dataFimInvalida'].message;
        }

        return 'Campo inválido';
    }

    /**
     * Verifica se um campo tem erro
     */
    hasError(fieldName: string): boolean {
        const control = this.viagemForm.get(fieldName);
        return !!(control && control.errors && control.touched);
    }

    /**
     * Exibe mensagem de sucesso
     */
    private showSuccess(message: string): void {
        this.snackBar.open(message, 'Fechar', {
            duration: 5000,
            panelClass: ['success-snackbar']
        });
    }

    /**
     * Exibe mensagem de erro
     */
    private showError(message: string): void {
        this.snackBar.open(message, 'Fechar', {
            duration: 5000,
            panelClass: ['error-snackbar']
        });
    }

    /**
     * Calcula automaticamente o número de dias
     */
    calcularNumeroDias(): number {
        const dataInicio = this.viagemForm.get('dataInicio')?.value;
        const dataFim = this.viagemForm.get('dataFim')?.value;

        if (!dataInicio || !dataFim) return 0;

        const inicio = new Date(dataInicio);
        const fim = new Date(dataFim);
        const diffTime = Math.abs(fim.getTime() - inicio.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }
}