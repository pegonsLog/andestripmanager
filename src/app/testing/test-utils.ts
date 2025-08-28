/**
 * Utilitários para testes - Andes Trip Manager
 * 
 * Este arquivo contém funções auxiliares, mocks e configurações
 * reutilizáveis para os testes da aplicação.
 */

import { ComponentFixture } from '@angular/core/testing';
import { DebugElement } from '@angular/core';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, BehaviorSubject } from 'rxjs';
import { Timestamp } from '@angular/fire/firestore';

// Models
import {
    Usuario,
    Viagem,
    StatusViagem,
    DiaViagem,
    Parada,
    TipoParada,
    Hospedagem,
    Custo,
    TipoCusto,
    Clima,
    Manutencao,
    DiarioBordo
} from '../models';

/**
 * Configuração padrão para testes Angular
 */
export const TEST_IMPORTS = [
    NoopAnimationsModule
];

/**
 * Utilitários para interação com DOM em testes
 */
export class TestHelper {
    /**
     * Encontra elemento por atributo data-test
     */
    static getByTestId<T = HTMLElement>(fixture: ComponentFixture<any>, testId: string): T {
        const debugElement = fixture.debugElement.query(By.css(`[data-test="${testId}"]`));
        return debugElement?.nativeElement as T;
    }

    /**
     * Encontra todos os elementos por atributo data-test
     */
    static getAllByTestId<T = HTMLElement>(fixture: ComponentFixture<any>, testId: string): T[] {
        const debugElements = fixture.debugElement.queryAll(By.css(`[data-test="${testId}"]`));
        return debugElements.map(de => de.nativeElement as T);
    }

    /**
     * Encontra elemento por seletor CSS
     */
    static getBySelector<T = HTMLElement>(fixture: ComponentFixture<any>, selector: string): T {
        const debugElement = fixture.debugElement.query(By.css(selector));
        return debugElement?.nativeElement as T;
    }

    /**
     * Encontra todos os elementos por seletor CSS
     */
    static getAllBySelector<T = HTMLElement>(fixture: ComponentFixture<any>, selector: string): T[] {
        const debugElements = fixture.debugElement.queryAll(By.css(selector));
        return debugElements.map(de => de.nativeElement as T);
    }

    /**
     * Simula clique em elemento
     */
    static click(element: HTMLElement): void {
        element.click();
    }

    /**
     * Simula input de texto
     */
    static typeText(element: HTMLInputElement, text: string): void {
        element.value = text;
        element.dispatchEvent(new Event('input'));
    }

    /**
     * Aguarda próximo tick do Angular
     */
    static async tick(fixture: ComponentFixture<any>): Promise<void> {
        fixture.detectChanges();
        await fixture.whenStable();
    }
}

/**
 * Factory para criar dados de teste
 */
export class MockDataFactory {
    /**
     * Cria usuário mock
     */
    static createUsuario(overrides: Partial<Usuario> = {}): Usuario {
        return {
            id: 'user-123',
            usuarioId: 'user-123',
            nome: 'João Silva',
            email: 'joao@teste.com',
            telefone: '(11) 99999-9999',
            fotoUrl: 'https://example.com/foto.jpg',
            motocicleta: {
                marca: 'Honda',
                modelo: 'CB 600F Hornet',
                ano: 2020,
                placa: 'ABC-1234'
            },
            criadoEm: Timestamp.now(),
            atualizadoEm: Timestamp.now(),
            ...overrides
        };
    }

    /**
     * Cria viagem mock
     */
    static createViagem(overrides: Partial<Viagem> = {}): Viagem {
        return {
            id: 'viagem-123',
            usuarioId: 'user-123',
            nome: 'Viagem de Teste',
            descricao: 'Uma viagem incrível para testar',
            origem: 'São Paulo',
            destino: 'Rio de Janeiro',
            dataInicio: '2024-06-01',
            dataFim: '2024-06-05',
            status: StatusViagem.PLANEJADA,
            distanciaTotal: 450,
            tempoEstimado: 360,
            orcamento: 2000,
            custoTotal: 1500,
            criadoEm: Timestamp.now(),
            atualizadoEm: Timestamp.now(),
            ...overrides
        };
    }

    /**
     * Cria lista de viagens mock
     */
    static createViagens(count: number = 3): Viagem[] {
        return Array.from({ length: count }, (_, index) =>
            this.createViagem({
                id: `viagem-${index + 1}`,
                nome: `Viagem ${index + 1}`,
                status: index === 0 ? StatusViagem.EM_ANDAMENTO :
                    index === 1 ? StatusViagem.PLANEJADA : StatusViagem.FINALIZADA
            })
        );
    }

