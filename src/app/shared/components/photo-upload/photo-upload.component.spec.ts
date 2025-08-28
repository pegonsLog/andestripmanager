import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { of } from 'rxjs';

import { PhotoUploadComponent, Photo } from './photo-upload.component';
import { UploadService } from '../../../core/services/upload.service';

describe('PhotoUploadComponent', () => {
    let component: PhotoUploadComponent;
    let fixture: ComponentFixture<PhotoUploadComponent>;
    let mockUploadService: jasmine.SpyObj<UploadService>;

    const mockPhoto: Photo = {
        url: 'https://example.com/photo.jpg',
        path: 'photos/photo.jpg',
        name: 'photo.jpg',
        size: 1024,
        uploadedAt: new Date()
    };

    beforeEach(async () => {
        const spy = jasmine.createSpyObj('UploadService', [
            'uploadFileWithProgress',
            'deleteFile',
            'isValidImage',
            'generatePath',
            'formatFileSize'
        ]);

        await TestBed.configureTestingModule({
            imports: [
                PhotoUploadComponent,
                NoopAnimationsModule,
                MatSnackBarModule
            ],
            providers: [
                { provide: UploadService, useValue: spy }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(PhotoUploadComponent);
        component = fixture.componentInstance;
        mockUploadService = TestBed.inject(UploadService) as jasmine.SpyObj<UploadService>;

        fixture.detectChanges();
    });

    it('deve criar o componente', () => {
        expect(component).toBeTruthy();
    });

    it('deve inicializar com valores padrão', () => {
        expect(component.photos).toEqual([]);
        expect(component.maxPhotos).toBe(10);
        expect(component.allowMultiple).toBe(true);
        expect(component.disabled).toBe(false);
        expect(component.showGallery).toBe(true);
        expect(component.compactMode).toBe(false);
    });

    it('deve verificar se pode adicionar mais fotos', () => {
        expect(component.canAddMorePhotos()).toBe(true);

        component.disabled = true;
        expect(component.canAddMorePhotos()).toBe(false);

        component.disabled = false;
        component.photos = new Array(10).fill(mockPhoto);
        expect(component.canAddMorePhotos()).toBe(false);

        component.photos = [];
        component.isUploading = true;
        expect(component.canAddMorePhotos()).toBe(false);
    });

    it('deve retornar texto correto do botão de upload', () => {
        expect(component.getUploadButtonText()).toBe('Adicionar Fotos');

        component.isUploading = true;
        expect(component.getUploadButtonText()).toBe('Enviando...');

        component.isUploading = false;
        component.allowMultiple = false;
        expect(component.getUploadButtonText()).toBe('Adicionar Foto');

        component.allowMultiple = true;
        component.photos = new Array(9).fill(mockPhoto);
        expect(component.getUploadButtonText()).toBe('Adicionar 1 Foto');

        component.photos = new Array(8).fill(mockPhoto);
        expect(component.getUploadButtonText()).toBe('Adicionar Fotos (2 restantes)');
    });

    it('deve manipular drag over', () => {
        const event = new DragEvent('dragover');
        spyOn(event, 'preventDefault');
        spyOn(event, 'stopPropagation');

        component.onDragOver(event);

        expect(event.preventDefault).toHaveBeenCalled();
        expect(event.stopPropagation).toHaveBeenCalled();
        expect(component.dragOver).toBe(true);
    });

    it('deve manipular drag leave', () => {
        const event = new DragEvent('dragleave');
        spyOn(event, 'preventDefault');
        spyOn(event, 'stopPropagation');

        component.dragOver = true;
        component.onDragLeave(event);

        expect(event.preventDefault).toHaveBeenCalled();
        expect(event.stopPropagation).toHaveBeenCalled();
        expect(component.dragOver).toBe(false);
    });

    it('deve manipular drop de arquivos', () => {
        const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);

        const event = new DragEvent('drop');
        Object.defineProperty(event, 'dataTransfer', {
            value: dataTransfer
        });

        spyOn(event, 'preventDefault');
        spyOn(event, 'stopPropagation');
        spyOn(component as any, 'handleFiles');

        component.onDrop(event);

        expect(event.preventDefault).toHaveBeenCalled();
        expect(event.stopPropagation).toHaveBeenCalled();
        expect(component.dragOver).toBe(false);
        expect((component as any).handleFiles).toHaveBeenCalledWith([file]);
    });

    it('deve remover foto', () => {
        spyOn(window, 'confirm').and.returnValue(true);
        mockUploadService.deleteFile.and.returnValue(of(undefined));
        spyOn(component.photosChange, 'emit');
        spyOn(component.photoRemoved, 'emit');

        component.photos = [mockPhoto];
        component.removePhoto(mockPhoto);

        expect(mockUploadService.deleteFile).toHaveBeenCalledWith(mockPhoto.path);
        expect(component.photos).toEqual([]);
        expect(component.photosChange.emit).toHaveBeenCalledWith([]);
        expect(component.photoRemoved.emit).toHaveBeenCalledWith(mockPhoto);
    });

    it('não deve remover foto se cancelar confirmação', () => {
        spyOn(window, 'confirm').and.returnValue(false);
        spyOn(component.photosChange, 'emit');

        component.photos = [mockPhoto];
        component.removePhoto(mockPhoto);

        expect(component.photos).toEqual([mockPhoto]);
        expect(component.photosChange.emit).not.toHaveBeenCalled();
    });

    it('deve abrir foto em nova aba', () => {
        spyOn(window, 'open');

        component.openPhoto(mockPhoto);

        expect(window.open).toHaveBeenCalledWith(mockPhoto.url, '_blank');
    });

    it('deve formatar tamanho do arquivo', () => {
        mockUploadService.formatFileSize.and.returnValue('1 KB');

        const result = component.formatFileSize(1024);

        expect(mockUploadService.formatFileSize).toHaveBeenCalledWith(1024);
        expect(result).toBe('1 KB');
    });

    it('deve manipular seleção de arquivos', () => {
        const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
        const input = document.createElement('input');
        input.type = 'file';

        Object.defineProperty(input, 'files', {
            value: [file],
            writable: false
        });

        const event = { target: input } as any;
        spyOn(component as any, 'handleFiles');

        component.onFileSelected(event);

        expect((component as any).handleFiles).toHaveBeenCalledWith([file]);
        expect(input.value).toBe('');
    });

    it('deve ter função trackBy para performance', () => {
        const trackByFn = (component as any).trackByUrl;
        expect(typeof trackByFn).toBe('function');
    });
});