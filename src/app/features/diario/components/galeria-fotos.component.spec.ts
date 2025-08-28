import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { GaleriaFotosComponent } from './galeria-fotos.component';

describe('GaleriaFotosComponent', () => {
    let component: GaleriaFotosComponent;
    let fixture: ComponentFixture<GaleriaFotosComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [
                GaleriaFotosComponent,
                MatSnackBarModule,
                MatDialogModule,
                NoopAnimationsModule
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(GaleriaFotosComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should open photo in fullscreen', () => {
        const fotos = [
            { url: 'test1.jpg', nome: 'Foto 1' },
            { url: 'test2.jpg', nome: 'Foto 2' }
        ];
        component.fotos = fotos;

        component.abrirFotoTelaCheia(0);

        expect(component.fotoTelaCheia$.value).toEqual(fotos[0]);
        expect(component.indiceAtual).toBe(0);
    });

    it('should close fullscreen photo', () => {
        component.fotoTelaCheia$.next({ url: 'test.jpg' });

        component.fecharFotoTelaCheia();

        expect(component.fotoTelaCheia$.value).toBe(null);
    });

    it('should navigate to previous photo', () => {
        const fotos = [
            { url: 'test1.jpg', nome: 'Foto 1' },
            { url: 'test2.jpg', nome: 'Foto 2' }
        ];
        component.fotos = fotos;
        component.indiceAtual = 1;
        component.fotoTelaCheia$.next(fotos[1]);

        component.fotoAnterior();

        expect(component.indiceAtual).toBe(0);
        expect(component.fotoTelaCheia$.value).toEqual(fotos[0]);
    });

    it('should navigate to next photo', () => {
        const fotos = [
            { url: 'test1.jpg', nome: 'Foto 1' },
            { url: 'test2.jpg', nome: 'Foto 2' }
        ];
        component.fotos = fotos;
        component.indiceAtual = 0;
        component.fotoTelaCheia$.next(fotos[0]);

        component.proximaFoto();

        expect(component.indiceAtual).toBe(1);
        expect(component.fotoTelaCheia$.value).toEqual(fotos[1]);
    });

    it('should not navigate beyond bounds', () => {
        const fotos = [{ url: 'test1.jpg', nome: 'Foto 1' }];
        component.fotos = fotos;
        component.indiceAtual = 0;

        component.fotoAnterior();
        expect(component.indiceAtual).toBe(0);

        component.proximaFoto();
        expect(component.indiceAtual).toBe(0);
    });

    it('should emit photo removal event', () => {
        spyOn(component.fotoRemovida, 'emit');
        spyOn(window, 'confirm').and.returnValue(true);

        const event = new Event('click');
        component.removerFoto(0, event);

        expect(component.fotoRemovida.emit).toHaveBeenCalledWith(0);
    });

    it('should not emit photo removal if not confirmed', () => {
        spyOn(component.fotoRemovida, 'emit');
        spyOn(window, 'confirm').and.returnValue(false);

        const event = new Event('click');
        component.removerFoto(0, event);

        expect(component.fotoRemovida.emit).not.toHaveBeenCalled();
    });
});