    /**
     * Cria dia de viagem mock
     */
    static createDiaViagem(overrides: Partial<DiaViagem> = {}): DiaViagem {
        return {
            id: 'dia-123',
            usuarioId: 'user-123',
            viagemId: 'viagem-123',
            ordem: 1,
            data: '2024-06-01',
            cidadeOrigem: 'São Paulo',
            cidadeDestino: 'Campinas',
            distancia: 100,
            tempoEstimado: 90,
            observacoes: 'Primeira etapa da viagem',
            coordenadas: {
                origem: { lat: -23.5505, lng: -46.6333 },
                destino: { lat: -22.9056, lng: -47.0608 }
            },
            criadoEm: Timestamp.now(),
            atualizadoEm: Timestamp.now(),
            ...overrides
        };
    }

    /**
     * Cria parada mock
     */
    static createParada(overrides: Partial<Parada> = {}): Parada {
        return {
            id: 'parada-123',
            usuarioId: 'user-123',
            diaViagemId: 'dia-123',
            tipo: TipoParada.ABASTECIMENTO,
            nome: 'Posto Shell',
            endereco: 'Av. Paulista, 1000',
            coordenadas: { lat: -23.5505, lng: -46.6333 },
            horario: '10:00',
            observacoes: 'Parada para abastecimento',
            fotos: [],
            abastecimento: {
                combustivel: 'Gasolina Comum',
                litros: 15,
                precoLitro: 5.50,
                total: 82.50
            },
            criadoEm: Timestamp.now(),
            atualizadoEm: Timestamp.now(),
            ...overrides
        };
    }

    /**
     * Cria hospedagem mock
     */
    static createHospedagem(overrides: Partial<Hospedagem> = {}): Hospedagem {
        return {
            id: 'hospedagem-123',
            usuarioId: 'user-123',
            diaViagemId: 'dia-123',
            nome: 'Hotel Teste',
            endereco: 'Rua das Flores, 123',
            coordenadas: { lat: -23.5505, lng: -46.6333 },
            dataCheckin: '2024-06-01',
            dataCheckout: '2024-06-02',
            preco: 150,
            estacionamentoCoberto: true,
            linkReserva: 'https://booking.com/123',
            observacoes: 'Hotel com boa localização',
            fotos: [],
            avaliacao: 4,
            criadoEm: Timestamp.now(),
            atualizadoEm: Timestamp.now(),
            ...overrides
        };
    }

    /**
     * Cria custo mock
     */
    static createCusto(overrides: Partial<Custo> = {}): Custo {
        return {
            id: 'custo-123',
            usuarioId: 'user-123',
            viagemId: 'viagem-123',
            diaViagemId: 'dia-123',
            tipo: TipoCusto.COMBUSTIVEL,
            descricao: 'Abastecimento no Posto Shell',
            valor: 82.50,
            data: '2024-06-01',
            observacoes: 'Gasolina comum',
            comprovante: 'comprovante-123.jpg',
            criadoEm: Timestamp.now(),
            atualizadoEm: Timestamp.now(),
            ...overrides
        };
    }
}

/**
 * Mocks para serviços Firebase
 */
export class FirebaseMocks {
    /**
     * Mock do AuthService
     */
    static createAuthService() {
        return {
            currentUser$: new BehaviorSubject(MockDataFactory.createUsuario()),
            isAuthenticated$: new BehaviorSubject(true),
            login: jasmine.createSpy('login').and.returnValue(Promise.resolve()),
            logout: jasmine.createSpy('logout').and.returnValue(Promise.resolve()),
            register: jasmine.createSpy('register').and.returnValue(Promise.resolve()),
            updateProfile: jasmine.createSpy('updateProfile').and.returnValue(Promise.resolve()),
            resetPassword: jasmine.createSpy('resetPassword').and.returnValue(Promise.resolve()),
            getCurrentUser: jasmine.createSpy('getCurrentUser').and.returnValue(MockDataFactory.createUsuario())
        };
    }

    /**
     * Mock do ViagensService
     */
    static createViagensService() {
        return {
            listarViagensUsuario: jasmine.createSpy('listarViagensUsuario')
                .and.returnValue(of(MockDataFactory.createViagens())),
            recuperarPorId: jasmine.createSpy('recuperarPorId')
                .and.returnValue(of(MockDataFactory.createViagem())),
            novo: jasmine.createSpy('novo').and.returnValue(Promise.resolve()),
            altera: jasmine.createSpy('altera').and.returnValue(Promise.resolve()),
            remove: jasmine.createSpy('remove').and.returnValue(Promise.resolve()),
            excluirViagemCompleta: jasmine.createSpy('excluirViagemCompleta')
                .and.returnValue(Promise.resolve()),
            obterEstatisticasViagem: jasmine.createSpy('obterEstatisticasViagem')
                .and.returnValue(Promise.resolve({
                    temDadosRelacionados: true,
                    totalDias: 3,
                    totalParadas: 5,
                    totalHospedagens: 2,
                    totalCustos: 8,
                    valorTotalCustos: 1500
                }))
        };
    }

