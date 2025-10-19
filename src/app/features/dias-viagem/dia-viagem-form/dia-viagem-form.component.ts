import { Component, Input, OnInit, OnDestroy, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, BehaviorSubject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { DiaViagem, Viagem, PontoRota } from '../../../models';
import { DiasViagemService } from '../../../services/dias-viagem.service';
import { ViagensService } from '../../../services/viagens.service';
import { AuthService } from '../../../core/services/auth.service';
import { GoogleMapsLoaderService } from '../../../services/google-maps-loader.service';

// Declaração global do Google Maps
declare var google: any;

/**
 * Componente para formulário de criação/edição de dia de viagem
 */
@Component({
    selector: 'app-dia-viagem-form',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatCardModule,
        MatButtonModule,
        MatInputModule,
        MatFormFieldModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatIconModule,
        MatSelectModule,
        MatSnackBarModule,
        MatProgressSpinnerModule,
        MatTooltipModule
    ],
    templateUrl: './dia-viagem-form.component.html',
    styleUrls: ['./dia-viagem-form.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DiaViagemFormComponent implements OnInit, OnDestroy {
    @Input() viagemId?: string;
    @Input() diaId?: string;

    // Serviços injetados
    private fb = inject(FormBuilder);
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private snackBar = inject(MatSnackBar);
    private diasViagemService = inject(DiasViagemService);
    private viagensService = inject(ViagensService);
    private authService = inject(AuthService);
    private googleMapsLoader = inject(GoogleMapsLoaderService);

    // Controle de ciclo de vida
    private destroy$ = new Subject<void>();

    // Estado do componente
    isLoading$ = new BehaviorSubject<boolean>(false);
    isSaving$ = new BehaviorSubject<boolean>(false);
    isEditMode = false;

    // Formulário
    diaForm!: FormGroup;

    // Dados
    diaAtual?: DiaViagem;
    viagemAtual?: Viagem;
    proximoNumeroDia = 1;
    diasDisponiveis: Date[] = [];
    diasJaCadastrados: string[] = [];

    // Opções para selects
    tiposEstrada = [
        { value: 'urbana', label: 'Urbana' },
        { value: 'rodovia', label: 'Rodovia' },
        { value: 'estrada-rural', label: 'Estrada Rural' },
        { value: 'mista', label: 'Mista' }
    ];

    tiposPontoRota = [
        { value: 'waypoint', label: 'Ponto de Passagem', icon: 'location_on' },
        { value: 'parada', label: 'Parada Obrigatória', icon: 'pause_circle' },
        { value: 'referencia', label: 'Referência', icon: 'flag' }
    ];

    ngOnInit(): void {
        this.initializeForm();
        this.loadRouteParams();

        if (this.diaId) {
            this.isEditMode = true;
            this.loadDiaData();
        } else if (this.viagemId) {
            this.loadViagemData();
            this.loadProximoNumeroDia();
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Inicializa o formulário
     */
    private initializeForm(): void {
        this.diaForm = this.fb.group({
            dataDisponivel: [''],
            data: ['', [Validators.required]],
            numeroDia: [1, [Validators.required, Validators.min(1)]],
            origem: ['', [Validators.required, Validators.minLength(2)]],
            destino: ['', [Validators.required, Validators.minLength(2)]],
            distanciaPlanejada: [0, [Validators.required, Validators.min(0.1)]],
            horaPartidaPlanejada: [''],
            horaChegadaPlanejada: [''],
            tempoEstimado: [0, [Validators.min(0)]],
            tipoEstrada: ['rodovia'],
            observacoes: [''],
            pontosRota: this.fb.array([])
        });

        // Quando selecionar um dia disponível, atualiza o campo data
        this.diaForm.get('dataDisponivel')?.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe((data) => {
                if (data) {
                    this.diaForm.patchValue({ data }, { emitEvent: false });
                }
            });

        // Validação customizada para datas sequenciais
        this.diaForm.get('data')?.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => {
                this.validateDataSequencial();
            });
    }

    /**
     * Carrega parâmetros da rota
     */
    private loadRouteParams(): void {
        this.route.params
            .pipe(takeUntil(this.destroy$))
            .subscribe(params => {
                if (params['viagemId']) {
                    this.viagemId = params['viagemId'];
                }
                if (params['diaId']) {
                    this.diaId = params['diaId'];
                }
            });
    }

    /**
     * Carrega dados do dia para edição
     */
    private loadDiaData(): void {
        if (!this.diaId) return;

        this.isLoading$.next(true);

        this.diasViagemService.recuperarPorId(this.diaId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (dia) => {
                    if (dia) {
                        this.diaAtual = dia;
                        this.populateForm(dia);
                    }
                    this.isLoading$.next(false);
                },
                error: (error) => {
                    console.error('Erro ao carregar dia:', error);
                    this.showError('Erro ao carregar dados do dia');
                    this.isLoading$.next(false);
                }
            });
    }

    /**
     * Carrega dados da viagem
     */
    private loadViagemData(): void {
        if (!this.viagemId) return;

        this.viagensService.recuperarPorId(this.viagemId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (viagem) => {
                    if (viagem) {
                        this.viagemAtual = viagem;
                        this.calcularDiasDisponiveis();
                    }
                },
                error: (error) => {
                    console.error('Erro ao carregar viagem:', error);
                }
            });
    }

    /**
     * Carrega o próximo número de dia disponível
     */
    private loadProximoNumeroDia(): void {
        if (!this.viagemId) return;

        this.diasViagemService.listarDiasViagem(this.viagemId)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
                next: (dias) => {
                    this.proximoNumeroDia = dias.length + 1;
                    this.diaForm.patchValue({ numeroDia: this.proximoNumeroDia });
                    
                    // Armazena as datas já cadastradas
                    this.diasJaCadastrados = dias.map(d => d.data);
                    this.calcularDiasDisponiveis();
                },
                error: (error) => {
                    console.error('Erro ao carregar dias existentes:', error);
                }
            });
    }

    /**
     * Calcula os dias disponíveis do período da viagem excluindo os já cadastrados
     */
    private calcularDiasDisponiveis(): void {
        if (!this.viagemAtual) return;

        const dataInicio = new Date(this.viagemAtual.dataInicio);
        const dataFim = new Date(this.viagemAtual.dataFim);
        const dias: Date[] = [];

        // Gera todas as datas do período
        const dataAtual = new Date(dataInicio);
        while (dataAtual <= dataFim) {
            const dataStr = dataAtual.toISOString().split('T')[0];
            
            // Adiciona apenas se não estiver já cadastrada
            if (!this.diasJaCadastrados.includes(dataStr)) {
                dias.push(new Date(dataAtual));
            }
            
            dataAtual.setDate(dataAtual.getDate() + 1);
        }

        this.diasDisponiveis = dias;
    }

    /**
     * Popula o formulário com dados do dia
     */
    private populateForm(dia: DiaViagem): void {
        this.diaForm.patchValue({
            data: new Date(dia.data),
            numeroDia: dia.numeroDia,
            origem: dia.origem,
            destino: dia.destino,
            distanciaPlanejada: dia.distanciaPlanejada,
            horaPartidaPlanejada: dia.horaPartidaPlanejada || '',
            horaChegadaPlanejada: dia.horaChegadaPlanejada || '',
            tempoEstimado: dia.rota?.tempoEstimado || 0,
            tipoEstrada: dia.rota?.tipoEstrada || 'rodovia',
            observacoes: dia.observacoes || ''
        });

        // Carregar pontos da rota se existirem
        if (dia.rota?.pontosRota && dia.rota.pontosRota.length > 0) {
            const pontosOrdenados = [...dia.rota.pontosRota].sort((a, b) => a.ordem - b.ordem);
            pontosOrdenados.forEach(ponto => {
                this.adicionarPontoRota(ponto);
            });
        }
    }

    /**
     * Valida se a data é sequencial em relação aos outros dias
     */
    private async validateDataSequencial(): Promise<void> {
        if (!this.viagemId || !this.diaForm.get('data')?.value) return;

        const dataSelecionada = new Date(this.diaForm.get('data')?.value);
        const numeroDia = this.diaForm.get('numeroDia')?.value;

        try {
            const dias = await this.diasViagemService.listarDiasViagem(this.viagemId).toPromise();

            if (dias) {
                // Filtrar o dia atual se estiver editando
                const outrosDias = this.isEditMode
                    ? dias.filter(d => d.id !== this.diaId)
                    : dias;

                // Verificar se a data já existe
                const dataExiste = outrosDias.some(dia => {
                    const dataDia = new Date(dia.data);
                    return dataDia.toDateString() === dataSelecionada.toDateString();
                });

                if (dataExiste) {
                    this.diaForm.get('data')?.setErrors({ dataJaExiste: true });
                    return;
                }

                // Validar sequência de datas
                const diasOrdenados = outrosDias.sort((a, b) => a.numeroDia - b.numeroDia);

                if (numeroDia > 1) {
                    const diaAnterior = diasOrdenados.find(d => d.numeroDia === numeroDia - 1);
                    if (diaAnterior) {
                        const dataAnterior = new Date(diaAnterior.data);
                        if (dataSelecionada <= dataAnterior) {
                            this.diaForm.get('data')?.setErrors({ dataAnteriorInvalida: true });
                            return;
                        }
                    }
                }

                if (numeroDia < diasOrdenados.length + 1) {
                    const proximoDia = diasOrdenados.find(d => d.numeroDia === numeroDia + 1);
                    if (proximoDia) {
                        const dataProxima = new Date(proximoDia.data);
                        if (dataSelecionada >= dataProxima) {
                            this.diaForm.get('data')?.setErrors({ dataProximaInvalida: true });
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Erro ao validar data sequencial:', error);
        }
    }

    /**
     * Calcula tempo estimado baseado na distância
     */
    onDistanciaChange(): void {
        const distancia = this.diaForm.get('distanciaPlanejada')?.value;
        const tipoEstrada = this.diaForm.get('tipoEstrada')?.value;

        if (distancia && distancia > 0) {
            let velocidadeMedia = 60; // km/h padrão

            switch (tipoEstrada) {
                case 'urbana':
                    velocidadeMedia = 30;
                    break;
                case 'rodovia':
                    velocidadeMedia = 80;
                    break;
                case 'estrada-rural':
                    velocidadeMedia = 50;
                    break;
                case 'mista':
                    velocidadeMedia = 60;
                    break;
            }

            const tempoMinutos = Math.round((distancia / velocidadeMedia) * 60);
            this.diaForm.patchValue({ tempoEstimado: tempoMinutos });
        }
    }

    /**
     * Integração com serviço de geocodificação usando Google Maps API
     */
    async buscarCoordenadas(endereco: string): Promise<[number, number] | undefined> {
        if (!endereco || endereco.trim().length < 2) {
            return undefined;
        }

        try {
            // Verificar se o Google Maps está carregado
            if (typeof google === 'undefined' || !google.maps) {
                console.warn('Google Maps não está carregado. Tentando carregar...');
                await this.googleMapsLoader.load();
            }

            // Usar o Geocoder do Google Maps
            const geocoder = new google.maps.Geocoder();
            
            return new Promise((resolve) => {
                geocoder.geocode({ address: endereco }, (results: any, status: any) => {
                    if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
                        const location = results[0].geometry.location;
                        const lat = location.lat();
                        const lng = location.lng();
                        console.log(`Coordenadas encontradas para "${endereco}":`, lat, lng);
                        resolve([lat, lng]);
                    } else {
                        console.warn(`Geocoding falhou para "${endereco}":`, status);
                        resolve(undefined);
                    }
                });
            });
        } catch (error) {
            console.error('Erro ao buscar coordenadas:', error);
            return undefined;
        }
    }

    /**
     * Salva o dia de viagem
     */
    async onSalvar(): Promise<void> {
        if (this.diaForm.invalid) {
            this.markFormGroupTouched();
            return;
        }

        if (!this.viagemId) {
            this.showError('ID da viagem é obrigatório');
            return;
        }

        const usuarioAtual = this.authService.getCurrentUser();
        if (!usuarioAtual?.id) {
            this.showError('Usuário não autenticado');
            return;
        }

        this.isSaving$.next(true);

        try {
            const formData = this.diaForm.value;

            // Buscar coordenadas para origem e destino
            const coordenadasOrigemm = await this.buscarCoordenadas(formData.origem);
            const coordenadasDestino = await this.buscarCoordenadas(formData.destino);

            // Converter pontos da rota para o formato correto
            const pontosRota: PontoRota[] | undefined = formData.pontosRota && formData.pontosRota.length > 0
                ? formData.pontosRota.map((ponto: any) => ({
                    coordenadas: [ponto.latitude, ponto.longitude] as [number, number],
                    nome: ponto.nome,
                    tipo: ponto.tipo,
                    ordem: ponto.ordem
                }))
                : undefined;

            const dadosDia: Omit<DiaViagem, 'id' | 'criadoEm' | 'atualizadoEm'> = {
                usuarioId: usuarioAtual.id,
                viagemId: this.viagemId,
                data: formData.data.toISOString().split('T')[0],
                numeroDia: formData.numeroDia,
                origem: formData.origem,
                destino: formData.destino,
                distanciaPlanejada: formData.distanciaPlanejada,
                ...(formData.horaPartidaPlanejada ? { horaPartidaPlanejada: formData.horaPartidaPlanejada } : {}),
                ...(formData.horaChegadaPlanejada ? { horaChegadaPlanejada: formData.horaChegadaPlanejada } : {}),
                ...(formData.observacoes && formData.observacoes.trim() ? { observacoes: formData.observacoes.trim() } : {}),
                rota: {
                    ...(coordenadasOrigemm ? { coordenadasOrigemm } : {}),
                    ...(coordenadasDestino ? { coordenadasDestino } : {}),
                    ...(formData.tempoEstimado ? { tempoEstimado: formData.tempoEstimado } : {}),
                    tipoEstrada: formData.tipoEstrada,
                    ...(pontosRota ? { pontosRota } : {})
                }
            };

            if (this.isEditMode && this.diaId) {
                await this.diasViagemService.altera(this.diaId, dadosDia);
                this.showSuccess('Dia atualizado com sucesso!');
            } else {
                await this.diasViagemService.criarDiaViagem(dadosDia);
                this.showSuccess('Dia criado com sucesso!');
            }

            this.voltarParaViagem();
        } catch (error) {
            console.error('Erro ao salvar dia:', error);
            this.showError('Erro ao salvar dia. Tente novamente.');
        } finally {
            this.isSaving$.next(false);
        }
    }

    /**
     * Cancela e volta para a viagem
     */
    onCancelar(): void {
        this.voltarParaViagem();
    }

    /**
     * Volta para a página da viagem
     */
    private voltarParaViagem(): void {
        if (this.viagemId) {
            this.router.navigate(['/viagens', this.viagemId]);
        } else {
            this.router.navigate(['/viagens']);
        }
    }

    /**
     * Marca todos os campos do formulário como touched
     */
    private markFormGroupTouched(): void {
        Object.keys(this.diaForm.controls).forEach(key => {
            const control = this.diaForm.get(key);
            control?.markAsTouched();
        });
    }

    /**
     * Exibe mensagem de sucesso
     */
    private showSuccess(message: string): void {
        this.snackBar.open(message, 'Fechar', {
            duration: 3000,
            panelClass: ['success-snackbar']
        });
    }

    /**
     * Exibe mensagem de erro
     */
    private showError(message: string): void {
        this.snackBar.open(message, 'Fechar', {
            duration: 5000,
            panelClass: ['error-snackbar']
        });
    }

    /**
     * Obtém mensagem de erro para um campo
     */
    getErrorMessage(fieldName: string): string {
        const control = this.diaForm.get(fieldName);

        if (control?.hasError('required')) {
            return 'Este campo é obrigatório';
        }

        if (control?.hasError('min')) {
            return `Valor mínimo: ${control.errors?.['min'].min}`;
        }

        if (control?.hasError('minlength')) {
            return `Mínimo de ${control.errors?.['minlength'].requiredLength} caracteres`;
        }

        if (control?.hasError('dataJaExiste')) {
            return 'Esta data já está sendo usada em outro dia';
        }

        if (control?.hasError('dataAnteriorInvalida')) {
            return 'Data deve ser posterior ao dia anterior';
        }

        if (control?.hasError('dataProximaInvalida')) {
            return 'Data deve ser anterior ao próximo dia';
        }

        return '';
    }

    /**
     * Formata tempo em minutos para exibição
     */
    formatarTempo(minutos: number): string {
        if (!minutos) return '0h 0min';

        const horas = Math.floor(minutos / 60);
        const mins = minutos % 60;

        return `${horas}h ${mins}min`;
    }

    /**
     * Formata data para exibição no seletor
     */
    formatarDataSeletor(data: Date): string {
        const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        
        const diaSemana = diasSemana[data.getDay()];
        const dia = data.getDate().toString().padStart(2, '0');
        const mes = meses[data.getMonth()];
        const ano = data.getFullYear();
        
        return `${diaSemana}, ${dia} ${mes} ${ano}`;
    }

    /**
     * Retorna o FormArray de pontos da rota
     */
    get pontosRota(): FormArray {
        return this.diaForm.get('pontosRota') as FormArray;
    }

    /**
     * Cria um FormGroup para um ponto da rota
     */
    private criarPontoRotaFormGroup(ponto?: PontoRota): FormGroup {
        return this.fb.group({
            nome: [ponto?.nome || '', [Validators.required, Validators.minLength(2)]],
            latitude: [ponto?.coordenadas?.[0] || null, [Validators.required]],
            longitude: [ponto?.coordenadas?.[1] || null, [Validators.required]],
            tipo: [ponto?.tipo || 'waypoint', [Validators.required]],
            ordem: [ponto?.ordem || this.pontosRota.length + 1]
        });
    }

    /**
     * Adiciona um novo ponto à rota
     */
    adicionarPontoRota(ponto?: PontoRota): void {
        this.pontosRota.push(this.criarPontoRotaFormGroup(ponto));
    }

    /**
     * Remove um ponto da rota
     */
    removerPontoRota(index: number): void {
        this.pontosRota.removeAt(index);
        // Reordenar os pontos restantes
        this.pontosRota.controls.forEach((control, i) => {
            control.patchValue({ ordem: i + 1 });
        });
    }

    /**
     * Move um ponto para cima na lista
     */
    moverPontoParaCima(index: number): void {
        if (index === 0) return;
        const ponto = this.pontosRota.at(index);
        this.pontosRota.removeAt(index);
        this.pontosRota.insert(index - 1, ponto);
        // Reordenar
        this.pontosRota.controls.forEach((control, i) => {
            control.patchValue({ ordem: i + 1 });
        });
    }

    /**
     * Move um ponto para baixo na lista
     */
    moverPontoParaBaixo(index: number): void {
        if (index === this.pontosRota.length - 1) return;
        const ponto = this.pontosRota.at(index);
        this.pontosRota.removeAt(index);
        this.pontosRota.insert(index + 1, ponto);
        // Reordenar
        this.pontosRota.controls.forEach((control, i) => {
            control.patchValue({ ordem: i + 1 });
        });
    }

    /**
     * Busca coordenadas para um ponto específico
     */
    async buscarCoordenadasPonto(index: number): Promise<void> {
        const pontoControl = this.pontosRota.at(index);
        const nome = pontoControl.get('nome')?.value;

        if (!nome || nome.trim().length < 2) {
            this.showError('Digite um nome válido para buscar as coordenadas');
            return;
        }

        // Mostrar feedback de carregamento
        this.snackBar.open('Buscando coordenadas...', '', {
            duration: 2000
        });

        try {
            const coords = await this.buscarCoordenadas(nome);
            if (coords) {
                pontoControl.patchValue({
                    latitude: coords[0],
                    longitude: coords[1]
                });
                this.showSuccess(`Coordenadas encontradas: ${coords[0].toFixed(6)}, ${coords[1].toFixed(6)}`);
            } else {
                this.showError('Não foi possível encontrar as coordenadas. Verifique o nome do local ou digite manualmente.');
            }
        } catch (error) {
            console.error('Erro ao buscar coordenadas:', error);
            this.showError('Erro ao buscar coordenadas. Tente novamente ou digite manualmente.');
        }
    }

    /**
     * Retorna o ícone do tipo de ponto
     */
    getTipoPontoIcon(tipo: string): string {
        const tipoPonto = this.tiposPontoRota.find(t => t.value === tipo);
        return tipoPonto?.icon || 'location_on';
    }

    /**
     * Retorna o label do tipo de ponto
     */
    getTipoPontoLabel(tipo: string): string {
        const tipoPonto = this.tiposPontoRota.find(t => t.value === tipo);
        return tipoPonto?.label || tipo;
    }
}