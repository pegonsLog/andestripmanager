import { Component, Input, OnInit, OnDestroy, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { Observable, Subject, BehaviorSubject, combineLatest } from 'rxjs';
import { takeUntil, switchMap, map, startWith } from 'rxjs/operators';

import { DiarioBordo, DiarioBordoForm } from '../../../models/diario-bordo.interface';
import { DiarioBordoService } from '../../../services/diario-bordo.service';
import { ViagensService } from '../../../services/viagens.service';
import { DiasViagemService } from '../../../services/dias-viagem.service';
import { Viagem } from '../../../models/viagem.interface';
import { DiaViagem } from '../../../models/dia-viagem.interface';
import { FotoUploadComponent } from './foto-upload.component';
import { GaleriaFotosComponent } from './galeria-fotos.component';

/**
 * Componente principal do diário de bordo
 * Permite criar, editar e visualizar entradas do diário organizadas por dias
 */
@Component({
    selector: 'app-diario-bordo',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatInputModule,
        MatFormFieldModule,
        MatSlideToggleModule,
        MatChipsModule,
        MatTabsModule,
        MatExpansionModule,
        MatDatepickerModule,
        MatNativeDateModule,
        FotoUploadComponent,
        GaleriaFotosComponent
    ],
    templateUrl: './diario-bordo.component.html',
    styleUrls: ['./diario-bordo.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DiarioBordoComponent implements OnInit, OnDestroy {
    @Input() viagemId!: string;
    @Input() diaViagemId?: string;

    private destroy$ = new Subject<void>();
    private fb = inject(FormBuilder);
    private diarioBordoService = inject(DiarioBordoService);
    private viagensService = inject(ViagensService);
    private diasViagemService = inject(DiasViagemService);
    private snackBar = inject(MatSnackBar);
    private dialog = inject(MatDialog);

    // Formulário para nova entrada
    entradaForm: FormGroup;

    // Estado do componente
    isLoading$ = new BehaviorSubject<boolean>(false);
    isEditMode$ = new BehaviorSubject<boolean>(false);
    entradaEditando$ = new BehaviorSubject<DiarioBordo | null>(null);
    mostrarUploadFotos$ = new BehaviorSubject<boolean>(false);
    fotosParaUpload: File[] = [];

    // Dados
    viagem$ = new BehaviorSubject<Viagem | null>(null);
    diasViagem$ = new BehaviorSubject<DiaViagem[]>([]);
    entradas$ = new BehaviorSubject<DiarioBordo[]>([]);
    entradasPorDia$ = new BehaviorSubject<Map<string, DiarioBordo[]>>(new Map());

    // Filtros
    filtroData$ = new BehaviorSubject<string>('');
    filtroTexto$ = new BehaviorSubject<string>('');

    // Dados filtrados
    entradasFiltradas$: Observable<DiarioBordo[]>;

    constructor() {
        this.entradaForm = this.fb.group({
            titulo: [''],
            conteudo: ['', [Validators.required, Validators.minLength(10)]],
            publico: [false],
            tags: [''],
            diaViagemId: ['']
        });

        // Configurar stream de entradas filtradas
        this.entradasFiltradas$ = combineLatest([
            this.entradas$,
            this.filtroData$.pipe(startWith('')),
            this.filtroTexto$.pipe(startWith(''))
        ]).pipe(
            map(([entradas, filtroData, filtroTexto]) => {
                let resultado = entradas;

                // Filtrar por data
                if (filtroData) {
                    resultado = resultado.filter(entrada => entrada.data === filtroData);
                }

                // Filtrar por texto
                if (filtroTexto) {
                    const termo = filtroTexto.toLowerCase();
                    resultado = resultado.filter(entrada =>
                        entrada.titulo?.toLowerCase().includes(termo) ||
                        entrada.conteudo.toLowerCase().includes(termo) ||
                        entrada.tags?.some(tag => tag.toLowerCase().includes(termo))
                    );
                }

                return resultado.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
            })
        );
    }

    ngOnInit(): void {
        if (!this.viagemId) {
            this.snackBar.open('ID da viagem é obrigatório', 'Fechar', { duration: 3000 });
            return;
        }

        this.carregarDados();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Carrega todos os dados necessários para o componente
     */
    private carregarDados(): void {
        this.isLoading$.next(true);

        // Carregar viagem
        this.viagensService.recuperarPorId(this.viagemId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (viagem) => {
                    this.viagem$.next(viagem || null);
                },
                error: (error) => {
                    console.error('Erro ao carregar viagem:', error);
                    this.snackBar.open('Erro ao carregar dados da viagem', 'Fechar', { duration: 3000 });
                }
            });

        // Carregar dias da viagem
        this.diasViagemService.recuperarPorViagem(this.viagemId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (dias) => {
                    this.diasViagem$.next(dias);
                },
                error: (error) => {
                    console.error('Erro ao carregar dias da viagem:', error);
                }
            });

        // Carregar entradas do diário
        this.carregarEntradas();
    }

    /**
     * Carrega as entradas do diário
     */
    private carregarEntradas(): void {
        const filtros = this.diaViagemId
            ? { viagemId: this.viagemId, diaViagemId: this.diaViagemId }
            : { viagemId: this.viagemId };

        this.diarioBordoService.listarEntradas(filtros)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (entradas) => {
                    this.entradas$.next(entradas);
                    this.organizarEntradasPorDia(entradas);
                    this.isLoading$.next(false);
                },
                error: (error) => {
                    console.error('Erro ao carregar entradas do diário:', error);
                    this.snackBar.open('Erro ao carregar entradas do diário', 'Fechar', { duration: 3000 });
                    this.isLoading$.next(false);
                }
            });
    }

    /**
     * Organiza as entradas por dia para facilitar a visualização
     */
    private organizarEntradasPorDia(entradas: DiarioBordo[]): void {
        const entradasPorDia = new Map<string, DiarioBordo[]>();

        entradas.forEach(entrada => {
            const data = entrada.data;
            if (!entradasPorDia.has(data)) {
                entradasPorDia.set(data, []);
            }
            entradasPorDia.get(data)!.push(entrada);
        });

        // Ordenar entradas dentro de cada dia por timestamp de criação
        entradasPorDia.forEach(entradas => {
            entradas.sort((a, b) => {
                const timeA = a.criadoEm?.toMillis() || 0;
                const timeB = b.criadoEm?.toMillis() || 0;
                return timeB - timeA;
            });
        });

        this.entradasPorDia$.next(entradasPorDia);
    }

    /**
     * Inicia o modo de criação de nova entrada
     */
    novaEntrada(): void {
        this.entradaForm.reset({
            titulo: '',
            conteudo: '',
            publico: false,
            tags: '',
            diaViagemId: this.diaViagemId || ''
        });
        this.isEditMode$.next(true);
        this.entradaEditando$.next(null);
    }

    /**
     * Inicia o modo de edição de uma entrada existente
     */
    editarEntrada(entrada: DiarioBordo): void {
        this.entradaForm.patchValue({
            titulo: entrada.titulo || '',
            conteudo: entrada.conteudo,
            publico: entrada.publico,
            tags: entrada.tags?.join(', ') || '',
            diaViagemId: entrada.diaViagemId || ''
        });
        this.isEditMode$.next(true);
        this.entradaEditando$.next(entrada);
    }

    /**
     * Cancela a edição/criação
     */
    cancelarEdicao(): void {
        this.isEditMode$.next(false);
        this.entradaEditando$.next(null);
        this.entradaForm.reset();
        this.fotosParaUpload = [];
    }

    /**
     * Salva a entrada (nova ou editada)
     */
    async salvarEntrada(): Promise<void> {
        if (this.entradaForm.invalid) {
            this.snackBar.open('Preencha todos os campos obrigatórios', 'Fechar', { duration: 3000 });
            return;
        }

        this.isLoading$.next(true);

        try {
            const formValue = this.entradaForm.value;
            const dadosEntrada: DiarioBordoForm = {
                titulo: formValue.titulo?.trim() || undefined,
                conteudo: formValue.conteudo.trim(),
                publico: formValue.publico,
                tags: formValue.tags ? formValue.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag) : [],
                fotos: this.fotosParaUpload.length > 0 ? this.fotosParaUpload : undefined
            };

            const entradaEditando = this.entradaEditando$.value;

            if (entradaEditando) {
                // Atualizar entrada existente
                await this.diarioBordoService.atualizarEntrada(entradaEditando.id!, dadosEntrada);
                this.snackBar.open('Entrada atualizada com sucesso!', 'Fechar', { duration: 3000 });
            } else {
                // Criar nova entrada
                const diaViagemId = formValue.diaViagemId || this.diaViagemId;
                await this.diarioBordoService.criarEntrada(this.viagemId, dadosEntrada, diaViagemId);
                this.snackBar.open('Entrada criada com sucesso!', 'Fechar', { duration: 3000 });
            }

            this.cancelarEdicao();
            this.carregarEntradas();
        } catch (error) {
            console.error('Erro ao salvar entrada:', error);
            this.snackBar.open('Erro ao salvar entrada', 'Fechar', { duration: 3000 });
        } finally {
            this.isLoading$.next(false);
        }
    }

    /**
     * Remove uma entrada do diário
     */
    async removerEntrada(entrada: DiarioBordo): Promise<void> {
        const confirmacao = confirm('Tem certeza que deseja excluir esta entrada? Esta ação não pode ser desfeita.');

        if (!confirmacao) {
            return;
        }

        this.isLoading$.next(true);

        try {
            await this.diarioBordoService.removerEntrada(entrada.id!);
            this.snackBar.open('Entrada removida com sucesso!', 'Fechar', { duration: 3000 });
            this.carregarEntradas();
        } catch (error) {
            console.error('Erro ao remover entrada:', error);
            this.snackBar.open('Erro ao remover entrada', 'Fechar', { duration: 3000 });
        } finally {
            this.isLoading$.next(false);
        }
    }

    /**
     * Aplica filtro por data
     */
    filtrarPorData(data: string): void {
        this.filtroData$.next(data);
    }

    /**
     * Aplica filtro por texto
     */
    filtrarPorTexto(texto: string): void {
        this.filtroTexto$.next(texto);
    }

    /**
     * Limpa todos os filtros
     */
    limparFiltros(): void {
        this.filtroData$.next('');
        this.filtroTexto$.next('');
    }

    /**
     * Formata a data para exibição
     */
    formatarData(data: string): string {
        return new Date(data + 'T00:00:00').toLocaleDateString('pt-BR', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    /**
     * Formata o timestamp para exibição
     */
    formatarTimestamp(timestamp: any): string {
        if (!timestamp) return '';

        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleString('pt-BR');
    }

    /**
     * Obtém o nome do dia da viagem
     */
    obterNomeDiaViagem(diaViagemId: string): string {
        const dias = this.diasViagem$.value;
        const dia = dias.find(d => d.id === diaViagemId);
        return dia ? `Dia ${dia.ordem} - ${dia.cidadeOrigem} → ${dia.cidadeDestino}` : 'Entrada geral';
    }

    /**
     * Verifica se há entradas para uma data específica
     */
    temEntradasNaData(data: string): boolean {
        return this.entradasPorDia$.value.has(data);
    }

    /**
     * Obtém as datas únicas das entradas para o filtro
     */
    obterDatasUnicas(): string[] {
        const entradas = this.entradas$.value;
        const datas = [...new Set(entradas.map(entrada => entrada.data))];
        return datas.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    }

    /**
     * TrackBy function para otimizar a renderização da lista
     */
    trackByEntrada(index: number, entrada: DiarioBordo): string {
        return entrada.id || index.toString();
    }

    /**
     * Expande uma entrada para mostrar o conteúdo completo
     */
    expandirEntrada(entradaId: string): void {
        // Por enquanto, apenas um placeholder - será implementado na próxima versão
        console.log('Expandir entrada:', entradaId);
    }

    /**
     * Abre o modal de upload de fotos
     */
    abrirUploadFotos(): void {
        this.mostrarUploadFotos$.next(true);
    }

    /**
     * Fecha o modal de upload de fotos
     */
    fecharUploadFotos(): void {
        this.mostrarUploadFotos$.next(false);
        this.fotosParaUpload = [];
    }

    /**
     * Manipula as fotos adicionadas pelo componente de upload
     */
    onFotosAdicionadas(fotos: File[]): void {
        this.fotosParaUpload = [...this.fotosParaUpload, ...fotos];
        this.fecharUploadFotos();
        this.snackBar.open(`${fotos.length} foto(s) adicionada(s)`, 'Fechar', { duration: 2000 });
    }

    /**
     * Remove uma foto da lista de upload
     */
    removerFotoUpload(indice: number): void {
        this.fotosParaUpload.splice(indice, 1);
    }

    /**
     * Remove uma foto de uma entrada existente
     */
    async removerFotoEntrada(entrada: DiarioBordo, indice: number): Promise<void> {
        if (!entrada.fotos || indice >= entrada.fotos.length) {
            return;
        }

        const fotoUrl = entrada.fotos[indice];

        try {
            await this.diarioBordoService.removerFoto(entrada.id!, fotoUrl);
            this.snackBar.open('Foto removida com sucesso!', 'Fechar', { duration: 2000 });
            this.carregarEntradas();
        } catch (error) {
            console.error('Erro ao remover foto:', error);
            this.snackBar.open('Erro ao remover foto', 'Fechar', { duration: 3000 });
        }
    }

    /**
     * Converte fotos para o formato esperado pela galeria
     */
    converterFotosParaGaleria(fotos: string[]): any[] {
        return fotos.map(url => ({
            url,
            nome: 'Foto do diário',
            data: new Date().toLocaleDateString('pt-BR')
        }));
    }
}