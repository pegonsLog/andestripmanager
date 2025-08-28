import { Component, OnInit, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';

import { Manutencao } from '../../../../models/manutencao.interface';
import { ManutencaoFormComponent } from '../manutencao-form/manutencao-form.component';
import { ManutencaoListComponent } from '../manutencao-list/manutencao-list.component';

/**
 * Componente principal para gerenciamento de manutenções
 * Integra o formulário e a lista de manutenções
 */
@Component({
    selector: 'app-manutencoes',
    standalone: true,
    imports: [
        CommonModule,
        MatTabsModule,
        MatButtonModule,
        MatIconModule,
        MatCardModule,
        ManutencaoFormComponent,
        ManutencaoListComponent
    ],
    templateUrl: './manutencoes.component.html',
    styleUrls: ['./manutencoes.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ManutencoesComponent implements OnInit {
    @Input() viagemId?: string;

    // Estado do componente
    mostrarFormulario = false;
    manutencaoEdicao?: Manutencao;
    abaSelecionada = 0;

    ngOnInit(): void {
        // Inicialização se necessária
    }

    /**
     * Mostra o formulário para nova manutenção
     */
    onNovaManutencao(): void {
        this.manutencaoEdicao = undefined;
        this.mostrarFormulario = true;
        this.abaSelecionada = 1; // Aba do formulário
    }

    /**
     * Mostra o formulário para editar manutenção
     */
    onEditarManutencao(manutencao: Manutencao): void {
        this.manutencaoEdicao = manutencao;
        this.mostrarFormulario = true;
        this.abaSelecionada = 1; // Aba do formulário
    }

    /**
     * Cancela a edição e volta para a lista
     */
    onCancelarEdicao(): void {
        this.mostrarFormulario = false;
        this.manutencaoEdicao = undefined;
        this.abaSelecionada = 0; // Aba da lista
    }

    /**
     * Salva a manutenção e volta para a lista
     */
    onSalvarManutencao(manutencao: Manutencao): void {
        this.mostrarFormulario = false;
        this.manutencaoEdicao = undefined;
        this.abaSelecionada = 0; // Aba da lista
    }

    /**
     * Manipula mudança de aba
     */
    onMudancaAba(index: number): void {
        this.abaSelecionada = index;

        if (index === 0) {
            // Voltou para a lista, cancelar edição se houver
            this.mostrarFormulario = false;
            this.manutencaoEdicao = undefined;
        }
    }

    /**
     * Obtém o título da aba do formulário
     */
    obterTituloFormulario(): string {
        return this.manutencaoEdicao ? 'Editar Manutenção' : 'Nova Manutenção';
    }
}