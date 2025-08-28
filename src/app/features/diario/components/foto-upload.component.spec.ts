import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { FotoUploadComponent } from './foto-upload.component';

describe('FotoUploadComponent', () => {
    let component: FotoUploadComponent;
    let fixture: ComponentFixture<FotoUploadComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [
                FotoUploadComponent,
                MatSnackBarModule,
                NoopAnimationsModule
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(FotoUploadComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should format file size correctly', () => {
        expect(component.formatarTamanho(0)).toBe('0 Bytes');
        expect(component.formatarTamanho(1024)).toBe('1 KB');
        expect(component.formatarTamanho(1048576)).toBe('1 MB');
        expect(component.formatarTamanho(1073741824)).toBe('1 GB');
    });

    it('should handle drag over event', () => {
        const event = new DragEvent('dragover');
        spyOn(event, 'preventDefault');
        spyOn(event, 'stopPropagation');

        component.onDragOver(event);

        expect(event.preventDefault).toHaveBeenCalled();
        expect(event.stopPropagation).toHaveBeenCalled();
        expect(component.isDragOver).toBe(true);
    });

    it('should handle drag leave event', () => {
        const event = new DragEvent('dragleave');
        spyOn(event, 'preventDefault');
        spyOn(event, 'stopPropagation');

        component.onDragLeave(event);

        expect(event.preventDefault).toHaveBeenCalled();
        expect(event.stopPropagation).toHaveBeenCalled();
        expect(component.isDragOver).toBe(false);
    });

    it('should remove photo from selection', () => {
        component.fotosSelecionadas = [
            { file: new File([''], 'test1.jpg'), preview: 'preview1' },
            { file: new File([''], 'test2.jpg'), preview: 'preview2' }
        ];

        component.removerFoto(0);

        expect(component.fotosSelecionadas.length).toBe(1);
        expect(component.fotosSelecionadas[0].file.name).toBe('test2.jpg');
    });

    it('should clear all photos', () => {
        component.fotosSelecionadas = [
            { file: new File([''], 'test1.jpg'), preview: 'preview1' },
            { file: new File([''], 'test2.jpg'), preview: 'preview2' }
        ];

        component.limparFotos();

        expect(component.fotosSelecionadas.length).toBe(0);
    });

    it('should emit photos when confirmed', () => {
        spyOn(component.fotosAdicionadas, 'emit');
        const files = [new File([''], 'test1.jpg'), new File([''], 'test2.jpg')];
        component.fotosSelecionadas = files.map(file => ({ file, preview: 'preview' }));

        component.confirmarFotos();

        expect(component.fotosAdicionadas.emit).toHaveBeenCalledWith(files);
        expect(component.fotosSelecionadas.length).toBe(0);
    });
});