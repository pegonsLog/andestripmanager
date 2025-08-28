import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, Subject, takeUntil, map, startWith, combineLatest } from 'rxjs';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { Hospedagem, TipoHospedagem } from '../../../../models';
import { HospedagensService } from '../../../../services/hospedagens.service';
import { HospedagemCardComponent } from '../hospedagem-card/hospedagem-card.component';
import { HospedagemFormComponent } from '../hospedagem-form/hospedagem-form.component';

@Component({
    selector: 'app-hospedagens-list',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatCardModule,
        MatButtonModule,
        MatIconModule,
        MatSelectModule,
        MatFormFieldModule,
        MatInputModule,
        MatProgressSpinnerModule,
        HospedagemCardComponent
    ],
    templateUrl: './hospedagens-list.component.html',
    styleUrls: ['./hospedagens-list.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class HospedagensListComponent implements OnInit, OnDestroy {
    @Input() viagemId!: string;
    @Input() diaViagemId?: string;
    @Input() showAddButton = true;
    @Input() showFilters = true;

    @Output() hospedagemSelecionada = new EventEmitter<Hospedagem>();
    @Output() novaHospedagem = new EventEmitter<void>();

    private hospedagensService = inject(HospedagensService);
    private dialog = inject(MatDialog);
    private snackBar = inject(MatSnackBar);
    private destroy$ = new Subject<void>();

    hospedagens$!: Observable<Hospedagem[]>;
    hospedagensFiltradas$!: Observable<Hospedagem[]>;
    isLoading = false;

    // Controles de filtro
    filtroTipo = new FormControl<TipoHospedagem | ''>('');
    filtroBusca = new FormControl('');
    filtroAvaliacao = new FormControl<number | ''>('');

    // Opções para filtros
    tiposHospedagem = Object.values(TipoHospedagem);
    avaliacoes = [1, 2, 3, 4, 5];

    ngOnInit(): void {
        this.carregarHospedagens();
        this.configurarFiltros();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private carregarHospedagens(): void {
        this.isLoading = true;

        if (this.diaViagemId) {
            // Carregar hospedagens de um dia específico
            this.hospedagens$ = this.hospedagensService.lista([
                { field: 'diaViagemId', operator: '==', value: this.diaViagemId }
            ]);
        } else {
            // Carregar todas as hospedagens da viagem
            this.hospedagens$ = this.hospedagensService.listarHospedagensViagem(this.viagemId);
        }

        this.hospedagens$.pipe(
            takeUntil(this.destroy$)
        ).subscribe({
            next: () => this.isLoading = false,
            error: (error) => {
                console.error('Erro ao carregar hospedagens:', error);
                this.isLoading = false;
                this.snackBar.open('Erro ao carregar hospedagens', 'Fechar', { duration: 3000 });
            }
        });
    }

    private configurarFiltros(): void {
        this.hospedagensFiltradas$ = combineLatest([
            this.hospedagens$,
            this.filtroTipo.valueChanges.pipe(startWith('')),
            this.filtroBusca.valueChanges.pipe(startWith('')),
            this.filtroAvaliacao.valueChanges.pipe(startWith(''))
        ]).pipe(
            map(([hospedagens, tipo, busca, avaliacao]) => {
                return hospedagens.filter(hospedagem => {
                    // Filtro por tipo
                    if (tipo && hospedagem.tipo !== tipo) {
                        return false;
                    }

                    // Filtro por busca (nome ou endereço)
                    if (busca) {
                        const buscaLower = busca.toLowerCase();
                        const nomeMatch = hospedagem.nome.toLowerCase().includes(buscaLower);
                        const enderecoMatch = hospedagem.endereco.toLowerCase().includes(buscaLower);
                        if (!nomeMatch && !enderecoMatch) {
                            return false;
                        }
                    }

                    // Filtro por avaliação mínima
                    if (avaliacao && (!hospedagem.avaliacao || hospedagem.avaliacao < avaliacao)) {
                        return false;
                    }

                    return true;
                });
            })
        );
    }

    onNovaHospedagem(): void {
        this.novaHospedagem.emit();
    }

    onEditarHospedagem(hospedagem: Hospedagem): void {
        const dialogRef = this.dialog.open(HospedagemFormComponent, {
            width: '800px',
            maxWidth: '95vw',
            data: {
                hospedagem,
                viagemId: this.viagemId,
                diaViagemId: hospedagem.diaViagemId
            }
        });

        dialogRef.componentInstance.hospedagemSalva.subscribe(() => {
            dialogRef.close();
            this.carregarHospedagens();
        });

        dialogRef.componentInstance.cancelar.subscribe(() => {
            dialogRef.close();
        });
    }

    onExcluirHospedagem(hospedagem: Hospedagem): void {
        const confirmacao = confirm(
            `Tem certeza que deseja excluir a hospedagem "${hospedagem.nome}"?\n\nEsta ação não pode ser desfeita.`
        );

        if (confirmacao && hospedagem.id) {
            this.hospedagensService.remove(hospedagem.id).then(() => {
                this.snackBar.open('Hospedagem excluída com sucesso!', 'Fechar', { duration: 3000 });
                this.carregarHospedagens();
            }).catch(error => {
                console.error('Erro ao excluir hospedagem:', error);
                this.snackBar.open('Erro ao excluir hospedagem', 'Fechar', { duration: 3000 });
            });
        }
    }

    onVisualizarHospedagem(hospedagem: Hospedagem): void {
        this.hospedagemSelecionada.emit(hospedagem);
    }

    onVerMapa(hospedagem: Hospedagem): void {
        // Implementar visualização no mapa
        if (hospedagem.coordenadas) {
            const [lat, lng] = hospedagem.coordenadas;
            const url = `https://www.google.com/maps?q=${lat},${lng}`;
            window.open(url, '_blank');
        }
    }

    limparFiltros(): void {
        this.filtroTipo.setValue('');
        this.filtroBusca.setValue('');
        this.filtroAvaliacao.setValue('');
    }

    getTipoHospedagemLabel(tipo: TipoHospedagem): string {
        const labels: Record<TipoHospedagem, string> = {
            [TipoHospedagem.HOTEL]: 'Hotel',
            [TipoHospedagem.POUSADA]: 'Pousada',
            [TipoHospedagem.HOSTEL]: 'Hostel',
            [TipoHospedagem.CAMPING]: 'Camping',
            [TipoHospedagem.CASA_TEMPORADA]: 'Casa de Temporada',
            [TipoHospedagem.APARTAMENTO]: 'Apartamento',
            [TipoHospedagem.OUTROS]: 'Outros'
        };
        return labels[tipo] || tipo;
    }

    calcularCustoTotal(): Observable<number> {
        return this.hospedagensFiltradas$.pipe(
            map(hospedagens => hospedagens.reduce((total, h) => total + h.valorTotal, 0))
        );
    }

    contarHospedagens(): Observable<number> {
        return this.hospedagensFiltradas$.pipe(
            map(hospedagens => hospedagens.length)
        );
    }

    trackByHospedagem(index: number, hospedagem: Hospedagem): string {
        return hospedagem.id || index.toString();
    }
}