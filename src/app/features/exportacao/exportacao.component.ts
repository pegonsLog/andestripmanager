import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { Observable, finalize } from 'rxjs';
import {
    ExportacaoService,
    DadosExportacaoViagem,
    OpcoesExportacao,
    OPCOES_EXPORTACAO_PADRAO
} from './exportacao.service';
import {
    ExportacaoDialogComponent,
    DadosExportacaoDialog,
    ResultadoExportacaoDialog
} from './exportacao-dialog.component';
import {
    ImportacaoService,
    ResultadoImportacao
} from './importacao.service';
import {
    ImportacaoDialogComponent,
    DadosImportacaoDialog,
    ResultadoImportacaoDialog
} from './importacao-dialog.component';
import { LogsDialogComponent } from './logs-dialog.component';
import { ViagensService } from '../../services/viagens.service';
import { Viagem, StatusViagem } from '../../models';

@Component({
    selector: 'app-exportacao',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatCheckboxModule,
        MatProgressSpinnerModule,
        MatSnackBarModule,
        MatDialogModule,
        MatTableModule,
        MatChipsModule
    ],
    templateUrl: './exportacao.component.html',
    styleUrls: ['./exportacao.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExportacaoComponent implements OnInit {
    viagens$: Observable<Viagem[]>;
    viagensSelecionadas = new Set<string>();
    isCarregando = false;
    isExportando = false;

    // Colunas da tabela
    displayedColumns: string[] = ['selecionar', 'nome', 'periodo', 'status', 'acoes'];

    // Enum para template
    StatusViagem = StatusViagem;

    constructor(
        private fb: FormBuilder,
        private viagensService: ViagensService,
        private exportacaoService: ExportacaoService,
        private importacaoService: ImportacaoService,
        private dialog: MatDialog,
        private snackBar: MatSnackBar,
        private cdr: ChangeDetectorRef
    ) {
        this.viagens$ = this.viagensService.listarViagensUsuario();
    }

    ngOnInit(): void {
        this.carregarViagens();
    }

    /**
     * Carrega lista de viagens
     */
    private carregarViagens(): void {
        this.isCarregando = true;
        this.cdr.detectChanges();

        this.viagens$ = this.viagensService.listarViagensUsuario().pipe(
            finalize(() => {
                this.isCarregando = false;
                this.cdr.detectChanges();
            })
        );
    }

    /**
     * Alterna seleção de uma viagem
     */
    alternarSelecaoViagem(viagemId: string): void {
        if (this.viagensSelecionadas.has(viagemId)) {
            this.viagensSelecionadas.delete(viagemId);
        } else {
            this.viagensSelecionadas.add(viagemId);
        }
        this.cdr.detectChanges();
    }

    /**
     * Verifica se viagem está selecionada
     */
    isViagemSelecionada(viagemId: string): boolean {
        return this.viagensSelecionadas.has(viagemId);
    }

    /**
     * Seleciona todas as viagens
     */
    selecionarTodasViagens(viagens: Viagem[]): void {
        if (this.viagensSelecionadas.size === viagens.length) {
            // Se todas estão selecionadas, desmarcar todas
            this.viagensSelecionadas.clear();
        } else {
            // Selecionar todas
            viagens.forEach(viagem => {
                if (viagem.id) {
                    this.viagensSelecionadas.add(viagem.id);
                }
            });
        }
        this.cdr.detectChanges();
    }

    /**
     * Verifica se todas as viagens estão selecionadas
     */
    todasViagensSelecionadas(viagens: Viagem[]): boolean {
        return viagens.length > 0 && this.viagensSelecionadas.size === viagens.length;
    }

    /**
     * Verifica se algumas viagens estão selecionadas
     */
    algumasViagensSelecionadas(): boolean {
        return this.viagensSelecionadas.size > 0;
    }

    /**
     * Exporta uma viagem específica
     */
    exportarViagem(viagem: Viagem): void {
        if (!viagem.id) {
            this.mostrarErro('ID da viagem não encontrado');
            return;
        }

        const dadosDialog: DadosExportacaoDialog = {
            viagem,
            tipoExportacao: 'unica'
        };

        const dialogRef = this.dialog.open(ExportacaoDialogComponent, {
            width: '700px',
            maxWidth: '90vw',
            data: dadosDialog,
            disableClose: true
        });

        dialogRef.afterClosed().subscribe((resultado: ResultadoExportacaoDialog) => {
            if (resultado?.confirmar) {
                this.executarExportacaoUnica(viagem.id!, resultado.opcoes);
            }
        });
    }

    /**
     * Exporta viagens selecionadas
     */
    exportarViagensSelecionadas(): void {
        if (this.viagensSelecionadas.size === 0) {
            this.mostrarErro('Nenhuma viagem selecionada');
            return;
        }

        this.viagens$.subscribe(todasViagens => {
            const viagensSelecionadas = todasViagens.filter(v =>
                v.id && this.viagensSelecionadas.has(v.id)
            );

            const dadosDialog: DadosExportacaoDialog = {
                viagens: viagensSelecionadas,
                tipoExportacao: 'multiplas'
            };

            const dialogRef = this.dialog.open(ExportacaoDialogComponent, {
                width: '700px',
                maxWidth: '90vw',
                data: dadosDialog,
                disableClose: true
            });

            dialogRef.afterClosed().subscribe((resultado: ResultadoExportacaoDialog) => {
                if (resultado?.confirmar) {
                    const ids = Array.from(this.viagensSelecionadas);
                    this.executarExportacaoMultipla(ids, resultado.opcoes);
                }
            });
        });
    }

    /**
     * Exporta todas as viagens
     */
    exportarTodasViagens(): void {
        const dadosDialog: DadosExportacaoDialog = {
            tipoExportacao: 'todas'
        };

        const dialogRef = this.dialog.open(ExportacaoDialogComponent, {
            width: '700px',
            maxWidth: '90vw',
            data: dadosDialog,
            disableClose: true
        });

        dialogRef.afterClosed().subscribe((resultado: ResultadoExportacaoDialog) => {
            if (resultado?.confirmar) {
                this.executarExportacaoTodas(resultado.opcoes);
            }
        });
    }

    /**
     * Executa exportação de uma viagem
     */
    private executarExportacaoUnica(viagemId: string, opcoes: OpcoesExportacao): void {
        this.isExportando = true;
        this.cdr.detectChanges();

        this.exportacaoService.exportarViagemCompleta(viagemId, opcoes).pipe(
            finalize(() => {
                this.isExportando = false;
                this.cdr.detectChanges();
            })
        ).subscribe({
            next: (dados) => {
                this.exportacaoService.gerarArquivoJSON(dados);
                this.mostrarSucesso('Viagem exportada com sucesso!');
            },
            error: (error) => {
                console.error('Erro na exportação:', error);
                this.mostrarErro('Erro ao exportar viagem: ' + error.message);
            }
        });
    }

    /**
     * Executa exportação de múltiplas viagens
     */
    private executarExportacaoMultipla(viagensIds: string[], opcoes: OpcoesExportacao): void {
        this.isExportando = true;
        this.cdr.detectChanges();

        this.exportacaoService.exportarMultiplasViagens(viagensIds, opcoes).pipe(
            finalize(() => {
                this.isExportando = false;
                this.viagensSelecionadas.clear();
                this.cdr.detectChanges();
            })
        ).subscribe({
            next: (dados) => {
                this.exportacaoService.gerarArquivoJSON(dados);
                this.mostrarSucesso(`${dados.length} viagens exportadas com sucesso!`);
            },
            error: (error) => {
                console.error('Erro na exportação múltipla:', error);
                this.mostrarErro('Erro ao exportar viagens: ' + error.message);
            }
        });
    }

    /**
     * Executa exportação de todas as viagens
     */
    private executarExportacaoTodas(opcoes: OpcoesExportacao): void {
        this.isExportando = true;
        this.cdr.detectChanges();

        this.exportacaoService.exportarTodasViagens(opcoes).pipe(
            finalize(() => {
                this.isExportando = false;
                this.cdr.detectChanges();
            })
        ).subscribe({
            next: (dados) => {
                if (dados.length === 0) {
                    this.mostrarInfo('Nenhuma viagem encontrada para exportar');
                    return;
                }

                this.exportacaoService.gerarArquivoJSON(dados);
                this.mostrarSucesso(`Todas as ${dados.length} viagens foram exportadas com sucesso!`);
            },
            error: (error) => {
                console.error('Erro na exportação completa:', error);
                this.mostrarErro('Erro ao exportar todas as viagens: ' + error.message);
            }
        });
    }

    /**
     * Formata período da viagem
     */
    formatarPeriodo(viagem: Viagem): string {
        try {
            const inicio = new Date(viagem.dataInicio).toLocaleDateString('pt-BR');
            const fim = new Date(viagem.dataFim).toLocaleDateString('pt-BR');
            return `${inicio} - ${fim}`;
        } catch {
            return 'Data inválida';
        }
    }

    /**
     * Obtém cor do chip de status
     */
    getCorStatus(status: StatusViagem): string {
        switch (status) {
            case StatusViagem.PLANEJADA:
                return 'primary';
            case StatusViagem.EM_ANDAMENTO:
                return 'accent';
            case StatusViagem.FINALIZADA:
                return 'warn';
            default:
                return '';
        }
    }

    /**
     * Obtém texto do status
     */
    getTextoStatus(status: StatusViagem): string {
        switch (status) {
            case StatusViagem.PLANEJADA:
                return 'Planejada';
            case StatusViagem.EM_ANDAMENTO:
                return 'Em Andamento';
            case StatusViagem.FINALIZADA:
                return 'Finalizada';
            default:
                return status;
        }
    }

    /**
     * Mostra mensagem de sucesso
     */
    private mostrarSucesso(mensagem: string): void {
        this.snackBar.open(mensagem, 'Fechar', {
            duration: 5000,
            panelClass: ['success-snackbar']
        });
    }

    /**
     * Mostra mensagem de erro
     */
    private mostrarErro(mensagem: string): void {
        this.snackBar.open(mensagem, 'Fechar', {
            duration: 7000,
            panelClass: ['error-snackbar']
        });
    }

    /**
     * Mostra mensagem informativa
     */
    private mostrarInfo(mensagem: string): void {
        this.snackBar.open(mensagem, 'Fechar', {
            duration: 4000,
            panelClass: ['info-snackbar']
        });
    }

    /**
     * Abre dialog para seleção de arquivo de importação
     */
    abrirImportacao(): void {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.style.display = 'none';

        input.onchange = (event: any) => {
            const arquivo = event.target.files[0];
            if (arquivo) {
                this.importarArquivo(arquivo);
            }
        };

        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
    }

    /**
     * Importa arquivo selecionado
     */
    private importarArquivo(arquivo: File): void {
        console.log('[INFO] Arquivo selecionado para importação:', arquivo.name);

        // Validar tipo de arquivo
        if (!arquivo.name.toLowerCase().endsWith('.json')) {
            this.mostrarErro('Por favor, selecione um arquivo JSON válido');
            return;
        }

        // Validar tamanho do arquivo (máximo 50MB)
        const tamanhoMaximo = 50 * 1024 * 1024; // 50MB
        if (arquivo.size > tamanhoMaximo) {
            this.mostrarErro('Arquivo muito grande. Tamanho máximo: 50MB');
            return;
        }

        const dadosDialog: DadosImportacaoDialog = {
            arquivo
        };

        const dialogRef = this.dialog.open(ImportacaoDialogComponent, {
            width: '800px',
            maxWidth: '95vw',
            data: dadosDialog,
            disableClose: true
        });

        dialogRef.afterClosed().subscribe((resultado: ResultadoImportacaoDialog) => {
            if (resultado?.sucesso && resultado.resultado) {
                this.processarResultadoImportacao(resultado.resultado);
                this.carregarViagens(); // Recarregar lista de viagens
            }
        });
    }

    /**
     * Processa resultado da importação
     */
    private processarResultadoImportacao(resultado: ResultadoImportacao): void {
        if (resultado.sucesso) {
            const stats = resultado.estatisticas;
            let mensagem = 'Importação concluída com sucesso!';

            if (stats.viagensImportadas > 0) {
                mensagem += ` ${stats.viagensImportadas} viagem(ns) importada(s).`;
            }

            this.mostrarSucesso(mensagem);
            console.log('[SUCESSO] Importação concluída:', stats);
        } else {
            const erros = resultado.erros.join(', ');
            this.mostrarErro('Erro na importação: ' + erros);
            console.error('[ERRO] Falha na importação:', resultado.erros);
        }
    }

    /**
     * Restaura backup
     */
    restaurarBackup(): void {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.style.display = 'none';

        input.onchange = (event: any) => {
            const arquivo = event.target.files[0];
            if (arquivo) {
                this.executarRestauracaoBackup(arquivo);
            }
        };

        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
    }

    /**
     * Executa restauração de backup
     */
    private executarRestauracaoBackup(arquivo: File): void {
        console.log('[INFO] Iniciando restauração de backup:', arquivo.name);

        this.isExportando = true; // Usar mesmo flag para loading
        this.cdr.detectChanges();

        this.importacaoService.restaurarBackup(arquivo).pipe(
            finalize(() => {
                this.isExportando = false;
                this.cdr.detectChanges();
            })
        ).subscribe({
            next: (resultado) => {
                this.processarResultadoImportacao(resultado);
                this.carregarViagens(); // Recarregar lista de viagens
            },
            error: (error) => {
                console.error('Erro na restauração:', error);
                this.mostrarErro('Erro ao restaurar backup: ' + error.message);
            }
        });
    }
}    /**
 
    * Abre dialog de logs de operações
     */
abrirLogs(): void {
    this.dialog.open(LogsDialogComponent, {
        width: '1000px',
        maxWidth: '95vw',
        height: '80vh'
    });
}