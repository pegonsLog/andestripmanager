import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { OpcoesExportacao, OPCOES_EXPORTACAO_PADRAO } from './exportacao.service';
import { Viagem } from '../../models';

/**
 * Interface para dados passados para o dialog
 */
export interface DadosExportacaoDialog {
    viagem?: Viagem;
    viagens?: Viagem[];
    tipoExportacao: 'unica' | 'multiplas' | 'todas';
}

/**
 * Interface para resultado do dialog
 */
export interface ResultadoExportacaoDialog {
    opcoes: OpcoesExportacao;
    confirmar: boolean;
}

@Component({
    selector: 'app-exportacao-dialog',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatCheckboxModule,
        MatRadioModule,
        MatCardModule,
        MatIconModule,
        MatDividerModule,
        MatProgressSpinnerModule
    ],
    templateUrl: './exportacao-dialog.component.html',
    styleUrls: ['./exportacao-dialog.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExportacaoDialogComponent {
    form: FormGroup;
    isProcessing = false;

    constructor(
        private fb: FormBuilder,
        private dialogRef: MatDialogRef<ExportacaoDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: DadosExportacaoDialog
    ) {
        this.form = this.criarFormulario();
    }

    /**
     * Cria o formulário com opções de exportação
     */
    private criarFormulario(): FormGroup {
        return this.fb.group({
            // Dados a incluir
            incluirDias: [OPCOES_EXPORTACAO_PADRAO.incluirDias],
            incluirParadas: [OPCOES_EXPORTACAO_PADRAO.incluirParadas],
            incluirHospedagens: [OPCOES_EXPORTACAO_PADRAO.incluirHospedagens],
            incluirCustos: [OPCOES_EXPORTACAO_PADRAO.incluirCustos],
            incluirManutencoes: [OPCOES_EXPORTACAO_PADRAO.incluirManutencoes],
            incluirClima: [OPCOES_EXPORTACAO_PADRAO.incluirClima],
            incluirDiario: [OPCOES_EXPORTACAO_PADRAO.incluirDiario],
            incluirFotos: [OPCOES_EXPORTACAO_PADRAO.incluirFotos],

            // Formatação
            formatoData: [OPCOES_EXPORTACAO_PADRAO.formatoData],
            incluirMetadados: [OPCOES_EXPORTACAO_PADRAO.incluirMetadados]
        });
    }

    /**
     * Obtém título do dialog baseado no tipo de exportação
     */
    get tituloDialog(): string {
        switch (this.data.tipoExportacao) {
            case 'unica':
                return `Exportar Viagem: ${this.data.viagem?.nome}`;
            case 'multiplas':
                return `Exportar ${this.data.viagens?.length} Viagens Selecionadas`;
            case 'todas':
                return 'Exportar Todas as Viagens';
            default:
                return 'Exportar Dados';
        }
    }

    /**
     * Obtém descrição do dialog
     */
    get descricaoDialog(): string {
        switch (this.data.tipoExportacao) {
            case 'unica':
                return 'Selecione quais dados deseja incluir na exportação desta viagem.';
            case 'multiplas':
                return 'Selecione quais dados deseja incluir na exportação das viagens selecionadas.';
            case 'todas':
                return 'Selecione quais dados deseja incluir na exportação de todas as suas viagens.';
            default:
                return 'Configure as opções de exportação.';
        }
    }

    /**
     * Seleciona todas as opções
     */
    selecionarTudo(): void {
        this.form.patchValue({
            incluirDias: true,
            incluirParadas: true,
            incluirHospedagens: true,
            incluirCustos: true,
            incluirManutencoes: true,
            incluirClima: true,
            incluirDiario: true,
            incluirFotos: true
        });
    }

    /**
     * Desmarca todas as opções
     */
    desmarcarTudo(): void {
        this.form.patchValue({
            incluirDias: false,
            incluirParadas: false,
            incluirHospedagens: false,
            incluirCustos: false,
            incluirManutencoes: false,
            incluirClima: false,
            incluirDiario: false,
            incluirFotos: false
        });
    }

    /**
     * Restaura opções padrão
     */
    restaurarPadrao(): void {
        this.form.patchValue({
            incluirDias: OPCOES_EXPORTACAO_PADRAO.incluirDias,
            incluirParadas: OPCOES_EXPORTACAO_PADRAO.incluirParadas,
            incluirHospedagens: OPCOES_EXPORTACAO_PADRAO.incluirHospedagens,
            incluirCustos: OPCOES_EXPORTACAO_PADRAO.incluirCustos,
            incluirManutencoes: OPCOES_EXPORTACAO_PADRAO.incluirManutencoes,
            incluirClima: OPCOES_EXPORTACAO_PADRAO.incluirClima,
            incluirDiario: OPCOES_EXPORTACAO_PADRAO.incluirDiario,
            incluirFotos: OPCOES_EXPORTACAO_PADRAO.incluirFotos,
            formatoData: OPCOES_EXPORTACAO_PADRAO.formatoData,
            incluirMetadados: OPCOES_EXPORTACAO_PADRAO.incluirMetadados
        });
    }

    /**
     * Verifica se pelo menos uma opção está selecionada
     */
    get temOpcaoSelecionada(): boolean {
        const valores = this.form.value;
        return valores.incluirDias ||
            valores.incluirParadas ||
            valores.incluirHospedagens ||
            valores.incluirCustos ||
            valores.incluirManutencoes ||
            valores.incluirClima ||
            valores.incluirDiario;
    }

    /**
     * Confirma exportação
     */
    confirmar(): void {
        if (!this.temOpcaoSelecionada) {
            return;
        }

        const opcoes: OpcoesExportacao = this.form.value;

        const resultado: ResultadoExportacaoDialog = {
            opcoes,
            confirmar: true
        };

        this.dialogRef.close(resultado);
    }

    /**
     * Cancela exportação
     */
    cancelar(): void {
        const resultado: ResultadoExportacaoDialog = {
            opcoes: OPCOES_EXPORTACAO_PADRAO,
            confirmar: false
        };

        this.dialogRef.close(resultado);
    }
}