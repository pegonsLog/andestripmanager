import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
    {
        path: '',
        redirectTo: '/dashboard',
        pathMatch: 'full'
    },
    {
        path: 'auth',
        children: [
            {
                path: 'login',
                loadComponent: () => import('./features/auth/login/login.component').then(c => c.LoginComponent)
            },
            {
                path: 'register',
                loadComponent: () => import('./features/auth/register/register.component').then(c => c.RegisterComponent)
            },
            {
                path: 'forgot-password',
                loadComponent: () => import('./features/auth/forgot-password/forgot-password.component').then(c => c.ForgotPasswordComponent)
            },
            {
                path: '',
                redirectTo: 'login',
                pathMatch: 'full'
            }
        ]
    },
    {
        path: 'perfil',
        loadComponent: () => import('./features/auth/profile/profile.component').then(c => c.ProfileComponent),
        canActivate: [AuthGuard]
    },
    {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(c => c.DashboardComponent),
        canActivate: [AuthGuard]
    },
    {
        path: 'viagens',
        canActivate: [AuthGuard],
        children: [
            {
                path: '',
                loadComponent: () => import('./features/dashboard/dashboard.component').then(c => c.DashboardComponent)
            },
            {
                path: 'nova',
                loadComponent: () => import('./features/viagens/viagem-form/viagem-form.component').then(c => c.ViagemFormComponent)
            },
            {
                path: ':viagemId/dias/nova',
                loadComponent: () => import('./features/dias-viagem/dia-viagem-form/dia-viagem-form.component').then(c => c.DiaViagemFormComponent)
            },
            {
                path: ':viagemId/dias/:diaId/editar',
                loadComponent: () => import('./features/dias-viagem/dia-viagem-form/dia-viagem-form.component').then(c => c.DiaViagemFormComponent)
            },
            {
                path: ':id',
                loadComponent: () => import('./features/viagens/viagem-detail/viagem-detail.component').then(c => c.ViagemDetailComponent)
            },
            {
                path: ':id/album',
                loadComponent: () => import('./features/viagens/album-viagem/album-viagem.component').then(c => c.AlbumViagemComponent)
            },
            {
                path: ':id/editar',
                loadComponent: () => import('./features/viagens/viagem-form/viagem-form.component').then(c => c.ViagemFormComponent)
            }
        ]
    },
    {
        path: 'manutencoes',
        loadComponent: () => import('./features/manutencoes/components/manutencoes/manutencoes.component').then(c => c.ManutencoesComponent),
        canActivate: [AuthGuard]
    },
    {
        path: 'admin/usuarios',
        loadComponent: () => import('./features/admin/user-management/user-management.component').then(c => c.UserManagementComponent),
        canActivate: [AuthGuard, adminGuard]
    }
];