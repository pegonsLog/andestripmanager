import { Component, Inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

import { ClimaObservado } from '../../../../models/clima.interface';
import { CondicaoClimatica } from '../../../../models/enums';

export interface ClimaObservadoDialogData {
    diaViagemId: string;
    data: string;
    climaExistente?: ClimaObservado;
}

@Component({
    selector: 'app-clima-observado-form',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatButtonModule,
        MatIconModule,
        MatSliderModule,
        MatCheckboxModule,
        MatDatepickerModule,
        MatNativeDateModule
    ],
    templateUrl: './clima-observado-form.component.html',
    styleUrls: ['./clima-observado-form.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClimaObservadoFormComponent implements OnInit {
    form: FormGroup;
    condicoesClimaticas = Object.values(CondicaoClimatica);
    intensidadesChuva = [
        { value: 'leve', label: 'Leve' },
        { value: 'moderada', label: 'Moderada' },
        { value: 'forte', label: 'Forte' }
    ];

    constructor(
        private fb: FormBuilder,
        private dialogRef: MatDialogRef<ClimaObservadoFormComponent>,
        @Inject(MAT_DIALOG_DATA) public data: ClimaObservadoDialogData
    ) {
        this.form = this.criarFormulario();
    }

    ngOnInit(): void {
        if (this.data.climaExistente) {
            this.preencherFormulario(this.data.climaExistente);
        }
    }

    /**
     * Cria o formulário reativo
     */
    private criarFormulario(): FormGroup {
        return this.fb.group({
            temperatura: [20, [Validators.required, Validators.min(-10), Validators.max(50)]],
            condicao: [CondicaoClimatica.ENSOLARADO, Validators.required],
            choveu: [false],
            intensidadeChuva: [null],
            vento: [0, [Validators.min(0), Validators.max(200)]],
            observacoes: ['', Validators.maxLength(500)],
            horarioRegistro: [new Date(), Validators.required]
        });
    }

    /**
     * Preenche o formulário com dados existentes
     */
    private preencherFormulario(clima: ClimaObservado): void {
        this.form.patchValue({
            temperatura: clima.temperatura,
            condicao: clima.condicao,
            choveu: clima.choveu,
            intensidadeChuva: clima.intensidadeChuva,
            vento: clima.vento || 0,
            observacoes: clima.observacoes || '',
            horarioRegistro: new Date(clima.horarioRegistro)
        });
    }

    /**
     * Obtém o rótulo da condição climática
     */
    obterLabelCondicao(condicao: CondicaoClimatica): string {
        const labels: { [key in CondicaoClimatica]: string } = {
            [CondicaoClimatica.ENSOLARADO]: 'Ensolarado',
            [CondicaoClimatica.NUBLADO]: 'Nublado',
            [CondicaoClimatica.CHUVOSO]: 'Chuvoso',
            [CondicaoClimatica.TEMPESTADE]: 'Tempestade',
            [CondicaoClimatica.NEBLINA]: 'Neblina',
            [CondicaoClimatica.VENTO_FORTE]: 'Vento Forte'
        };

        return labels[condicao];
    }

    /**
     * Obtém o ícone da condição climática
     */
    obterIconeCondicao(condicao: CondicaoClimatica): string {
        const icones: { [key in CondicaoClimatica]: string } = {
            [CondicaoClimatica.ENSOLARADO]: 'wb_sunny',
            [CondicaoClimatica.NUBLADO]: 'cloud',
            [CondicaoClimatica.CHUVOSO]: 'umbrella',
            [CondicaoClimatica.TEMPESTADE]: 'thunderstorm',
            [CondicaoClimatica.NEBLINA]: 'foggy',
            [CondicaoClimatica.VENTO_FORTE]: 'air'
        };

        return icones[condicao];
    }

    /**
     * Verifica se o campo de intensidade da chuva deve ser exibido
     */
    mostrarIntensidadeChuva(): boolean {
        return this.form.get('choveu')?.value === true;
    }

    /**
     * Atualiza a validação da intensidade da chuva
     */
    onChoveuChange(): void {
        const intensidadeControl = this.form.get('intensidadeChuva');

        if (this.form.get('choveu')?.value) {
            intensidadeControl?.setValidators([Validators.required]);
        } else {
            intensidadeControl?.clearValidators();
            intensidadeControl?.setValue(null);
        }

        intensidadeControl?.updateValueAndValidity();
    }

    /**
     * Formata o valor da temperatura para exibição
     */
    formatarTemperatura(value: number): string {
        return `${value}°C`;
    }

    /**
     * Formata o valor do vento para exibição
     */
    formatarVento(value: number): string {
        return `${value} km/h`;
    }

    /**
     * Salva o clima observado
     */
    onSalvar(): void {
        if (this.form.valid) {
            const formValue = this.form.value;

            const climaObservado: ClimaObservado = {
                temperatura: formValue.temperatura,
                condicao: formValue.condicao,
                choveu: formValue.choveu,
                intensidadeChuva: formValue.choveu ? formValue.intensidadeChuva : undefined,
                vento: formValue.vento > 0 ? formValue.vento : undefined,
                observacoes: formValue.observacoes || undefined,
                horarioRegistro: formValue.horarioRegistro.toISOString()
            };

            this.dialogRef.close(climaObservado);
        }
    }

    /**
     * Cancela a operação
     */
    onCancelar(): void {
        this.dialogRef.close();
    }

    /**
     * Verifica se o formulário tem erros
     */
    temErros(): boolean {
        return this.form.invalid;
    }

    /**
     * Obtém a mensagem de erro para um campo
     */
    obterMensagemErro(campo: string): string {
        const control = this.form.get(campo);

        if (control?.hasError('required')) {
            return 'Este campo é obrigatório';
        }

        if (control?.hasError('min')) {
            const min = control.errors?.['min']?.min;
            return `Valor mínimo: ${min}`;
        }

        if (control?.hasError('max')) {
            const max = control.errors?.['max']?.max;
            return `Valor máximo: ${max}`;
        }

        if (control?.hasError('maxlength')) {
            const maxLength = control.errors?.['maxlength']?.requiredLength;
            return `Máximo de ${maxLength} caracteres`;
        }

        return '';
    }
}