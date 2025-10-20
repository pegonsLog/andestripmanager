import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// Angular Material
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSliderModule } from '@angular/material/slider';

// Models e Services
import {
    Parada,
    TipoParada,
    TipoCombustivel,
    DadosAbastecimento,
    DadosRefeicao,
    DadosPontoInteresse,
    DiaViagem
} from '../../../models';
import { ParadasService } from '../../../services/paradas.service';
import { DiasViagemService } from '../../../services/dias-viagem.service';
import { PhotoUploadComponent, Photo } from '../../../shared/components/photo-upload/photo-upload.component';
import { GoogleMapsLoaderService } from '../../../services/google-maps-loader.service';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
    selector: 'app-parada-form',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatCardModule,
        MatButtonModule,
        MatInputModule,
        MatFormFieldModule,
        MatSelectModule,
        MatIconModule,
        MatSnackBarModule,
        MatProgressSpinnerModule,
        MatCheckboxModule,
        MatChipsModule,
        MatAutocompleteModule,
        MatSliderModule,
        MatTooltipModule,
        PhotoUploadComponent
    ],
    templateUrl: './parada-form.component.html',
    styleUrls: ['./parada-form.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ParadaFormComponent implements OnInit, OnDestroy {
    @Input() paradaId?: string;
    @Input() parada?: Parada;
    @Input() diaViagemId?: string;
    @Input() viagemId!: string;
    @Output() paradaSalva = new EventEmitter<Parada>();
    @Output() cancelar = new EventEmitter<void>();

    private fb = inject(FormBuilder);
    private paradasService = inject(ParadasService);
    private diasViagemService = inject(DiasViagemService);
    private snackBar = inject(MatSnackBar);
    private googleMapsLoader = inject(GoogleMapsLoaderService);
    private destroy$ = new Subject<void>();

    // Lista de dias disponíveis
    diasDisponiveis: DiaViagem[] = [];
    carregandoDias = false;

    paradaForm!: FormGroup;
    isEditMode = false;
    isLoading = false;
    isSaving = false;

    // Fotos da parada
    fotos: Photo[] = [];

    // Enums para templates
    TipoParada = TipoParada;
    TipoCombustivel = TipoCombustivel;

    // Opções para formulários
    tiposParada = [
        { value: TipoParada.ABASTECIMENTO, label: 'Abastecimento', icon: 'local_gas_station' },
        { value: TipoParada.REFEICAO, label: 'Refeição', icon: 'restaurant' },
        { value: TipoParada.PONTO_INTERESSE, label: 'Ponto de Interesse', icon: 'place' },
        { value: TipoParada.DESCANSO, label: 'Descanso', icon: 'hotel' },
        { value: TipoParada.MANUTENCAO, label: 'Manutenção', icon: 'build' }
    ];

    tiposCombustivel = [
        { value: TipoCombustivel.GASOLINA_COMUM, label: 'Gasolina Comum' },
        { value: TipoCombustivel.GASOLINA_ADITIVADA, label: 'Gasolina Aditivada' },
        { value: TipoCombustivel.ETANOL, label: 'Etanol' },
        { value: TipoCombustivel.DIESEL, label: 'Diesel' }
    ];

    tiposRefeicao = [
        { value: 'cafe-manha', label: 'Café da Manhã' },
        { value: 'almoco', label: 'Almoço' },
        { value: 'jantar', label: 'Jantar' },
        { value: 'lanche', label: 'Lanche' }
    ];

    tiposEstabelecimento = [
        { value: 'restaurante', label: 'Restaurante' },
        { value: 'lanchonete', label: 'Lanchonete' },
        { value: 'padaria', label: 'Padaria' },
        { value: 'fast-food', label: 'Fast Food' },
        { value: 'outros', label: 'Outros' }
    ];

    categoriasPontoInteresse = [
        { value: 'turistico', label: 'Turístico' },
        { value: 'historico', label: 'Histórico' },
        { value: 'natural', label: 'Natural' },
        { value: 'cultural', label: 'Cultural' },
        { value: 'religioso', label: 'Religioso' },
        { value: 'comercial', label: 'Comercial' },
        { value: 'outros', label: 'Outros' }
    ];

    ngOnInit(): void {
        this.initializeForm();
        this.setupFormValidation();
        this.carregarDiasViagem();

        if (this.paradaId || this.parada) {
            this.isEditMode = true;
            this.loadParada();
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private async carregarDiasViagem(): Promise<void> {
        if (!this.viagemId) return;
        
        this.carregandoDias = true;
        try {
            this.diasDisponiveis = await this.diasViagemService.listarDiasViagem(this.viagemId).toPromise() || [];
            
            // Se diaViagemId foi fornecido, pré-selecionar
            if (this.diaViagemId) {
                this.paradaForm.patchValue({ diaViagemId: this.diaViagemId });
            }
        } catch (error) {
            console.error('Erro ao carregar dias da viagem:', error);
            this.snackBar.open('Erro ao carregar dias da viagem', 'Fechar', { duration: 3000 });
        } finally {
            this.carregandoDias = false;
        }
    }

    /**
     * Inicializa o formulário reativo
     */
    private initializeForm(): void {
        this.paradaForm = this.fb.group({
            // Seleção do dia
            diaViagemId: ['', [Validators.required]],
            // Campos básicos
            tipo: ['', [Validators.required]],
            nome: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
            endereco: ['', [Validators.maxLength(200)]],
            horaChegada: [''],
            horaSaida: [''],
            custo: [null, [Validators.min(0)]],
            observacoes: ['', [Validators.maxLength(500)]],
            avaliacao: [null, [Validators.min(1), Validators.max(5)]],

            // Coordenadas
            latitude: [null],
            longitude: [null],

            // Campos específicos de abastecimento
            tipoCombustivel: [''],
            quantidade: [null, [Validators.min(0.1)]],
            precoPorLitro: [null, [Validators.min(0.01)]],
            quilometragem: [null, [Validators.min(0)]],
            nomePosto: ['', [Validators.maxLength(100)]],
            bandeiraPosto: ['', [Validators.maxLength(50)]],

            // Campos específicos de refeição
            tipoRefeicao: [''],
            nomeEstabelecimento: ['', [Validators.maxLength(100)]],
            tipoEstabelecimento: [''],
            valorGasto: [null, [Validators.min(0)]],
            numeroPessoas: [1, [Validators.min(1), Validators.max(20)]],
            pratos: [''],
            qualidadeComida: [null, [Validators.min(1), Validators.max(5)]],
            qualidadeAtendimento: [null, [Validators.min(1), Validators.max(5)]],

            // Campos específicos de ponto de interesse
            categoria: [''],
            valorEntrada: [null, [Validators.min(0)]],
            tempoVisita: [null, [Validators.min(1)]],
            horarioFuncionamento: ['', [Validators.maxLength(100)]],
            siteOficial: ['', [Validators.maxLength(200)]],
            telefone: ['', [Validators.maxLength(20)]],
            recomendacoes: [''],
            melhorEpoca: ['', [Validators.maxLength(100)]]
        });
    }

    /**
     * Configura validação dinâmica baseada no tipo de parada
     */
    private setupFormValidation(): void {
        this.paradaForm.get('tipo')?.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe(tipo => {
                this.updateValidationByType(tipo);
            });

        // Calcular valor total do abastecimento automaticamente
        this.paradaForm.get('quantidade')?.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => this.calcularValorTotalAbastecimento());

        this.paradaForm.get('precoPorLitro')?.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => this.calcularValorTotalAbastecimento());
    }

    /**
     * Atualiza validações baseadas no tipo de parada
     */
    private updateValidationByType(tipo: TipoParada): void {
        // Limpar todas as validações específicas
        this.clearSpecificValidations();

        switch (tipo) {
            case TipoParada.ABASTECIMENTO:
                this.setAbastecimentoValidations();
                break;
            case TipoParada.REFEICAO:
                this.setRefeicaoValidations();
                break;
            case TipoParada.PONTO_INTERESSE:
                this.setPontoInteresseValidations();
                break;
        }
    }

    /**
     * Remove validações específicas
     */
    private clearSpecificValidations(): void {
        const specificFields = [
            'tipoCombustivel', 'quantidade', 'precoPorLitro',
            'tipoRefeicao', 'categoria'
        ];

        specificFields.forEach(field => {
            const control = this.paradaForm.get(field);
            if (control) {
                control.clearValidators();
                control.updateValueAndValidity();
            }
        });
    }

    /**
     * Define validações para abastecimento
     */
    private setAbastecimentoValidations(): void {
        this.paradaForm.get('tipoCombustivel')?.setValidators([Validators.required]);
        this.paradaForm.get('quantidade')?.setValidators([Validators.required, Validators.min(0.1)]);
        this.paradaForm.get('precoPorLitro')?.setValidators([Validators.required, Validators.min(0.01)]);

        this.paradaForm.get('tipoCombustivel')?.updateValueAndValidity();
        this.paradaForm.get('quantidade')?.updateValueAndValidity();
        this.paradaForm.get('precoPorLitro')?.updateValueAndValidity();
    }

    /**
     * Define validações para refeição
     */
    private setRefeicaoValidations(): void {
        this.paradaForm.get('tipoRefeicao')?.setValidators([Validators.required]);
        this.paradaForm.get('tipoRefeicao')?.updateValueAndValidity();
    }

    /**
     * Define validações para ponto de interesse
     */
    private setPontoInteresseValidations(): void {
        this.paradaForm.get('categoria')?.setValidators([Validators.required]);
        this.paradaForm.get('categoria')?.updateValueAndValidity();
    }

    /**
     * Calcula valor total do abastecimento
     */
    private calcularValorTotalAbastecimento(): void {
        const quantidade = this.paradaForm.get('quantidade')?.value;
        const precoPorLitro = this.paradaForm.get('precoPorLitro')?.value;

        if (quantidade && precoPorLitro) {
            const valorTotal = quantidade * precoPorLitro;
            this.paradaForm.get('custo')?.setValue(valorTotal, { emitEvent: false });
        }
    }

    /**
     * Carrega dados da parada para edição
     */
    private async loadParada(): Promise<void> {
        if (this.parada) {
            this.populateForm(this.parada);
            return;
        }

        if (!this.paradaId) return;

        this.isLoading = true;
        try {
            this.paradasService.recuperarPorId(this.paradaId)
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                    next: (parada) => {
                        if (parada) {
                            this.populateForm(parada);
                        } else {
                            this.showError('Parada não encontrada');
                        }
                        this.isLoading = false;
                    },
                    error: (error) => {
                        console.error('Erro ao carregar parada:', error);
                        this.showError('Erro ao carregar dados da parada');
                        this.isLoading = false;
                    }
                });
        } catch (error) {
            console.error('Erro ao carregar parada:', error);
            this.showError('Erro ao carregar dados da parada');
            this.isLoading = false;
        }
    }

    /**
     * Popula o formulário com dados da parada
     */
    private populateForm(parada: Parada): void {
        // Campos básicos
        this.paradaForm.patchValue({
            tipo: parada.tipo,
            nome: parada.nome,
            endereco: parada.endereco || '',
            horaChegada: parada.horaChegada || '',
            horaSaida: parada.horaSaida || '',
            custo: parada.custo || null,
            observacoes: parada.observacoes || '',
            avaliacao: parada.avaliacao || null,
            latitude: parada.coordenadas ? parada.coordenadas[0] : null,
            longitude: parada.coordenadas ? parada.coordenadas[1] : null
        });

        // Carregar fotos
        if (parada.fotos && parada.fotos.length > 0) {
            this.fotos = parada.fotos.map(url => ({
                url,
                path: '', // Path será extraído da URL se necessário
                name: url.split('/').pop() || 'foto.jpg',
                size: 0 // Tamanho não disponível para fotos existentes
            }));
        }

        // Dados específicos baseados no tipo
        if (parada.dadosEspecificos) {
            switch (parada.tipo) {
                case TipoParada.ABASTECIMENTO:
                    const dadosAbast = parada.dadosEspecificos as DadosAbastecimento;
                    this.paradaForm.patchValue({
                        tipoCombustivel: dadosAbast.tipoCombustivel,
                        quantidade: dadosAbast.quantidade,
                        precoPorLitro: dadosAbast.precoPorLitro,
                        quilometragem: dadosAbast.quilometragem || null,
                        nomePosto: dadosAbast.nomePosto || '',
                        bandeiraPosto: dadosAbast.bandeiraPosto || ''
                    });
                    break;

                case TipoParada.REFEICAO:
                    const dadosRef = parada.dadosEspecificos as DadosRefeicao;
                    this.paradaForm.patchValue({
                        tipoRefeicao: dadosRef.tipoRefeicao,
                        nomeEstabelecimento: dadosRef.nomeEstabelecimento || '',
                        tipoEstabelecimento: dadosRef.tipoEstabelecimento || '',
                        valorGasto: dadosRef.valorGasto || null,
                        numeroPessoas: dadosRef.numeroPessoas || 1,
                        pratos: dadosRef.pratos?.join(', ') || '',
                        qualidadeComida: dadosRef.qualidadeComida || null,
                        qualidadeAtendimento: dadosRef.qualidadeAtendimento || null
                    });
                    break;

                case TipoParada.PONTO_INTERESSE:
                    const dadosPonto = parada.dadosEspecificos as DadosPontoInteresse;
                    this.paradaForm.patchValue({
                        categoria: dadosPonto.categoria,
                        valorEntrada: dadosPonto.valorEntrada || null,
                        tempoVisita: dadosPonto.tempoVisita || null,
                        horarioFuncionamento: dadosPonto.horarioFuncionamento || '',
                        siteOficial: dadosPonto.siteOficial || '',
                        telefone: dadosPonto.telefone || '',
                        recomendacoes: dadosPonto.recomendacoes?.join(', ') || '',
                        melhorEpoca: dadosPonto.melhorEpoca || ''
                    });
                    break;
            }
        }
    }

    /**
     * Salva a parada (criação ou edição)
     */
    async onSalvar(): Promise<void> {
        if (this.paradaForm.invalid) {
            this.markFormGroupTouched();
            this.showError('Por favor, corrija os erros no formulário');
            return;
        }

        this.isSaving = true;
        const formData = this.buildParadaData();

        try {
            if (this.isEditMode && (this.paradaId || this.parada?.id)) {
                // Edição
                const id = this.paradaId || this.parada!.id!;
                await this.paradasService.altera(id, formData);
                this.showSuccess('Parada atualizada com sucesso!');

                // Emitir evento com dados atualizados
                const paradaAtualizada: Parada = {
                    ...formData,
                    id,
                    diaViagemId: this.parada!.diaViagemId,
                    viagemId: this.parada!.viagemId,
                    criadoEm: this.parada!.criadoEm,
                    atualizadoEm: new Date() as any
                };
                this.paradaSalva.emit(paradaAtualizada);
            } else {
                // Criação
                const formValue = this.paradaForm.value;
                const novaParadaId = await this.paradasService.criarParada({
                    ...formData,
                    diaViagemId: formValue.diaViagemId,
                    viagemId: this.viagemId
                });
                this.showSuccess('Parada criada com sucesso!');

                // Emitir evento com nova parada
                const novaParada: Parada = {
                    ...formData,
                    id: novaParadaId,
                    diaViagemId: formValue.diaViagemId,
                    viagemId: this.viagemId
                };
                this.paradaSalva.emit(novaParada);
            }
        } catch (error) {
            console.error('Erro ao salvar parada:', error);
            this.showError('Erro ao salvar parada. Tente novamente.');
        } finally {
            this.isSaving = false;
        }
    }

    /**
     * Constrói objeto Parada a partir dos dados do formulário
     */
    private buildParadaData(): Omit<Parada, 'id' | 'criadoEm' | 'atualizadoEm' | 'diaViagemId' | 'viagemId'> {
        const formValue = this.paradaForm.value;
        const tipo = formValue.tipo as TipoParada;

        const paradaData: any = {
            tipo,
            nome: formValue.nome,
            endereco: formValue.endereco || undefined,
            coordenadas: (formValue.latitude && formValue.longitude) 
                ? [formValue.latitude, formValue.longitude] as [number, number]
                : undefined,
            horaChegada: formValue.horaChegada || undefined,
            horaSaida: formValue.horaSaida || undefined,
            custo: formValue.custo || undefined,
            observacoes: formValue.observacoes || undefined,
            avaliacao: formValue.avaliacao || undefined,
            fotos: this.fotos.map(foto => foto.url)
        };

        // Adicionar dados específicos baseados no tipo
        switch (tipo) {
            case TipoParada.ABASTECIMENTO:
                paradaData.dadosEspecificos = {
                    tipoCombustivel: formValue.tipoCombustivel,
                    quantidade: formValue.quantidade,
                    precoPorLitro: formValue.precoPorLitro,
                    valorTotal: formValue.custo,
                    quilometragem: formValue.quilometragem || undefined,
                    nomePosto: formValue.nomePosto || undefined,
                    bandeiraPosto: formValue.bandeiraPosto || undefined
                } as DadosAbastecimento;
                break;

            case TipoParada.REFEICAO:
                paradaData.dadosEspecificos = {
                    tipoRefeicao: formValue.tipoRefeicao,
                    nomeEstabelecimento: formValue.nomeEstabelecimento || undefined,
                    tipoEstabelecimento: formValue.tipoEstabelecimento || undefined,
                    valorGasto: formValue.valorGasto || undefined,
                    numeroPessoas: formValue.numeroPessoas || undefined,
                    pratos: formValue.pratos ? formValue.pratos.split(',').map((p: string) => p.trim()) : undefined,
                    qualidadeComida: formValue.qualidadeComida || undefined,
                    qualidadeAtendimento: formValue.qualidadeAtendimento || undefined
                } as DadosRefeicao;
                break;

            case TipoParada.PONTO_INTERESSE:
                paradaData.dadosEspecificos = {
                    categoria: formValue.categoria,
                    valorEntrada: formValue.valorEntrada || undefined,
                    tempoVisita: formValue.tempoVisita || undefined,
                    horarioFuncionamento: formValue.horarioFuncionamento || undefined,
                    siteOficial: formValue.siteOficial || undefined,
                    telefone: formValue.telefone || undefined,
                    recomendacoes: formValue.recomendacoes ? formValue.recomendacoes.split(',').map((r: string) => r.trim()) : undefined,
                    melhorEpoca: formValue.melhorEpoca || undefined
                } as DadosPontoInteresse;
                break;
        }

        return paradaData;
    }

    /**
     * Cancela a edição/criação
     */
    onCancelar(): void {
        if (this.paradaForm.dirty) {
            const confirmacao = confirm('Existem alterações não salvas. Deseja realmente cancelar?');
            if (!confirmacao) return;
        }

        this.cancelar.emit();
    }

    /**
     * Verifica se deve mostrar campos específicos do tipo
     */
    shouldShowFields(tipo: TipoParada): boolean {
        return this.paradaForm.get('tipo')?.value === tipo;
    }

    /**
     * Marca todos os campos do formulário como tocados para exibir erros
     */
    private markFormGroupTouched(): void {
        Object.keys(this.paradaForm.controls).forEach(key => {
            const control = this.paradaForm.get(key);
            control?.markAsTouched();
        });
    }

    /**
     * Obtém mensagem de erro para um campo específico
     */
    getErrorMessage(fieldName: string): string {
        const control = this.paradaForm.get(fieldName);
        if (!control || !control.errors || !control.touched) {
            return '';
        }

        const errors = control.errors;

        if (errors['required']) {
            return 'Este campo é obrigatório';
        }
        if (errors['minlength']) {
            return `Mínimo de ${errors['minlength'].requiredLength} caracteres`;
        }
        if (errors['maxlength']) {
            return `Máximo de ${errors['maxlength'].requiredLength} caracteres`;
        }
        if (errors['min']) {
            return `Valor mínimo: ${errors['min'].min}`;
        }
        if (errors['max']) {
            return `Valor máximo: ${errors['max'].max}`;
        }

        return 'Campo inválido';
    }

    /**
     * Verifica se um campo tem erro
     */
    hasError(fieldName: string): boolean {
        const control = this.paradaForm.get(fieldName);
        return !!(control && control.errors && control.touched);
    }

    /**
     * Exibe mensagem de sucesso
     */
    private showSuccess(message: string): void {
        this.snackBar.open(message, 'Fechar', {
            duration: 5000,
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
     * Obtém ícone para o tipo de parada
     */
    getTipoIcon(tipo: TipoParada): string {
        const tipoObj = this.tiposParada.find(t => t.value === tipo);
        return tipoObj?.icon || 'place';
    }

    /**
     * Obtém label para o tipo de parada
     */
    getTipoLabel(tipo: TipoParada): string {
        const tipoObj = this.tiposParada.find(t => t.value === tipo);
        return tipoObj?.label || tipo;
    }

    /**
     * Manipula mudanças nas fotos
     */
    onFotosChange(fotos: Photo[]): void {
        this.fotos = fotos;
    }

    /**
     * Obtém path para upload das fotos
     */
    getUploadPath(): string {
        return `paradas/${this.viagemId}/${this.diaViagemId}`;
    }

    /**
     * Busca coordenadas baseado no endereço
     */
    async buscarCoordenadas(): Promise<void> {
        const endereco = this.paradaForm.get('endereco')?.value;

        if (!endereco || endereco.trim().length < 2) {
            this.showError('Digite um endereço válido para buscar as coordenadas');
            return;
        }

        // Mostrar feedback de carregamento
        this.snackBar.open('Buscando coordenadas...', '', {
            duration: 2000
        });

        try {
            const coords = await this.buscarCoordenadasEndereco(endereco);
            if (coords) {
                this.paradaForm.patchValue({
                    latitude: coords[0],
                    longitude: coords[1]
                });
                this.showSuccess(`Coordenadas encontradas: ${coords[0].toFixed(6)}, ${coords[1].toFixed(6)}`);
            } else {
                this.showError('Não foi possível encontrar as coordenadas. Verifique o endereço ou digite manualmente.');
            }
        } catch (error) {
            console.error('Erro ao buscar coordenadas:', error);
            this.showError('Erro ao buscar coordenadas. Tente novamente ou digite manualmente.');
        }
    }

    /**
     * Integração com serviço de geocodificação usando Google Maps API
     */
    private async buscarCoordenadasEndereco(endereco: string): Promise<[number, number] | undefined> {
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
}