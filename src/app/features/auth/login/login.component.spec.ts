import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';

// Componente a ser testado
import { LoginComponent } from './login.component';

// Utilitários de teste
import {
    TestHelper,
    FirebaseMocks,
    createComponentTestConfig
} from '../../../testing/test-utils';

// Services
import { AuthService } from '../../../core/services/auth.service';

describe('LoginComponent', () => {
    let component: LoginComponent;
    let fixture: ComponentFixture<LoginComponent>;
    let mockAuthService: jasmine.SpyObj<AuthService>;
    let mockRouter: jasmine.SpyObj<Router>;
    let mockSnackBar: jasmine.SpyObj<MatSnackBar>;
    let formBuilder: FormBuilder;

    beforeEach(async () => {
        // Criar mocks
        mockAuthService = FirebaseMocks.createAuthService() as jasmine.SpyObj<AuthService>;
        mockRouter = FirebaseMocks.createRouter() as jasmine.SpyObj<Router>;
        mockSnackBar = FirebaseMocks.createMatSnackBar() as jasmine.SpyObj<MatSnackBar>;
        formBuilder = new FormBuilder();

        await TestBed.configureTestingModule(
            createComponentTestConfig({
                component: LoginComponent,
                imports: [LoginComponent, ReactiveFormsModule],
                providers: [
                    { provide: AuthService, useValue: mockAuthService },
                    { provide: Router, useValue: mockRouter },
                    { provide: MatSnackBar, useValue: mockSnackBar },
                    { provide: FormBuilder, useValue: formBuilder }
                ]
            })
        ).compileComponents();

        fixture = TestBed.createComponent(LoginComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    describe('Inicialização do Componente', () => {
        it('deve criar o componente', () => {
            expect(component).toBeTruthy();
        });

        it('deve inicializar o formulário com campos vazios', () => {
            expect(component.loginForm).toBeDefined();
            expect(component.loginForm.get('email')?.value).toBe('');
            expect(component.loginForm.get('senha')?.value).toBe('');
        });

        it('deve definir isLoading como false inicialmente', () => {
            expect(component.isLoading).toBe(false);
        });

        it('deve definir hidePassword como true inicialmente', () => {
            expect(component.hidePassword).toBe(true);
        });
    });

    describe('Validação do Formulário', () => {
        it('deve ser inválido quando campos estão vazios', () => {
            expect(component.loginForm.valid).toBe(false);
        });

        it('deve ser inválido com email inválido', () => {
            component.loginForm.patchValue({
                email: 'email-invalido',
                senha: '123456'
            });

            expect(component.loginForm.valid).toBe(false);
            expect(component.loginForm.get('email')?.hasError('email')).toBe(true);
        });

        it('deve ser inválido com senha muito curta', () => {
            component.loginForm.patchValue({
                email: 'teste@email.com',
                senha: '123'
            });

            expect(component.loginForm.valid).toBe(false);
            expect(component.loginForm.get('senha')?.hasError('minlength')).toBe(true);
        });

        it('deve ser válido com dados corretos', () => {
            component.loginForm.patchValue({
                email: 'teste@email.com',
                senha: '123456'
            });

            expect(component.loginForm.valid).toBe(true);
        });

        it('deve retornar mensagem de erro correta para campo obrigatório', () => {
            component.loginForm.get('email')?.markAsTouched();
            const errorMessage = component.getErrorMessage('email');
            expect(errorMessage).toBe('Este campo é obrigatório');
        });

        it('deve retornar mensagem de erro correta para email inválido', () => {
            const emailControl = component.loginForm.get('email');
            emailControl?.setValue('email-invalido');
            emailControl?.markAsTouched();

            const errorMessage = component.getErrorMessage('email');
            expect(errorMessage).toBe('Email deve ter um formato válido');
        });

        it('deve retornar mensagem de erro correta para senha muito curta', () => {
            const senhaControl = component.loginForm.get('senha');
            senhaControl?.setValue('123');
            senhaControl?.markAsTouched();

            const errorMessage = component.getErrorMessage('senha');
            expect(errorMessage).toBe('A senha deve ter pelo menos 6 caracteres');
        });
    });

    describe('Renderização do Template', () => {
        it('deve exibir campos de email e senha', () => {
            const emailInput = TestHelper.getBySelector(fixture, '[data-test="email-input"]');
            const senhaInput = TestHelper.getBySelector(fixture, '[data-test="senha-input"]');

            expect(emailInput).toBeTruthy();
            expect(senhaInput).toBeTruthy();
        });

        it('deve exibir botão de login', () => {
            const loginButton = TestHelper.getBySelector(fixture, '[data-test="login-button"]');
            expect(loginButton).toBeTruthy();
        });

        it('deve exibir links para registro e recuperação de senha', () => {
            const registerLink = TestHelper.getBySelector(fixture, '[data-test="register-link"]');
            const forgotPasswordLink = TestHelper.getBySelector(fixture, '[data-test="forgot-password-link"]');

            expect(registerLink).toBeTruthy();
            expect(forgotPasswordLink).toBeTruthy();
        });

        it('deve desabilitar botão de login quando formulário é inválido', () => {
            const loginButton = TestHelper.getBySelector<HTMLButtonElement>(fixture, '[data-test="login-button"]');
            expect(loginButton.disabled).toBe(true);
        });

        it('deve habilitar botão de login quando formulário é válido', () => {
            component.loginForm.patchValue({
                email: 'teste@email.com',
                senha: '123456'
            });
            fixture.detectChanges();

            const loginButton = TestHelper.getBySelector<HTMLButtonElement>(fixture, '[data-test="login-button"]');
            expect(loginButton.disabled).toBe(false);
        });

        it('deve exibir spinner durante loading', () => {
            component.isLoading = true;
            fixture.detectChanges();

            const spinner = TestHelper.getBySelector(fixture, 'mat-spinner');
            expect(spinner).toBeTruthy();
        });

        it('deve ocultar texto do botão durante loading', () => {
            component.isLoading = true;
            fixture.detectChanges();

            const buttonText = TestHelper.getBySelector(fixture, '[data-test="login-button-text"]');
            expect(buttonText).toBeFalsy();
        });

        it('deve alternar visibilidade da senha', () => {
            const toggleButton = TestHelper.getBySelector(fixture, '[data-test="password-toggle"]');
            const senhaInput = TestHelper.getBySelector<HTMLInputElement>(fixture, '[data-test="senha-input"]');

            // Inicialmente oculta
            expect(component.hidePassword).toBe(true);
            expect(senhaInput.type).toBe('password');

            // Clicar para mostrar
            TestHelper.click(toggleButton);
            fixture.detectChanges();

            expect(component.hidePassword).toBe(false);
            expect(senhaInput.type).toBe('text');
        });
    });

    describe('Processo de Login', () => {
        beforeEach(() => {
            component.loginForm.patchValue({
                email: 'teste@email.com',
                senha: '123456'
            });
        });

        it('deve chamar AuthService.login com dados corretos', fakeAsync(() => {
            mockAuthService.login.and.returnValue(Promise.resolve());

            component.onLogin();
            tick();

            expect(mockAuthService.login).toHaveBeenCalledWith('teste@email.com', '123456');
        }));

        it('deve definir isLoading como true durante login', () => {
            mockAuthService.login.and.returnValue(new Promise(() => { })); // Promise que nunca resolve

            component.onLogin();

            expect(component.isLoading).toBe(true);
        });

        it('deve navegar para dashboard após login bem-sucedido', fakeAsync(() => {
            mockAuthService.login.and.returnValue(Promise.resolve());

            component.onLogin();
            tick();

            expect(mockRouter.navigate).toHaveBeenCalledWith(['/dashboard']);
        }));

        it('deve exibir mensagem de sucesso após login', fakeAsync(() => {
            mockAuthService.login.and.returnValue(Promise.resolve());

            component.onLogin();
            tick();

            expect(mockSnackBar.open).toHaveBeenCalledWith(
                'Login realizado com sucesso!',
                'Fechar',
                jasmine.objectContaining({
                    duration: 3000,
                    panelClass: ['success-snackbar']
                })
            );
        }));

        it('deve definir isLoading como false após login bem-sucedido', fakeAsync(() => {
            mockAuthService.login.and.returnValue(Promise.resolve());

            component.onLogin();
            tick();

            expect(component.isLoading).toBe(false);
        }));

        it('deve exibir mensagem de erro em caso de falha', fakeAsync(() => {
            const errorMessage = 'Credenciais inválidas';
            mockAuthService.login.and.returnValue(Promise.reject(new Error(errorMessage)));

            component.onLogin();
            tick();

            expect(mockSnackBar.open).toHaveBeenCalledWith(
                errorMessage,
                'Fechar',
                jasmine.objectContaining({
                    duration: 5000,
                    panelClass: ['error-snackbar']
                })
            );
        }));

        it('deve definir isLoading como false após erro', fakeAsync(() => {
            mockAuthService.login.and.returnValue(Promise.reject(new Error('Erro')));

            component.onLogin();
            tick();

            expect(component.isLoading).toBe(false);
        }));

        it('deve exibir mensagem padrão quando erro não tem message', fakeAsync(() => {
            mockAuthService.login.and.returnValue(Promise.reject({}));

            component.onLogin();
            tick();

            expect(mockSnackBar.open).toHaveBeenCalledWith(
                'Erro ao fazer login',
                'Fechar',
                jasmine.any(Object)
            );
        }));

        it('não deve fazer login com formulário inválido', fakeAsync(() => {
            component.loginForm.patchValue({
                email: '',
                senha: ''
            });

            component.onLogin();
            tick();

            expect(mockAuthService.login).not.toHaveBeenCalled();
        }));

        it('deve marcar campos como touched quando formulário inválido', fakeAsync(() => {
            component.loginForm.patchValue({
                email: '',
                senha: ''
            });

            spyOn(component.loginForm.get('email')!, 'markAsTouched');
            spyOn(component.loginForm.get('senha')!, 'markAsTouched');

            component.onLogin();
            tick();

            expect(component.loginForm.get('email')!.markAsTouched).toHaveBeenCalled();
            expect(component.loginForm.get('senha')!.markAsTouched).toHaveBeenCalled();
        });
    });

    describe('Navegação', () => {
        it('deve navegar para registro', () => {
            component.onRegister();
            expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/register']);
        });

        it('deve navegar para recuperação de senha', () => {
            component.onForgotPassword();
            expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/forgot-password']);
        });

        it('deve navegar para registro ao clicar no link', () => {
            const registerLink = TestHelper.getBySelector(fixture, '[data-test="register-link"]');
            TestHelper.click(registerLink);

            expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/register']);
        });

        it('deve navegar para recuperação ao clicar no link', () => {
            const forgotLink = TestHelper.getBySelector(fixture, '[data-test="forgot-password-link"]');
            TestHelper.click(forgotLink);

            expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/forgot-password']);
        });
    });

    describe('Interação com Formulário', () => {
        it('deve atualizar valor do email ao digitar', () => {
            const emailInput = TestHelper.getBySelector<HTMLInputElement>(fixture, '[data-test="email-input"]');

            TestHelper.typeText(emailInput, 'novo@email.com');
            fixture.detectChanges();

            expect(component.loginForm.get('email')?.value).toBe('novo@email.com');
        });

        it('deve atualizar valor da senha ao digitar', () => {
            const senhaInput = TestHelper.getBySelector<HTMLInputElement>(fixture, '[data-test="senha-input"]');

            TestHelper.typeText(senhaInput, 'novasenha123');
            fixture.detectChanges();

            expect(component.loginForm.get('senha')?.value).toBe('novasenha123');
        });

        it('deve fazer login ao pressionar Enter no formulário', fakeAsync(() => {
            component.loginForm.patchValue({
                email: 'teste@email.com',
                senha: '123456'
            });

            spyOn(component, 'onLogin');

            const form = TestHelper.getBySelector(fixture, 'form');
            const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
            form.dispatchEvent(enterEvent);

            expect(component.onLogin).toHaveBeenCalled();
        }));
    });

    describe('Validação Visual', () => {
        it('deve exibir erro visual para campo email inválido', () => {
            const emailControl = component.loginForm.get('email');
            emailControl?.setValue('email-invalido');
            emailControl?.markAsTouched();
            fixture.detectChanges();

            const emailField = TestHelper.getBySelector(fixture, '[data-test="email-field"]');
            expect(emailField.classList.contains('mat-form-field-invalid')).toBe(true);
        });

        it('deve exibir erro visual para campo senha inválido', () => {
            const senhaControl = component.loginForm.get('senha');
            senhaControl?.setValue('123');
            senhaControl?.markAsTouched();
            fixture.detectChanges();

            const senhaField = TestHelper.getBySelector(fixture, '[data-test="senha-field"]');
            expect(senhaField.classList.contains('mat-form-field-invalid')).toBe(true);
        });

        it('deve exibir mensagem de erro abaixo do campo', () => {
            const emailControl = component.loginForm.get('email');
            emailControl?.setValue('');
            emailControl?.markAsTouched();
            fixture.detectChanges();

            const errorMessage = TestHelper.getBySelector(fixture, '[data-test="email-error"]');
            expect(errorMessage?.textContent?.trim()).toBe('Este campo é obrigatório');
        });
    });

    describe('Acessibilidade', () => {
        it('deve ter labels apropriados nos campos', () => {
            const emailInput = TestHelper.getBySelector(fixture, '[data-test="email-input"]');
            const senhaInput = TestHelper.getBySelector(fixture, '[data-test="senha-input"]');

            expect(emailInput.getAttribute('aria-label')).toBeTruthy();
            expect(senhaInput.getAttribute('aria-label')).toBeTruthy();
        });

        it('deve ter botão de login com texto descritivo', () => {
            const loginButton = TestHelper.getBySelector(fixture, '[data-test="login-button"]');
            expect(loginButton.getAttribute('aria-label')).toContain('Fazer login');
        });

        it('deve associar mensagens de erro aos campos', () => {
            const emailControl = component.loginForm.get('email');
            emailControl?.setValue('');
            emailControl?.markAsTouched();
            fixture.detectChanges();

            const emailInput = TestHelper.getBySelector(fixture, '[data-test="email-input"]');
            const errorMessage = TestHelper.getBySelector(fixture, '[data-test="email-error"]');

            expect(emailInput.getAttribute('aria-describedby')).toBe(errorMessage.id);
        });

        it('deve suportar navegação por teclado', () => {
            const emailInput = TestHelper.getBySelector(fixture, '[data-test="email-input"]');
            const senhaInput = TestHelper.getBySelector(fixture, '[data-test="senha-input"]');
            const loginButton = TestHelper.getBySelector(fixture, '[data-test="login-button"]');

            expect(emailInput.tabIndex).toBe(0);
            expect(senhaInput.tabIndex).toBe(0);
            expect(loginButton.tabIndex).toBe(0);
        });
    });

    describe('Estados do Componente', () => {
        it('deve manter estado do formulário durante loading', fakeAsync(() => {
            component.loginForm.patchValue({
                email: 'teste@email.com',
                senha: '123456'
            });

            mockAuthService.login.and.returnValue(new Promise(() => { })); // Promise que nunca resolve
            component.onLogin();

            expect(component.loginForm.get('email')?.value).toBe('teste@email.com');
            expect(component.loginForm.get('senha')?.value).toBe('123456');
        }));

        it('deve preservar estado de hidePassword', () => {
            component.hidePassword = false;
            fixture.detectChanges();

            const toggleButton = TestHelper.getBySelector(fixture, '[data-test="password-toggle"]');
            TestHelper.click(toggleButton);

            expect(component.hidePassword).toBe(true);
        });
    });

    describe('Casos Extremos', () => {
        it('deve lidar com múltiplos cliques no botão de login', fakeAsync(() => {
            component.loginForm.patchValue({
                email: 'teste@email.com',
                senha: '123456'
            });

            mockAuthService.login.and.returnValue(Promise.resolve());

            const loginButton = TestHelper.getBySelector(fixture, '[data-test="login-button"]');

            // Múltiplos cliques rápidos
            TestHelper.click(loginButton);
            TestHelper.click(loginButton);
            TestHelper.click(loginButton);

            tick();

            // Deve chamar apenas uma vez
            expect(mockAuthService.login).toHaveBeenCalledTimes(1);
        }));

        it('deve resetar estado de loading em caso de erro', fakeAsync(() => {
            component.loginForm.patchValue({
                email: 'teste@email.com',
                senha: '123456'
            });

            mockAuthService.login.and.returnValue(Promise.reject(new Error('Erro')));

            component.onLogin();
            expect(component.isLoading).toBe(true);

            tick();
            expect(component.isLoading).toBe(false);
        }));
    });
});