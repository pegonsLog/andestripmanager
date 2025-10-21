import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { ViagensService } from '../../../services/viagens.service';
import { 
    formatarData, 
    formatarMoeda, 
    formatarDistancia, 
    formatarTempo,
    formatarPeriodo 
} from '../../../shared/helpers/formatters';

// Interface local para dados do álbum
interface DadosAlbumViagem {
    viagem: any;
    dias: any[];
    paradas: any[];
    hospedagens: any[];
    custos: any[];
    manutencoes: any[];
}

@Component({
    selector: 'app-album-viagem',
    standalone: true,
    imports: [
        CommonModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatCardModule
    ],
    templateUrl: './album-viagem.component.html',
    styleUrl: './album-viagem.component.scss'
})
export class AlbumViagemComponent implements OnInit {
    dados = signal<DadosAlbumViagem | null>(null);
    isLoading = signal<boolean>(true);
    error = signal<string | null>(null);

    // Helpers de formatação disponíveis no template
    formatarData = formatarData;
    formatarMoeda = formatarMoeda;
    formatarDistancia = formatarDistancia;
    formatarTempo = formatarTempo;
    formatarPeriodo = formatarPeriodo;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private viagensService: ViagensService
    ) {}

    async ngOnInit(): Promise<void> {
        const viagemId = this.route.snapshot.paramMap.get('id');
        
        if (!viagemId) {
            this.error.set('ID da viagem não encontrado');
            this.isLoading.set(false);
            return;
        }

        try {
            const dados = await this.viagensService.recuperarDadosCompletosViagem(viagemId);
            this.dados.set(dados);
        } catch (error) {
            console.error('Erro ao carregar dados do álbum:', error);
            this.error.set('Erro ao carregar dados da viagem');
        } finally {
            this.isLoading.set(false);
        }
    }

    voltar(): void {
        this.router.navigate(['/viagens', this.route.snapshot.paramMap.get('id')]);
    }

    imprimir(): void {
        window.print();
    }

    // Métodos auxiliares para o template
    getParadasDoDia(diaId: string): any[] {
        const dados = this.dados();
        if (!dados) return [];
        return dados.paradas.filter(p => p.diaViagemId === diaId);
    }

    getHospedagemDoDia(diaId: string): any | null {
        const dados = this.dados();
        if (!dados) return null;
        return dados.hospedagens.find(h => h.diaViagemId === diaId) || null;
    }

    getCustosDoDia(diaId: string): any[] {
        const dados = this.dados();
        if (!dados) return [];
        return dados.custos.filter(c => c.diaViagemId === diaId);
    }

    getTotalCustosDia(diaId: string): number {
        return this.getCustosDoDia(diaId).reduce((sum, c) => sum + c.valor, 0);
    }

    getTotalCustos(): number {
        const dados = this.dados();
        if (!dados) return 0;
        return dados.custos.reduce((sum, c) => sum + c.valor, 0);
    }

    getDistanciaTotal(): number {
        const dados = this.dados();
        if (!dados) return 0;
        return dados.dias.reduce((sum, d) => sum + (d.distanciaPercorrida || d.distanciaPlanejada || 0), 0);
    }
}
