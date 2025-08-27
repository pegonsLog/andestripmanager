import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { ProfileComponent } from './profile.component';
import { AuthService } from '../../../core/services/auth.service';
import { StorageService } from '../../../core/services/storage.service';

describe('ProfileComponent', () => {
    let component: ProfileComponent;
    let fixture: ComponentFixture<ProfileComponent>;
    let mockAuthService: jasmine.SpyObj<AuthService>;
    let mockStorageService: jasmine.SpyObj<StorageService>;

    beforeEach(async () => {
        const authSpy = jasmine.createSpyObj('AuthService', ['updateUserData']);
        const storageSpy = jasmine.createSpyObj('StorageService', [
            'validateImageFile',
            'uploadProfilePhoto',
            'deleteProfilePhoto',
            'compressImage'
        ]);

        authSpy.currentUser$ = of(null);
        storageSpy.validateImageFile.and.returnValue({ valid: true });

        await TestBed.configureTestingModule({
            imports: [
                ProfileComponent,
                ReactiveFormsModule,
                MatSnackBarModule,
                NoopAnimationsModule
            ],
            providers: [
                { provide: AuthService, useValue: authSpy },
                { provide: StorageService, useValue: storageSpy }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(ProfileComponent);
        component = fixture.componentInstance;
        mockAuthService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
        mockStorageService = TestBed.inject(StorageService) as jasmine.SpyObj<StorageService>;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize forms on ngOnInit', () => {
        component.ngOnInit();
        expect(component.perfilForm).toBeDefined();
        expect(component.motocicletaForm).toBeDefined();
    });
});