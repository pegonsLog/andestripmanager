import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSliderModule } from '@angular/material/slider';
import { MatExpansionModule } from '@angular/material/expansion';
import { Subject } from 'rxjs';

import { Hospedagem, TipoHospedagem, DiaViagem } from '../../../../models';
import { HospedagensService } from '../../../../services/hospedagens.service';
import { DiasViagemService } from '../../../../services/dias-viagem.service';
import { CustomValidators } from '../../../../models/validators';
import { UploadService } from '../../../../core/services/upload.service';
import { GoogleMapsLoaderService } from '../../../../services/google-maps-loader.service';

@Component({
    selector: 'app-hospedagem-form',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        FormsModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatButtonModule,
        MatIconModule,
        MatCheckboxModule,
        MatChipsModule,
        MatSliderModule,
        MatExpansionModule
    ],
    templateUrl: './hospedagem-form.component.html',
    styleUrls: ['./hospedagem-form.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class HospedagemFormComponent implements OnInit, OnDestroy {
    @Input() hospedagem?: Hospedagem;
    @Input() diaViagemId?: string;
    @Input() viagemId!: string;
    @Output() hospedagemSalva = new EventEmitter<Hospedagem>();
    @Output() cancelar = new EventEmitter<void>();

    private fb = inject(FormBuilder);
    private hospedagensService = inject(HospedagensService);
    private diasViagemService = inject(DiasViagemService);
    private snackBar = inject(MatSnackBar);
    private uploadService = inject(UploadService);
    private googleMapsLoader = inject(GoogleMapsLoaderService);
    private destroy$ = new Subject<void>();

    // Lista de dias disponíveis
    diasDisponiveis: DiaViagem[] = [];
    carregandoDias = false;

    hospedagemForm!: FormGroup;
    isEditMode = false;
    isLoading = false;

    // Opções para os selects
    tiposHospedagem = Object.values(TipoHospedagem);
    comodidadesDisponiveis = [
        'Wi-Fi gratuito',
        'Café da manhã',
        'Estacionamento',
        'Piscina',
        'Academia',
        'Ar condicionado',
        'TV a cabo',
        'Frigobar',
        'Room service',
        'Lavanderia',
        'Pet friendly',
        'Acessibilidade'
    ];

    // Propriedades para avaliação
    avaliacaoGeral = 0;
    avaliacaoDetalhada = {
        qualidadeQuarto: 0,
        qualidadeAtendimento: 0,
        limpeza: 0,
        localizacao: 0,
        custoBeneficio: 0,
        seguranca: 0,
        cafeManha: 0,
        wifi: 0
    };

    // Propriedades para upload de fotos
    fotosHospedagem: string[] = [];
    uploadingFoto = false;

    // Chaves para avaliação detalhada (para usar no template)
    avaliacaoDetalhadaKeys = Object.keys(this.avaliacaoDetalhada) as Array<keyof typeof this.avaliacaoDetalhada>;

    ngOnInit(): void {
        this.isEditMode = !!this.hospedagem;
        this.criarFormulario();
        this.carregarDiasViagem();

        if (this.hospedagem) {
            this.preencherFormulario();
        }
    }

    private async carregarDiasViagem(): Promise<void> {
        if (!this.viagemId) return;
        
        this.carregandoDias = true;
        try {
            this.diasDisponiveis = await this.diasViagemService.listarDiasViagem(this.viagemId).toPromise() || [];
            
            // Se diaViagemId foi fornecido, pré-selecionar
            if (this.diaViagemId) {
                this.hospedagemForm.patchValue({ diaViagemId: this.diaViagemId });
            }
        } catch (error) {
            console.error('Erro ao carregar dias da viagem:', error);
            this.snackBar.open('Erro ao carregar dias da viagem', 'Fechar', { duration: 3000 });
        } finally {
            this.carregandoDias = false;
        }
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private criarFormulario(): void {
        this.hospedagemForm = this.fb.group({
            diaViagemId: ['', Validators.required],
            nome: ['', [Validators.required, Validators.minLength(2)]],
            tipo: [TipoHospedagem.HOTEL, Validators.required],
            endereco: ['', [Validators.required, Validators.minLength(10)]],
            latitude: [null],
            longitude: [null],
            dataCheckIn: ['', Validators.required],
            dataCheckOut: ['', Validators.required],
            horaCheckIn: ['14:00'],
            horaCheckOut: ['12:00'],
            valorDiaria: [0, [Validators.required, Validators.min(0.01)]],
            estacionamentoCoberto: [false],
            linkReserva: ['', Validators.pattern(/^https?:\/\/.+/)],
            telefone: ['', Validators.pattern(/^\(\d{2}\)\s\d{4,5}-\d{4}$/)],
            email: ['', Validators.email],
            siteOficial: ['', Validators.pattern(/^https?:\/\/.+/)],
            observacoes: ['']
        }, {
            validators: [CustomValidators.dataCheckOutPosterior('dataCheckIn', 'dataCheckOut')]
        });
    }

    private preencherFormulario(): void {
        if (this.hospedagem) {
            this.hospedagemForm.patchValue({
                diaViagemId: this.hospedagem.diaViagemId,
                nome: this.hospedagem.nome,
                tipo: this.hospedagem.tipo,
                endereco: this.hospedagem.endereco,
                latitude: this.hospedagem.coordenadas ? this.hospedagem.coordenadas[0] : null,
                longitude: this.hospedagem.coordenadas ? this.hospedagem.coordenadas[1] : null,
                dataCheckIn: this.hospedagem.dataCheckIn,
                dataCheckOut: this.hospedagem.dataCheckOut,
                horaCheckIn: this.hospedagem.horaCheckIn || '14:00',
                horaCheckOut: this.hospedagem.horaCheckOut || '12:00',
                valorDiaria: this.hospedagem.valorDiaria,
                estacionamentoCoberto: this.hospedagem.estacionamentoCoberto,
                linkReserva: this.hospedagem.linkReserva || '',
                telefone: this.hospedagem.telefone || '',
                email: this.hospedagem.email || '',
                siteOficial: this.hospedagem.siteOficial || '',
                observacoes: this.hospedagem.observacoes || ''
            });
            
            // Carregar fotos existentes
            if (this.hospedagem.fotos && this.hospedagem.fotos.length > 0) {
                this.fotosHospedagem = [...this.hospedagem.fotos];
            }
            
            // Carregar avaliações existentes
            if (this.hospedagem.avaliacao) {
                this.avaliacaoGeral = this.hospedagem.avaliacao;
            }
            if (this.hospedagem.avaliacaoDetalhada) {
                this.avaliacaoDetalhada = { ...this.avaliacaoDetalhada, ...this.hospedagem.avaliacaoDetalhada };
            }
        }
    }

    get numeroNoites(): number {
        const checkIn = this.hospedagemForm.get('dataCheckIn')?.value;
        const checkOut = this.hospedagemForm.get('dataCheckOut')?.value;

        if (checkIn && checkOut) {
            const dataCheckIn = new Date(checkIn);
            const dataCheckOut = new Date(checkOut);

            if (dataCheckOut > dataCheckIn) {
                const diffTime = dataCheckOut.getTime() - dataCheckIn.getTime();
                return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            }
        }
        return 0;
    }

    get valorTotal(): number {
        const valorDiaria = this.hospedagemForm.get('valorDiaria')?.value || 0;
        return valorDiaria * this.numeroNoites;
    }

    async onSubmit(): Promise<void> {
        if (this.hospedagemForm.valid && !this.isLoading) {
            this.isLoading = true;

            try {
                const formValue = this.hospedagemForm.value;

                const dadosHospedagem: Omit<Hospedagem, 'id' | 'criadoEm' | 'atualizadoEm'> = {
                    diaViagemId: formValue.diaViagemId,
                    viagemId: this.viagemId,
                    nome: formValue.nome,
                    tipo: formValue.tipo,
                    endereco: formValue.endereco,
                    coordenadas: (formValue.latitude && formValue.longitude) 
                        ? [formValue.latitude, formValue.longitude] as [number, number]
                        : undefined,
                    dataCheckIn: this.formatarData(formValue.dataCheckIn),
                    dataCheckOut: this.formatarData(formValue.dataCheckOut),
                    horaCheckIn: formValue.horaCheckIn,
                    horaCheckOut: formValue.horaCheckOut,
                    numeroNoites: this.numeroNoites,
                    valorDiaria: formValue.valorDiaria,
                    valorTotal: this.valorTotal,
                    estacionamentoCoberto: formValue.estacionamentoCoberto,
                    linkReserva: formValue.linkReserva || undefined,
                    telefone: formValue.telefone || undefined,
                    email: formValue.email || undefined,
                    siteOficial: formValue.siteOficial || undefined,
                    observacoes: formValue.observacoes || undefined,
                    avaliacao: this.avaliacaoGeral || undefined,
                    avaliacaoDetalhada: this.avaliacaoDetalhada.qualidadeQuarto > 0 ? this.avaliacaoDetalhada : undefined,
                    fotos: this.fotosHospedagem.length > 0 ? this.fotosHospedagem : undefined
                };

                let hospedagemId: string;
                
                if (this.isEditMode && this.hospedagem?.id) {
                    await this.hospedagensService.altera(this.hospedagem.id, dadosHospedagem);
                    hospedagemId = this.hospedagem.id;
                    this.snackBar.open('Hospedagem atualizada com sucesso!', 'Fechar', { duration: 3000 });
                } else {
                    hospedagemId = await this.hospedagensService.criarHospedagem(dadosHospedagem);
                    this.snackBar.open('Hospedagem criada com sucesso!', 'Fechar', { duration: 3000 });
                }

                this.hospedagemSalva.emit({ ...dadosHospedagem, id: hospedagemId } as Hospedagem);

            } catch (error) {
                console.error('Erro ao salvar hospedagem:', error);
                this.snackBar.open('Erro ao salvar hospedagem. Tente novamente.', 'Fechar', { duration: 5000 });
            } finally {
                this.isLoading = false;
            }
        } else {
            this.marcarCamposComoTocados();
        }
    }

    onCancelar(): void {
        this.cancelar.emit();
    }

    private formatarData(data: Date | string | any): string {
        if (!data) return '';
        
        // Se já for uma string no formato correto, retornar
        if (typeof data === 'string') {
            return data.split('T')[0];
        }
        
        // Se for um objeto Date ou timestamp
        const dataObj = data instanceof Date ? data : new Date(data);
        
        // Verificar se é uma data válida
        if (isNaN(dataObj.getTime())) {
            console.error('Data inválida:', data);
            return '';
        }
        
        return dataObj.toISOString().split('T')[0];
    }

    private marcarCamposComoTocados(): void {
        Object.keys(this.hospedagemForm.controls).forEach(key => {
            this.hospedagemForm.get(key)?.markAsTouched();
        });
    }

    // Métodos para obter mensagens de erro
    getErrorMessage(fieldName: string): string {
        const field = this.hospedagemForm.get(fieldName);
        if (field?.hasError('required')) {
            return 'Este campo é obrigatório';
        }
        if (field?.hasError('minlength')) {
            const requiredLength = field.errors?.['minlength']?.requiredLength;
            return `Mínimo de ${requiredLength} caracteres`;
        }
        if (field?.hasError('min')) {
            return 'Valor deve ser maior que zero';
        }
        if (field?.hasError('email')) {
            return 'Email deve ter um formato válido';
        }
        if (field?.hasError('pattern')) {
            switch (fieldName) {
                case 'telefone':
                    return 'Formato: (11) 99999-9999';
                case 'linkReserva':
                case 'siteOficial':
                    return 'URL deve começar com http:// ou https://';
                default:
                    return 'Formato inválido';
            }
        }
        if (this.hospedagemForm.hasError('dataCheckOutPosterior')) {
            return 'Data de check-out deve ser posterior à data de check-in';
        }
        return '';
    }

    hasError(fieldName: string): boolean {
        const field = this.hospedagemForm.get(fieldName);
        return !!(field?.invalid && (field?.dirty || field?.touched));
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

    // Métodos para avaliação
    onAvaliacaoGeralChange(valor: number): void {
        this.avaliacaoGeral = valor;
    }

    onAvaliacaoDetalhadaChange(campo: keyof typeof this.avaliacaoDetalhada, valor: number): void {
        this.avaliacaoDetalhada[campo] = valor;
    }

    getAvaliacaoMedia(): number {
        const valores = Object.values(this.avaliacaoDetalhada).filter(v => v > 0);
        if (valores.length === 0) return 0;
        return valores.reduce((sum, val) => sum + val, 0) / valores.length;
    }

    // Métodos para upload de fotos
    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files.length > 0) {
            const file = input.files[0];
            this.uploadFoto(file);
        }
    }

    private async uploadFoto(file: File): Promise<void> {
        // Validar tipo e tamanho
        if (!this.uploadService.isValidImage(file)) {
            this.snackBar.open('Arquivo inválido. Use JPG, PNG ou WebP (máx. 10MB)', 'Fechar', { duration: 3000 });
            return;
        }

        this.uploadingFoto = true;

        try {
            // Gerar path único para o arquivo
            const path = this.uploadService.generatePath(
                `hospedagens/${this.viagemId}`,
                file.name
            );

            // Fazer upload com progresso
            this.uploadService.uploadFileWithProgress(file, path).subscribe({
                next: (result) => {
                    if ('url' in result) {
                        // Upload concluído
                        this.fotosHospedagem.push(result.url);
                        this.snackBar.open('Foto adicionada com sucesso!', 'Fechar', { duration: 2000 });
                        this.uploadingFoto = false;
                    }
                    // Progresso pode ser exibido aqui se necessário
                },
                error: (error) => {
                    console.error('Erro ao fazer upload da foto:', error);
                    this.snackBar.open('Erro ao fazer upload da foto', 'Fechar', { duration: 3000 });
                    this.uploadingFoto = false;
                }
            });
        } catch (error) {
            console.error('Erro ao fazer upload da foto:', error);
            this.snackBar.open('Erro ao fazer upload da foto', 'Fechar', { duration: 3000 });
            this.uploadingFoto = false;
        }
    }

    removerFoto(index: number): void {
        this.fotosHospedagem.splice(index, 1);
        this.snackBar.open('Foto removida', 'Fechar', { duration: 2000 });
    }

    // Método para obter estrelas para exibição
    getEstrelas(valor: number): number[] {
        return Array(5).fill(0).map((_, i) => i < valor ? 1 : 0);
    }

    // Labels para avaliação detalhada
    getAvaliacaoLabel(campo: keyof typeof this.avaliacaoDetalhada): string {
        const labels: Record<keyof typeof this.avaliacaoDetalhada, string> = {
            qualidadeQuarto: 'Qualidade do Quarto',
            qualidadeAtendimento: 'Atendimento',
            limpeza: 'Limpeza',
            localizacao: 'Localização',
            custoBeneficio: 'Custo-Benefício',
            seguranca: 'Segurança',
            cafeManha: 'Café da Manhã',
            wifi: 'Wi-Fi'
        };
        return labels[campo];
    }

    getAvaliacaoDetalhadaValue(campo: keyof typeof this.avaliacaoDetalhada): number {
        return this.avaliacaoDetalhada[campo] || 0;
    }

    /**
     * Busca coordenadas baseado no endereço
     */
    async buscarCoordenadas(): Promise<void> {
        const endereco = this.hospedagemForm.get('endereco')?.value;

        if (!endereco || endereco.trim().length < 10) {
            this.snackBar.open('Digite um endereço válido para buscar as coordenadas', 'Fechar', { duration: 3000 });
            return;
        }

        // Mostrar feedback de carregamento
        this.snackBar.open('Buscando coordenadas...', '', {
            duration: 2000
        });

        try {
            const coords = await this.buscarCoordenadasEndereco(endereco);
            if (coords) {
                this.hospedagemForm.patchValue({
                    latitude: coords[0],
                    longitude: coords[1]
                });
                this.snackBar.open(`Coordenadas encontradas: ${coords[0].toFixed(6)}, ${coords[1].toFixed(6)}`, 'Fechar', { duration: 3000 });
            } else {
                this.snackBar.open('Não foi possível encontrar as coordenadas. Verifique o endereço ou digite manualmente.', 'Fechar', { duration: 5000 });
            }
        } catch (error) {
            console.error('Erro ao buscar coordenadas:', error);
            this.snackBar.open('Erro ao buscar coordenadas. Tente novamente ou digite manualmente.', 'Fechar', { duration: 5000 });
        }
    }

    /**
     * Integração com serviço de geocodificação usando Google Maps API
     */
    private async buscarCoordenadasEndereco(endereco: string): Promise<[number, number] | undefined> {
        if (!endereco || endereco.trim().length < 10) {
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