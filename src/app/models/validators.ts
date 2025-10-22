import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Validador para CPF brasileiro
 */
export function cpfValidator(control: AbstractControl): ValidationErrors | null {
    const cpf = control.value?.replace(/\D/g, '');

    if (!cpf) {
        return null; // Campo opcional
    }

    if (cpf.length !== 11) {
        return { cpfInvalido: { message: 'CPF deve ter 11 dígitos' } };
    }

    // Verificar se todos os dígitos são iguais
    if (/^(\d)\1{10}$/.test(cpf)) {
        return { cpfInvalido: { message: 'CPF inválido' } };
    }

    // Validar dígitos verificadores
    let soma = 0;
    for (let i = 0; i < 9; i++) {
        soma += parseInt(cpf.charAt(i)) * (10 - i);
    }

    let resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.charAt(9))) {
        return { cpfInvalido: { message: 'CPF inválido' } };
    }

    soma = 0;
    for (let i = 0; i < 10; i++) {
        soma += parseInt(cpf.charAt(i)) * (11 - i);
    }

    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.charAt(10))) {
        return { cpfInvalido: { message: 'CPF inválido' } };
    }

    return null;
}

/**
 * Validador para CEP brasileiro
 */
export function cepValidator(control: AbstractControl): ValidationErrors | null {
    const cep = control.value?.replace(/\D/g, '');

    if (!cep || cep.length !== 8) {
        return { cepInvalido: { message: 'CEP deve ter 8 dígitos' } };
    }

    return null;
}/**

 * Validador para telefone brasileiro
 */
export function telefoneValidator(control: AbstractControl): ValidationErrors | null {
    const telefone = control.value?.replace(/\D/g, '');

    if (!telefone) {
        return null; // Campo opcional
    }

    if (telefone.length < 10 || telefone.length > 11) {
        return { telefoneInvalido: { message: 'Telefone deve ter 10 ou 11 dígitos' } };
    }

    return null;
}

/**
 * Validador para data não pode ser no passado
 */
export function dataFuturaValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) {
        return null;
    }

    const dataInformada = new Date(control.value);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    if (dataInformada < hoje) {
        return { dataPassado: { message: 'Data não pode ser no passado' } };
    }

    return null;
}

/**
 * Validador para data de fim deve ser posterior à data de início
 */
export function dataFimValidator(dataInicio: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
        if (!control.value || !dataInicio) {
            return null;
        }

        const inicio = new Date(dataInicio);
        const fim = new Date(control.value);

        if (fim <= inicio) {
            return { dataFimInvalida: { message: 'Data de fim deve ser posterior à data de início' } };
        }

        return null;
    };
}

/**
 * Validador para valores monetários (deve ser maior que zero)
 */
export function valorPositivoValidator(control: AbstractControl): ValidationErrors | null {
    const valor = parseFloat(control.value);

    if (isNaN(valor) || valor <= 0) {
        return { valorInvalido: { message: 'Valor deve ser maior que zero' } };
    }

    return null;
}

/**
 * Classe com validadores customizados estáticos
 */
export class CustomValidators {
    /**
     * Validador para verificar se data de check-out é posterior à data de check-in
     */
    static dataCheckOutPosterior(checkInField: string, checkOutField: string): ValidatorFn {
        return (formGroup: AbstractControl): ValidationErrors | null => {
            const checkIn = formGroup.get(checkInField)?.value;
            const checkOut = formGroup.get(checkOutField)?.value;

            if (!checkIn || !checkOut) {
                return null;
            }

            const dataCheckIn = new Date(checkIn);
            const dataCheckOut = new Date(checkOut);

            if (dataCheckOut <= dataCheckIn) {
                return { dataCheckOutPosterior: { message: 'Data de check-out deve ser posterior à data de check-in' } };
            }

            return null;
        };
    }

    /**
     * Validador para CPF
     */
    static cpf = cpfValidator;

    /**
     * Validador para CEP
     */
    static cep = cepValidator;

    /**
     * Validador para telefone
     */
    static telefone = telefoneValidator;

    /**
     * Validador para data futura
     */
    static dataFutura = dataFuturaValidator;

    /**
     * Validador para valor positivo
     */
    static valorPositivo = valorPositivoValidator;
}