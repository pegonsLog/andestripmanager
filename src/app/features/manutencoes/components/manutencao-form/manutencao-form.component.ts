import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { Manutencao, ItemManutencao, CategoriaManutencao } from '../../../../models/manutencao.interface';
import { TipoManutencao } from '../../../../models/enums';
import { ManutencoesService } from '../../../../services/manutencoes.service';
import { AuthService } from '../../../../core/services/auth.service';

/**
 * Componente standalone para formulário de manutenção
 * Permite criar e editar manutenções da motocicleta
 */
@Component({
    selector: 'app-manutencao-form',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatCardModule,
        MatButtonModule,
        MatInputModule,
        MatSelectModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatIconModule,
        MatDividerModule,
        MatProgressSpinnerModule
    ],
    templateUrl: './manutencao-form.component.html',
    styleUrls: ['./manutencao-form.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ManutencaoFormComponent implements OnInit, OnDestroy {
    @Input() manutencao?: Manutencao;
    @Input() viagemId?: string;
    @Output() salvar = new EventEmitter<Manutencao>();
    @Output() cancelar = new EventEmitter<void>();

    // Injeção de dependências
    private fb = inject(FormBuilder);
    private manutencoesService = inject(ManutencoesService);
    private authService = inject(AuthService);
    private snackBar = inject(MatSnackBar);

    // Propriedades do componente
    manutencaoForm!: FormGroup;
    isLoading = false;
    isEditMode = false;

    // Enums para o template
    tiposManutencao = Object.values(TipoManutencao);
    categoriasManutencao = Object.values(CategoriaManutencao);

    // Subject para gerenciar unsubscribe
    private destroy$ = new Subject<void>();

    ngOnInit(): void {
        this.isEditMode = !!this.manutencao;
        this.criarFormulario();

        if (this.isEditMode && this.manutencao) {
            this.preencherFormulario(this.manutencao);
        } else {
            this.adicionarChecklistPadrao();
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Cria o formulário reativo com validações
     */
    private criarFormulario(): void {
        this.manutencaoForm = this.fb.group({
            tipo: [TipoManutencao.PREVENTIVA, [Validators.required]],
            descricao: ['', [Validators.required, Validators.minLength(10)]],
            data: [new Date(), [Validators.required]],
            quilometragem: [0, [Validators.required, Validators.min(0)]],
            custo: [0, [Validators.required, Validators.min(0)]],
            local: [''],
            oficina: [''],
            telefoneOficina: [''],
            observacoes: [''],
            proximaManutencaoKm: [0, [Validators.min(0)]],
            proximaManutencaoData: [''],
            itensServicos: this.fb.array([])
        });

        // Observar mudanças no tipo para ajustar checklist
        this.manutencaoForm.get('tipo')?.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe(tipo => {
                if (!this.isEditMode) {
                    this.atualizarChecklistPorTipo(tipo);
                }
            });
    }

    /**
     * Getter para o FormArray de itens/serviços
     */
    get itensServicos(): FormArray {
        return this.manutencaoForm.get('itensServicos') as FormArray;
    }

    /**
     * Cria um FormGroup para um item de manutenção
     */
    private criarItemFormGroup(item?: ItemManutencao): FormGroup {
        return this.fb.group({
            nome: [item?.nome || '', [Validators.required]],
            categoria: [item?.categoria || CategoriaManutencao.OUTROS, [Validators.required]],
            custo: [item?.custo || 0, [Validators.required, Validators.min(0)]],
            quantidade: [item?.quantidade || 1, [Validators.min(1)]],
            marca: [item?.marca || ''],
            observacoes: [item?.observacoes || '']
        });
    }

    /**
     * Adiciona um novo item ao checklist
     */
    adicionarItem(): void {
        this.itensServicos.push(this.criarItemFormGroup());
    }

    /**
     * Remove um item do checklist
     */
    removerItem(index: number): void {
        if (this.itensServicos.length > 1) {
            this.itensServicos.removeAt(index);
            this.calcularCustoTotal();
        }
    }

    /**
     * Adiciona checklist padrão baseado no tipo de manutenção
     */
    private adicionarChecklistPadrao(): void {
        const tipo = this.manutencaoForm.get('tipo')?.value;
        let itens: ItemManutencao[] = [];

        if (this.viagemId) {
            // Manutenção durante viagem - checklist básico
            itens = this.manutencoesService.criarChecklistViagem();
        } else {
            // Manutenção preventiva - checklist completo
            itens = this.manutencoesService.criarChecklistPreventiva();
        }

        // Limpar array atual
        while (this.itensServicos.length !== 0) {
            this.itensServicos.removeAt(0);
        }

        // Adicionar itens do checklist
        itens.forEach(item => {
            this.itensServicos.push(this.criarItemFormGroup(item));
        });
    }

    /**
     * Atualiza o checklist baseado no tipo de manutenção selecionado
     */
    private atualizarChecklistPorTipo(tipo: TipoManutencao): void {
        if (tipo === TipoManutencao.PREVENTIVA) {
            this.adicionarChecklistPadrao();
        } else {
            // Para manutenção corretiva ou emergencial, começar com lista vazia
            while (this.itensServicos.length !== 0) {
                this.itensServicos.removeAt(0);
            }
            this.adicionarItem(); // Adicionar pelo menos um item
        }
    }

    /**
     * Calcula o custo total baseado nos itens
     */
    calcularCustoTotal(): void {
        const custoTotal = this.itensServicos.controls.reduce((total, control) => {
            const custo = control.get('custo')?.value || 0;
            const quantidade = control.get('quantidade')?.value || 1;
            return total + (custo * quantidade);
        }, 0);

        this.manutencaoForm.patchValue({ custo: custoTotal });
    }

    /**
     * Preenche o formulário com dados existentes (modo edição)
     */
    private preencherFormulario(manutencao: Manutencao): void {
        this.manutencaoForm.patchValue({
            tipo: manutencao.tipo,
            descricao: manutencao.descricao,
            data: new Date(manutencao.data),
            quilometragem: manutencao.quilometragem,
            custo: manutencao.custo,
            local: manutencao.local,
            oficina: manutencao.oficina,
            telefoneOficina: manutencao.telefoneOficina,
            observacoes: manutencao.observacoes,
            proximaManutencaoKm: manutencao.proximaManutencaoKm,
            proximaManutencaoData: manutencao.proximaManutencaoData ? new Date(manutencao.proximaManutencaoData) : null
        });

        // Preencher itens/serviços
        manutencao.itensServicos.forEach(item => {
            this.itensServicos.push(this.criarItemFormGroup(item));
        });
    }

    /**
     * Submete o formulário
     */
    async onSubmit(): Promise<void> {
        if (this.manutencaoForm.valid) {
            this.isLoading = true;

            try {
                const usuarioAtual = await this.authService.getCurrentUser();
                if (!usuarioAtual) {
                    throw new Error('Usuário não autenticado');
                }

                const formValue = this.manutencaoForm.value;
                const manutencaoData: Manutencao = {
                    ...formValue,
                    usuarioId: usuarioAtual.id!,
                    viagemId: this.viagemId,
                    data: this.formatarData(formValue.data),
                    proximaManutencaoData: formValue.proximaManutencaoData ?
                        this.formatarData(formValue.proximaManutencaoData) : undefined,
                    itensServicos: formValue.itensServicos
                };

                if (this.isEditMode && this.manutencao?.id) {
                    await this.manutencoesService.altera(this.manutencao.id, manutencaoData);
                    this.snackBar.open('Manutenção atualizada com sucesso!', 'Fechar', { duration: 3000 });
                } else {
                    await this.manutencoesService.novo(manutencaoData);
                    this.snackBar.open('Manutenção registrada com sucesso!', 'Fechar', { duration: 3000 });
                }

                this.salvar.emit(manutencaoData);
            } catch (error) {
                console.error('Erro ao salvar manutenção:', error);
                this.snackBar.open('Erro ao salvar manutenção. Tente novamente.', 'Fechar', { duration: 5000 });
            } finally {
                this.isLoading = false;
            }
        } else {
            this.marcarCamposComoTocados();
            this.snackBar.open('Por favor, preencha todos os campos obrigatórios.', 'Fechar', { duration: 3000 });
        }
    }

    /**
     * Cancela a edição
     */
    onCancelar(): void {
        this.cancelar.emit();
    }

    /**
     * Marca todos os campos como tocados para exibir erros de validação
     */
    private marcarCamposComoTocados(): void {
        Object.keys(this.manutencaoForm.controls).forEach(key => {
            const control = this.manutencaoForm.get(key);
            control?.markAsTouched();
        });

        this.itensServicos.controls.forEach(control => {
            Object.keys(control.value).forEach(key => {
                control.get(key)?.markAsTouched();
            });
        });
    }

    /**
     * Formata data para string no formato ISO
     */
    private formatarData(data: Date): string {
        return data.toISOString().split('T')[0];
    }

    /**
     * Verifica se um campo tem erro
     */
    temErro(campo: string): boolean {
        const control = this.manutencaoForm.get(campo);
        return !!(control && control.invalid && (control.dirty || control.touched));
    }

    /**
     * Obtém a mensagem de erro para um campo
     */
    obterMensagemErro(campo: string): string {
        const control = this.manutencaoForm.get(campo);
        if (control?.errors) {
            if (control.errors['required']) return 'Este campo é obrigatório';
            if (control.errors['minlength']) return `Mínimo de ${control.errors['minlength'].requiredLength} caracteres`;
            if (control.errors['min']) return `Valor mínimo: ${control.errors['min'].min}`;
        }
        return '';
    }

    /**
     * Obtém o label traduzido para tipo de manutenção
     */
    obterLabelTipoManutencao(tipo: TipoManutencao): string {
        const labels = {
            [TipoManutencao.PREVENTIVA]: 'Preventiva',
            [TipoManutencao.CORRETIVA]: 'Corretiva',
            [TipoManutencao.EMERGENCIAL]: 'Emergencial'
        };
        return labels[tipo];
    }

    /**
     * Obtém o label traduzido para categoria de manutenção
     */
    obterLabelCategoriaManutencao(categoria: CategoriaManutencao): string {
        const labels = {
            [CategoriaManutencao.MOTOR]: 'Motor',
            [CategoriaManutencao.FREIOS]: 'Freios',
            [CategoriaManutencao.SUSPENSAO]: 'Suspensão',
            [CategoriaManutencao.PNEUS]: 'Pneus',
            [CategoriaManutencao.ELETRICA]: 'Elétrica',
            [CategoriaManutencao.TRANSMISSAO]: 'Transmissão',
            [CategoriaManutencao.CARROCERIA]: 'Carroceria',
            [CategoriaManutencao.OUTROS]: 'Outros'
        };
        return labels[categoria];
    }
}