    /**
     * Mock do DiasViagemService
     */
    static createDiasViagemService() {
        return {
            listarPorViagem: jasmine.createSpy('listarPorViagem')
                .and.returnValue(of([MockDataFactory.createDiaViagem()])),
            recuperarPorId: jasmine.createSpy('recuperarPorId')
                .and.returnValue(of(MockDataFactory.createDiaViagem())),
            novo: jasmine.createSpy('novo').and.returnValue(Promise.resolve()),
            altera: jasmine.createSpy('altera').and.returnValue(Promise.resolve()),
            remove: jasmine.createSpy('remove').and.returnValue(Promise.resolve())
        };
    }

    /**
     * Mock do ParadasService
     */
    static createParadasService() {
        return {
            listarPorDia: jasmine.createSpy('listarPorDia')
                .and.returnValue(of([MockDataFactory.createParada()])),
            recuperarPorId: jasmine.createSpy('recuperarPorId')
                .and.returnValue(of(MockDataFactory.createParada())),
            novo: jasmine.createSpy('novo').and.returnValue(Promise.resolve()),
            altera: jasmine.createSpy('altera').and.returnValue(Promise.resolve()),
            remove: jasmine.createSpy('remove').and.returnValue(Promise.resolve())
        };
    }

    /**
     * Mock do Router
     */
    static createRouter() {
        return {
            navigate: jasmine.createSpy('navigate').and.returnValue(Promise.resolve(true)),
            navigateByUrl: jasmine.createSpy('navigateByUrl').and.returnValue(Promise.resolve(true)),
            url: '/dashboard'
        };
    }

    /**
     * Mock do MatDialog
     */
    static createMatDialog() {
        return {
            open: jasmine.createSpy('open').and.returnValue({
                afterClosed: () => of(true)
            })
        };
    }

    /**
     * Mock do MatSnackBar
     */
    static createMatSnackBar() {
        return {
            open: jasmine.createSpy('open').and.returnValue({
                dismiss: jasmine.createSpy('dismiss')
            })
        };
    }

    /**
     * Mock do FormBuilder
     */
    static createFormBuilder() {
        return {
            group: jasmine.createSpy('group').and.callFake((config: any) => {
                // Simula FormGroup básico
                const controls: any = {};
                Object.keys(config).forEach(key => {
                    controls[key] = {
                        value: config[key][0] || '',
                        hasError: jasmine.createSpy('hasError').and.returnValue(false),
                        markAsTouched: jasmine.createSpy('markAsTouched'),
                        setValue: jasmine.createSpy('setValue'),
                        patchValue: jasmine.createSpy('patchValue')
                    };
                });

                return {
                    controls,
                    get: jasmine.createSpy('get').and.callFake((name: string) => controls[name]),
                    value: {},
                    valid: true,
                    invalid: false,
                    markAllAsTouched: jasmine.createSpy('markAllAsTouched'),
                    reset: jasmine.createSpy('reset'),
                    patchValue: jasmine.createSpy('patchValue')
                };
            })
        };
    }
}

/**
 * Configuração padrão para testes de componentes
 */
export interface ComponentTestConfig {
    component: any;
    imports?: any[];
    providers?: any[];
    declarations?: any[];
}

/**
 * Função auxiliar para configurar testes de componentes
 */
export function createComponentTestConfig(config: ComponentTestConfig) {
    return {
        imports: [
            ...(config.imports || []),
            ...TEST_IMPORTS
        ],
        providers: config.providers || [],
        declarations: config.declarations || []
    };
}

/**
 * Matchers customizados para testes
 */
export const CustomMatchers = {
    /**
     * Verifica se elemento está visível
     */
    toBeVisible: (element: HTMLElement) => {
        const isVisible = element &&
            element.offsetWidth > 0 &&
            element.offsetHeight > 0 &&
            window.getComputedStyle(element).visibility !== 'hidden';

        return {
            pass: isVisible,
            message: () => `Expected element to be visible`
        };
    },

    /**
     * Verifica se elemento tem classe CSS
     */
    toHaveClass: (element: HTMLElement, className: string) => {
        const hasClass = element && element.classList.contains(className);

        return {
            pass: hasClass,
            message: () => `Expected element to have class "${className}"`
        };
    },

    /**
     * Verifica se elemento tem atributo
     */
    toHaveAttribute: (element: HTMLElement, attribute: string, value?: string) => {
        const hasAttribute = element && element.hasAttribute(attribute);
        const attributeValue = element?.getAttribute(attribute);

        const pass = value !== undefined ?
            hasAttribute && attributeValue === value :
            hasAttribute;

        return {
            pass,
            message: () => value !== undefined ?
                `Expected element to have attribute "${attribute}" with value "${value}"` :
                `Expected element to have attribute "${attribute}"`
        };
    }
};

/**
 * Função para aguardar condição assíncrona
 */
export async function waitFor(
    condition: () => boolean,
    timeout: number = 5000,
    interval: number = 100
): Promise<void> {
    const startTime = Date.now();

    while (!condition() && (Date.now() - startTime) < timeout) {
        await new Promise(resolve => setTimeout(resolve, interval));
    }

    if (!condition()) {
        throw new Error(`Timeout: Condition not met within ${timeout}ms`);
    }
}

/**
 * Função para simular delay
 */
export function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}