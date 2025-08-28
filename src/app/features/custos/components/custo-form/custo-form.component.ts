import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';

import { Custo, CategoriaCusto, MetodoPagamento, DiaViagem } from '../../../../models';
import { CustosService } from '../../../../services/custos.service';
import { DiasViagemService } from '../../../../services/dias-viagem.service';
import { Observable } from 'rxjs';

/**
 * Componente para formulário de custos
 * Permite criar e editar custos da viagem com validação monetária
 */
@Component({
    selector: 'app-custo-form',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatButtonModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatIconModule
    ],
    templateUrl: './custo-form.component.html',
    styleUrls: ['./custo-form.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustoFormComponent implements OnInit {
    @Input() viagemId!: string;
    @Input() custo?: Custo;
    @Input() diaViagemId?: string;
    @Output() custoSalvo = new EventEmitter<Custo>();
    @Output() cancelar = new EventEmitter<void>();

    private fb = inject(FormBuilder);
    private custosService = inject(CustosService);
    private diasViagemService = inject(DiasViagemService);
    private snackBar = inject(MatSnackBar);

    custoForm!: FormGroup;
    isEditMode = false;
    isLoading = false;
    diasViagem$!: Observable<DiaViagem[]>;

    // Enums para o template
    categorias = Object.values(CategoriaCusto);
    metodosPagamento = Object.values(MetodoPagamento);

    // Labels das categorias em português
    categoriasLabels = {
        [CategoriaCusto.COMBUSTIVEL]: 'Combustível',
        [CategoriaCusto.HOSPEDAGEM]: 'Hospedagem',
        [CategoriaCusto.ALIMENTACAO]: 'Alimentação',
        [CategoriaCusto.MANUTENCAO]: 'Manutenção',
        [CategoriaCusto.PEDAGIO]: 'Pedágio',
        [CategoriaCusto.SEGURO]: 'Seguro',
        [CategoriaCusto.OUTROS]: 'Outros'
    };

    // Labels dos métodos de pagamento
    metodosLabels = {
        [MetodoPagamento.DINHEIRO]: 'Dinheiro',
        [MetodoPagamento.CARTAO_CREDITO]: 'Cartão de Crédito',
        [MetodoPagamento.CARTAO_DEBITO]: 'Cartão de Débito',
        [MetodoPagamento.PIX]: 'PIX',
        [MetodoPagamento.TRANSFERENCIA]: 'Transferência',
        [MetodoPagamento.OUTROS]: 'Outros'
    };

    ngOnInit(): void {
        this.isEditMode = !!this.custo;
        this.inicializarFormulario();
        this.carregarDiasViagem();
    }

    /**
     * Inicializa o formulário com validações
     */
    private inicializarFormulario(): void {
        this.custoForm = this.fb.group({
            categoria: [this.custo?.categoria || '', [Validators.required]],
            descricao: [this.custo?.descricao || '', [Validators.required, Validators.maxLength(200)]],
            valor: [this.custo?.valor || '', [
                Validators.required,
                Validators.min(0.01),
                Validators.pattern(/^\d+([,]\d{1,2})?$/)
            ]],
            data: [this.custo?.data ? new Date(this.custo.data) : new Date(), [Validators.required]],
            hora: [this.custo?.hora || ''],
            local: [this.custo?.local || '', [Validators.maxLength(100)]],
            metodoPagamento: [this.custo?.metodoPagamento || ''],
            diaViagemId: [this.custo?.diaViagemId || this.diaViagemId || ''],
            observacoes: [this.custo?.observacoes || '', [Validators.maxLength(500)]],
            tipo: [this.custo?.tipo || 'real', [Validators.required]]
        });
    }

    /**
     * Carrega os dias da viagem para seleção
     */
    private carregarDiasViagem(): void {
        if (this.viagemId) {
            this.diasViagem$ = this.diasViagemService.listarDiasViagem(this.viagemId);
        }
    }

    /**
     * Valida se o valor monetário está no formato correto
     */
    validarValorMonetario(): boolean {
        const valor = this.custoForm.get('valor')?.value;
        if (!valor) return false;

        // Aceita formatos: 123,45 ou 123.45 ou 123
        const valorString = valor.toString().replace(',', '.');
        const valorNumerico = parseFloat(valorString);

        return !isNaN(valorNumerico) && valorNumerico > 0;
    }

    /**
     * Converte o valor do formulário para número
     */
    private converterValor(valor: string): number {
        return parseFloat(valor.toString().replace(',', '.'));
    }

    /**
     * Salva o custo
     */
    async onSalvar(): Promise<void> {
        if (this.custoForm.invalid) {
            this.marcarCamposComoTocados();
            this.snackBar.open('Por favor, corrija os erros no formulário', 'Fechar', {
                duration: 3000,
                panelClass: ['error-snackbar']
            });
            return;
        }

        if (!this.validarValorMonetario()) {
            this.snackBar.open('Valor deve ser um número válido maior que zero', 'Fechar', {
                duration: 3000,
                panelClass: ['error-snackbar']
            });
            return;
        }

        this.isLoading = true;

        try {
            const formValue = this.custoForm.value;
            const valorConvertido = this.converterValor(formValue.valor);

            const dadosCusto: Omit<Custo, 'id' | 'criadoEm' | 'atualizadoEm' | 'usuarioId'> = {
                viagemId: this.viagemId,
                categoria: formValue.categoria,
                descricao: formValue.descricao.trim(),
                valor: valorConvertido,
                data: this.formatarData(formValue.data),
                hora: formValue.hora || undefined,
                local: formValue.local?.trim() || undefined,
                metodoPagamento: formValue.metodoPagamento || undefined,
                diaViagemId: formValue.diaViagemId || undefined,
                observacoes: formValue.observacoes?.trim() || undefined,
                tipo: formValue.tipo,
                moeda: 'BRL'
            };

            if (this.isEditMode && this.custo?.id) {
                await this.custosService.atualizar(this.custo.id, dadosCusto);
                this.snackBar.open('Custo atualizado com sucesso!', 'Fechar', {
                    duration: 3000,
                    panelClass: ['success-snackbar']
                });
            } else {
                const id = await this.custosService.criarCusto(dadosCusto);
                const custoSalvo = { ...dadosCusto, id } as Custo;
                this.custoSalvo.emit(custoSalvo);
                this.snackBar.open('Custo salvo com sucesso!', 'Fechar', {
                    duration: 3000,
                    panelClass: ['success-snackbar']
                });
            }

            this.custoForm.reset();
        } catch (error) {
            console.error('Erro ao salvar custo:', error);
            this.snackBar.open('Erro ao salvar custo. Tente novamente.', 'Fechar', {
                duration: 3000,
                panelClass: ['error-snackbar']
            });
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Cancela a edição
     */
    onCancelar(): void {
        this.cancelar.emit();
    }

    /**
     * Marca todos os campos como tocados para exibir erros
     */
    private marcarCamposComoTocados(): void {
        Object.keys(this.custoForm.controls).forEach(key => {
            this.custoForm.get(key)?.markAsTouched();
        });
    }

    /**
     * Formata a data para string ISO
     */
    private formatarData(data: Date): string {
        return data.toISOString().split('T')[0];
    }

    /**
     * Verifica se um campo tem erro
     */
    temErro(campo: string): boolean {
        const control = this.custoForm.get(campo);
        return !!(control && control.invalid && (control.dirty || control.touched));
    }

    /**
     * Obtém a mensagem de erro para um campo
     */
    obterMensagemErro(campo: string): string {
        const control = this.custoForm.get(campo);
        if (!control || !control.errors) return '';

        const errors = control.errors;

        if (errors['required']) return 'Este campo é obrigatório';
        if (errors['maxlength']) return `Máximo de ${errors['maxlength'].requiredLength} caracteres`;
        if (errors['min']) return 'Valor deve ser maior que zero';
        if (errors['pattern']) return 'Formato inválido. Use vírgula para decimais (ex: 123,45)';

        return 'Campo inválido';
    }

    /**
     * Formata o valor monetário no input
     */
    onValorChange(event: any): void {
        let valor = event.target.value;

        // Remove caracteres não numéricos exceto vírgula e ponto
        valor = valor.replace(/[^\d,\.]/g, '');

        // Substitui ponto por vírgula para padronização
        valor = valor.replace('.', ',');

        // Garante apenas uma vírgula
        const partes = valor.split(',');
        if (partes.length > 2) {
            valor = partes[0] + ',' + partes.slice(1).join('');
        }

        // Limita casas decimais a 2
        if (partes[1] && partes[1].length > 2) {
            valor = partes[0] + ',' + partes[1].substring(0, 2);
        }

        this.custoForm.get('valor')?.setValue(valor);
    }
}