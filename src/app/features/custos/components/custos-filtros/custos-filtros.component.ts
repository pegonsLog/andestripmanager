import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { Observable, BehaviorSubject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { CategoriaCusto, Custo, RelatorioCustos } from '../../../../models';
import { CustosService } from '../../../../services/custos.service';

/**
 * Interface para filtros de custos
 */
export interface FiltrosCustos {
    categoria?: CategoriaCusto;
    tipo?: 'planejado' | 'real';
    dataInicio?: string;
    dataFim?: string;
    valorMinimo?: number;
    valorMaximo?: number;
    descricao?: string;
}

/**
 * Componente para filtros e exportação de custos
 * Permite filtrar custos por período, categoria e exportar dados
 */
@Component({
    selector: 'app-custos-filtros',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatCardModule,
        MatFormFieldModule,
        MatSelectModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatChipsModule,
        MatProgressSpinnerModule
    ],
    templateUrl: './custos-filtros.component.html',
    styleUrls: ['./custos-filtros.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustosFiltrosComponent implements OnInit {
    @Input() viagemId!: string;
    @Input() custos: Custo[] = [];
    @Output() filtrosAplicados = new EventEmitter<FiltrosCustos>();
    @Output() exportarSolicitado = new EventEmitter<'json' | 'csv'>();
    @Output() uploadComprovante = new EventEmitter<{ custoId: string, arquivo: File }>();

    private fb = inject(FormBuilder);
    private custosService = inject(CustosService);
    private snackBar = inject(MatSnackBar);

    filtrosForm!: FormGroup;
    isExportando$ = new BehaviorSubject<boolean>(false);
    filtrosAtivos$ = new BehaviorSubject<FiltrosCustos>({});

    // Enums para o template
    categorias = Object.values(CategoriaCusto);
    tiposCusto = [
        { value: 'planejado', label: 'Planejado' },
        { value: 'real', label: 'Real' }
    ];

    // Labels das categorias
    categoriasLabels = {
        [CategoriaCusto.COMBUSTIVEL]: 'Combustível',
        [CategoriaCusto.HOSPEDAGEM]: 'Hospedagem',
        [CategoriaCusto.ALIMENTACAO]: 'Alimentação',
        [CategoriaCusto.MANUTENCAO]: 'Manutenção',
        [CategoriaCusto.PEDAGIO]: 'Pedágio',
        [CategoriaCusto.SEGURO]: 'Seguro',
        [CategoriaCusto.OUTROS]: 'Outros'
    };

    ngOnInit(): void {
        this.inicializarFormulario();
        this.configurarFiltrosReativos();
    }

    /**
     * Inicializa o formulário de filtros
     */
    private inicializarFormulario(): void {
        this.filtrosForm = this.fb.group({
            categoria: [''],
            tipo: [''],
            dataInicio: [''],
            dataFim: [''],
            valorMinimo: [''],
            valorMaximo: [''],
            descricao: ['']
        });
    }

    /**
     * Configura filtros reativos
     */
    private configurarFiltrosReativos(): void {
        this.filtrosForm.valueChanges
            .pipe(
                debounceTime(300),
                distinctUntilChanged()
            )
            .subscribe(valores => {
                this.aplicarFiltros(valores);
            });
    }

    /**
     * Aplica os filtros
     */
    private aplicarFiltros(valores: any): void {
        const filtros: FiltrosCustos = {};

        if (valores.categoria) filtros.categoria = valores.categoria;
        if (valores.tipo) filtros.tipo = valores.tipo;
        if (valores.dataInicio) filtros.dataInicio = this.formatarData(valores.dataInicio);
        if (valores.dataFim) filtros.dataFim = this.formatarData(valores.dataFim);
        if (valores.valorMinimo) filtros.valorMinimo = parseFloat(valores.valorMinimo);
        if (valores.valorMaximo) filtros.valorMaximo = parseFloat(valores.valorMaximo);
        if (valores.descricao) filtros.descricao = valores.descricao.trim();

        this.filtrosAtivos$.next(filtros);
        this.filtrosAplicados.emit(filtros);
    }

    /**
     * Limpa todos os filtros
     */
    limparFiltros(): void {
        this.filtrosForm.reset();
        this.filtrosAtivos$.next({});
        this.filtrosAplicados.emit({});
    }

    /**
     * Exporta custos em formato JSON
     */
    async exportarJSON(): Promise<void> {
        if (!this.viagemId) {
            this.snackBar.open('ID da viagem não encontrado', 'Fechar', {
                duration: 3000,
                panelClass: ['error-snackbar']
            });
            return;
        }

        this.isExportando$.next(true);

        try {
            // Gerar relatório completo
            const relatorio = await this.custosService.gerarRelatorio(this.viagemId).toPromise();

            if (!relatorio) {
                throw new Error('Erro ao gerar relatório');
            }

            // Preparar dados para exportação
            const dadosExportacao = {
                relatorio,
                custos: this.custos,
                filtrosAplicados: this.filtrosAtivos$.value,
                dataExportacao: new Date().toISOString(),
                versao: '1.0'
            };

            // Criar e baixar arquivo
            const blob = new Blob([JSON.stringify(dadosExportacao, null, 2)], {
                type: 'application/json'
            });

            this.baixarArquivo(blob, `custos-viagem-${this.viagemId}.json`);

            this.snackBar.open('Dados exportados com sucesso!', 'Fechar', {
                duration: 3000,
                panelClass: ['success-snackbar']
            });

            this.exportarSolicitado.emit('json');

        } catch (error) {
            console.error('Erro ao exportar JSON:', error);
            this.snackBar.open('Erro ao exportar dados. Tente novamente.', 'Fechar', {
                duration: 3000,
                panelClass: ['error-snackbar']
            });
        } finally {
            this.isExportando$.next(false);
        }
    }

    /**
     * Exporta custos em formato CSV
     */
    async exportarCSV(): Promise<void> {
        if (!this.custos.length) {
            this.snackBar.open('Nenhum custo para exportar', 'Fechar', {
                duration: 3000,
                panelClass: ['error-snackbar']
            });
            return;
        }

        this.isExportando$.next(true);

        try {
            // Cabeçalhos do CSV
            const headers = [
                'Data',
                'Categoria',
                'Descrição',
                'Valor (R$)',
                'Tipo',
                'Local',
                'Método Pagamento',
                'Observações'
            ];

            // Converter custos para linhas CSV
            const linhas = this.custos.map(custo => [
                this.formatarDataExibicao(custo.data),
                this.categoriasLabels[custo.categoria] || custo.categoria,
                custo.descricao,
                custo.valor.toFixed(2).replace('.', ','),
                custo.tipo === 'real' ? 'Real' : 'Planejado',
                custo.local || '',
                custo.metodoPagamento || '',
                custo.observacoes || ''
            ]);

            // Criar conteúdo CSV
            const csvContent = [
                headers.join(';'),
                ...linhas.map(linha => linha.map(campo => `"${campo}"`).join(';'))
            ].join('\n');

            // Adicionar BOM para UTF-8
            const bom = '\uFEFF';
            const blob = new Blob([bom + csvContent], {
                type: 'text/csv;charset=utf-8'
            });

            this.baixarArquivo(blob, `custos-viagem-${this.viagemId}.csv`);

            this.snackBar.open('CSV exportado com sucesso!', 'Fechar', {
                duration: 3000,
                panelClass: ['success-snackbar']
            });

            this.exportarSolicitado.emit('csv');

        } catch (error) {
            console.error('Erro ao exportar CSV:', error);
            this.snackBar.open('Erro ao exportar CSV. Tente novamente.', 'Fechar', {
                duration: 3000,
                panelClass: ['error-snackbar']
            });
        } finally {
            this.isExportando$.next(false);
        }
    }

    /**
     * Manipula upload de comprovante
     */
    onFileSelected(event: Event, custoId: string): void {
        const input = event.target as HTMLInputElement;
        if (!input.files || input.files.length === 0) return;

        const arquivo = input.files[0];

        // Validar tipo de arquivo
        const tiposPermitidos = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
        if (!tiposPermitidos.includes(arquivo.type)) {
            this.snackBar.open('Tipo de arquivo não permitido. Use JPG, PNG ou PDF.', 'Fechar', {
                duration: 3000,
                panelClass: ['error-snackbar']
            });
            return;
        }

        // Validar tamanho (5MB)
        const tamanhoMaximo = 5 * 1024 * 1024;
        if (arquivo.size > tamanhoMaximo) {
            this.snackBar.open('Arquivo muito grande. Máximo 5MB.', 'Fechar', {
                duration: 3000,
                panelClass: ['error-snackbar']
            });
            return;
        }

        this.uploadComprovante.emit({ custoId, arquivo });
    }

    /**
     * Baixa arquivo
     */
    private baixarArquivo(blob: Blob, nomeArquivo: string): void {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = nomeArquivo;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }

    /**
     * Formata data para string ISO
     */
    private formatarData(data: Date): string {
        return data.toISOString().split('T')[0];
    }

    /**
     * Formata data para exibição
     */
    private formatarDataExibicao(data: string): string {
        return new Date(data).toLocaleDateString('pt-BR');
    }

    /**
     * Obtém label da categoria
     */
    obterLabelCategoria(categoria: CategoriaCusto): string {
        return this.categoriasLabels[categoria] || categoria;
    }

    /**
     * Verifica se há filtros ativos
     */
    temFiltrosAtivos(): boolean {
        const filtros = this.filtrosAtivos$.value;
        return Object.keys(filtros).length > 0;
    }

    /**
     * Conta filtros ativos
     */
    contarFiltrosAtivos(): number {
        const filtros = this.filtrosAtivos$.value;
        return Object.keys(filtros).filter(key => {
            const valor = filtros[key as keyof FiltrosCustos];
            return valor !== undefined && valor !== null && valor !== '';
        }).length;
    }

    /**
     * Valida período de datas
     */
    validarPeriodo(): boolean {
        const dataInicio = this.filtrosForm.get('dataInicio')?.value;
        const dataFim = this.filtrosForm.get('dataFim')?.value;

        if (dataInicio && dataFim) {
            return new Date(dataInicio) <= new Date(dataFim);
        }

        return true;
    }

    /**
     * Valida valores monetários
     */
    validarValores(): boolean {
        const valorMinimo = this.filtrosForm.get('valorMinimo')?.value;
        const valorMaximo = this.filtrosForm.get('valorMaximo')?.value;

        if (valorMinimo && valorMaximo) {
            return parseFloat(valorMinimo) <= parseFloat(valorMaximo);
        }

        return true;
    }

    /**
     * Obtém mensagem de erro de validação
     */
    obterMensagemErro(): string {
        if (!this.validarPeriodo()) {
            return 'Data de início deve ser anterior à data de fim';
        }
        if (!this.validarValores()) {
            return 'Valor mínimo deve ser menor que o valor máximo';
        }
        return '';
    }

    /**
     * Formata valor monetário
     */
    formatarMoeda(valor: number): string {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(valor);
    }

    /**
     * Formata data para exibição
     */
    formatarDataExibicao(data: string): string {
        return new Date(data).toLocaleDateString('pt-BR');
    }

    /**
     * Trackby function para performance
     */
    trackByCusto(index: number, custo: Custo): string {
        return custo.id || index.toString();
    }
}