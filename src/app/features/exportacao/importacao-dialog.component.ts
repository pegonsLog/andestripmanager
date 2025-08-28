import { Component, Inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatStepperModule } from '@angular/material/stepper';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import {
    ImportacaoService,
    OpcoesImportacao,
    OPCOES_IMPORTACAO_PADRAO,
    ResultadoValidacaoImportacao,
    ResultadoImportacao
} from './importacao.service';
import { finalize } from 'rxjs';

/**
 * Interface para dados passados para o dialog
 */
export interface DadosImportacaoDialog {
    arquivo: File;
}

/**
 * Interface para resultado do dialog
 */
export interface ResultadoImportacaoDialog {
    sucesso: boolean;
    resultado?: ResultadoImportacao;
}

@Component({
    selector: 'app-importacao-dialog',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatButtonModule,
        MatCheckboxModule,
        MatCardModule,
        MatIconModule,
        MatDividerModule,
        MatProgressSpinnerModule,
        MatStepperModule,
        MatListModule,
        MatChipsModule
    ],
    templateUrl: './importacao-dialog.component.html',
    styleUrls: ['./importacao-dialog.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImportacaoDialogComponent {
    form: FormGroup;
    isValidando = false;
    isImportando = false;
    validacao: ResultadoValidacaoImportacao | null = null;
    resultado: ResultadoImportacao | null = null;
    etapaAtual = 0; // 0: validação, 1: opções, 2: resultado

    constructor(
        private fb: FormBuilder,
        private importacaoService: ImportacaoService,
        private dialogRef: MatDialogRef<ImportacaoDialogComponent>,
        private cdr: ChangeDetectorRef,
        @Inject(MAT_DIALOG_DATA) public data: DadosImportacaoDialog
    ) {
        this.form = this.criarFormulario();
        this.validarArquivo();
    }

    /**
     * Cria o formulário com opções de importação
     */
    private criarFormulario(): FormGroup {
        return this.fb.group({
            // Opções de importação
            substituirExistente: [OPCOES_IMPORTACAO_PADRAO.substituirExistente],
            importarDias: [OPCOES_IMPORTACAO_PADRAO.importarDias],
            importarParadas: [OPCOES_IMPORTACAO_PADRAO.importarParadas],
            importarHospedagens: [OPCOES_IMPORTACAO_PADRAO.importarHospedagens],
            importarCustos: [OPCOES_IMPORTACAO_PADRAO.importarCustos],
            importarManutencoes: [OPCOES_IMPORTACAO_PADRAO.importarManutencoes],
            importarClima: [OPCOES_IMPORTACAO_PADRAO.importarClima],
            importarDiario: [OPCOES_IMPORTACAO_PADRAO.importarDiario],
            criarBackupAntes: [OPCOES_IMPORTACAO_PADRAO.criarBackupAntes]
        });
    }

    /**
     * Valida o arquivo selecionado
     */
    private validarArquivo(): void {
        this.isValidando = true;
        this.cdr.detectChanges();

        // Ler arquivo e validar
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const conteudo = e.target?.result as string;
                const dados = JSON.parse(conteudo);

                this.validacao = this.importacaoService.validarDadosImportacao(dados);
                this.isValidando = false;

                if (this.validacao.valido) {
                    this.etapaAtual = 1; // Ir para opções
                }

                this.cdr.detectChanges();
            } catch (error) {
                this.validacao = {
                    valido: false,
                    erros: ['Arquivo JSON inválido ou corrompido'],
                    avisos: []
                };
                this.isValidando = false;
                this.cdr.detectChanges();
            }
        };

        reader.onerror = () => {
            this.validacao = {
                valido: false,
                erros: ['Erro ao ler o arquivo'],
                avisos: []
            };
            this.isValidando = false;
            this.cdr.detectChanges();
        };

        reader.readAsText(this.data.arquivo);
    }

    /**
     * Obtém título do dialog baseado na etapa
     */
    get tituloDialog(): string {
        switch (this.etapaAtual) {
            case 0:
                return 'Validando Arquivo';
            case 1:
                return 'Configurar Importação';
            case 2:
                return this.resultado?.sucesso ? 'Importação Concluída' : 'Erro na Importação';
            default:
                return 'Importar Dados';
        }
    }

    /**
     * Obtém ícone do dialog baseado na etapa
     */
    get iconeDialog(): string {
        switch (this.etapaAtual) {
            case 0:
                return 'hourglass_empty';
            case 1:
                return 'settings';
            case 2:
                return this.resultado?.sucesso ? 'check_circle' : 'error';
            default:
                return 'upload';
        }
    }

    /**
     * Seleciona todas as opções de importação
     */
    selecionarTudo(): void {
        this.form.patchValue({
            importarDias: true,
            importarParadas: true,
            importarHospedagens: true,
            importarCustos: true,
            importarManutencoes: true,
            importarClima: true,
            importarDiario: true
        });
    }

    /**
     * Desmarca todas as opções de importação
     */
    desmarcarTudo(): void {
        this.form.patchValue({
            importarDias: false,
            importarParadas: false,
            importarHospedagens: false,
            importarCustos: false,
            importarManutencoes: false,
            importarClima: false,
            importarDiario: false
        });
    }

    /**
     * Restaura opções padrão
     */
    restaurarPadrao(): void {
        this.form.patchValue({
            substituirExistente: OPCOES_IMPORTACAO_PADRAO.substituirExistente,
            importarDias: OPCOES_IMPORTACAO_PADRAO.importarDias,
            importarParadas: OPCOES_IMPORTACAO_PADRAO.importarParadas,
            importarHospedagens: OPCOES_IMPORTACAO_PADRAO.importarHospedagens,
            importarCustos: OPCOES_IMPORTACAO_PADRAO.importarCustos,
            importarManutencoes: OPCOES_IMPORTACAO_PADRAO.importarManutencoes,
            importarClima: OPCOES_IMPORTACAO_PADRAO.importarClima,
            importarDiario: OPCOES_IMPORTACAO_PADRAO.importarDiario,
            criarBackupAntes: OPCOES_IMPORTACAO_PADRAO.criarBackupAntes
        });
    }

    /**
     * Verifica se pelo menos uma opção está selecionada
     */
    get temOpcaoSelecionada(): boolean {
        const valores = this.form.value;
        return valores.importarDias ||
            valores.importarParadas ||
            valores.importarHospedagens ||
            valores.importarCustos ||
            valores.importarManutencoes ||
            valores.importarClima ||
            valores.importarDiario;
    }

    /**
     * Executa a importação
     */
    executarImportacao(): void {
        if (!this.temOpcaoSelecionada || !this.validacao?.valido) {
            return;
        }

        this.isImportando = true;
        this.cdr.detectChanges();

        const opcoes: OpcoesImportacao = this.form.value;

        // Ler arquivo novamente para importação
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const conteudo = e.target?.result as string;
                const dados = JSON.parse(conteudo);

                // Determinar se é array ou objeto único
                const importacao = Array.isArray(dados)
                    ? this.importacaoService.importarMultiplasViagens(dados, opcoes)
                    : this.importacaoService.importarViagem(dados, opcoes);

                importacao.pipe(
                    finalize(() => {
                        this.isImportando = false;
                        this.etapaAtual = 2;
                        this.cdr.detectChanges();
                    })
                ).subscribe({
                    next: (resultado) => {
                        if (Array.isArray(resultado)) {
                            // Consolidar resultados múltiplos
                            this.resultado = this.consolidarResultados(resultado);
                        } else {
                            this.resultado = resultado;
                        }
                    },
                    error: (error) => {
                        this.resultado = {
                            sucesso: false,
                            estatisticas: {
                                viagensImportadas: 0,
                                diasImportados: 0,
                                paradasImportadas: 0,
                                hospedagensImportadas: 0,
                                custosImportados: 0,
                                manutencoesImportadas: 0,
                                climaImportado: 0,
                                diarioImportado: 0
                            },
                            erros: [error.message],
                            avisos: []
                        };
                    }
                });
            } catch (error) {
                this.resultado = {
                    sucesso: false,
                    estatisticas: {
                        viagensImportadas: 0,
                        diasImportados: 0,
                        paradasImportadas: 0,
                        hospedagensImportadas: 0,
                        custosImportados: 0,
                        manutencoesImportadas: 0,
                        climaImportado: 0,
                        diarioImportado: 0
                    },
                    erros: ['Erro ao processar arquivo'],
                    avisos: []
                };
                this.isImportando = false;
                this.etapaAtual = 2;
                this.cdr.detectChanges();
            }
        };

        reader.readAsText(this.data.arquivo);
    }

    /**
     * Consolida resultados de múltiplas importações
     */
    private consolidarResultados(resultados: ResultadoImportacao[]): ResultadoImportacao {
        const consolidado: ResultadoImportacao = {
            sucesso: resultados.every(r => r.sucesso),
            estatisticas: {
                viagensImportadas: 0,
                diasImportados: 0,
                paradasImportadas: 0,
                hospedagensImportadas: 0,
                custosImportados: 0,
                manutencoesImportadas: 0,
                climaImportado: 0,
                diarioImportado: 0
            },
            erros: [],
            avisos: []
        };

        resultados.forEach(resultado => {
            consolidado.estatisticas.viagensImportadas += resultado.estatisticas.viagensImportadas;
            consolidado.estatisticas.diasImportados += resultado.estatisticas.diasImportados;
            consolidado.estatisticas.paradasImportadas += resultado.estatisticas.paradasImportadas;
            consolidado.estatisticas.hospedagensImportadas += resultado.estatisticas.hospedagensImportadas;
            consolidado.estatisticas.custosImportados += resultado.estatisticas.custosImportados;
            consolidado.estatisticas.manutencoesImportadas += resultado.estatisticas.manutencoesImportadas;
            consolidado.estatisticas.climaImportado += resultado.estatisticas.climaImportado;
            consolidado.estatisticas.diarioImportado += resultado.estatisticas.diarioImportado;

            consolidado.erros.push(...resultado.erros);
            consolidado.avisos.push(...resultado.avisos);
        });

        return consolidado;
    }

    /**
     * Volta para etapa anterior
     */
    voltarEtapa(): void {
        if (this.etapaAtual > 0) {
            this.etapaAtual--;
        }
    }

    /**
     * Fecha o dialog
     */
    fechar(): void {
        const resultado: ResultadoImportacaoDialog = {
            sucesso: this.resultado?.sucesso || false,
            resultado: this.resultado || undefined
        };

        this.dialogRef.close(resultado);
    }

    /**
     * Cancela a importação
     */
    cancelar(): void {
        const resultado: ResultadoImportacaoDialog = {
            sucesso: false
        };

        this.dialogRef.close(resultado);
    }
}