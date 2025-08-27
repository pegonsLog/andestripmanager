import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Validador para CPF brasileiro
 */
export function cpfValidator(control: AbstractControl): ValidationErrors | null {
    const cpf = control.value?.replace(/\D/g, '');

    if (!cpf || cpf.length !== 11) {
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