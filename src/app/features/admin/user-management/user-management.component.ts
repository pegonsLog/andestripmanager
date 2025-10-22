import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable } from 'rxjs';

import { UserManagementService } from '../../../core/services/user-management.service';
import { Usuario } from '../../../models';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    MatTooltipModule
  ],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.scss'
})
export class UserManagementComponent implements OnInit {
  users$!: Observable<Usuario[]>;
  displayedColumns: string[] = ['nome', 'email', 'cpf', 'telefone', 'criadoEm', 'acoes'];
  isLoading = false;

  constructor(
    private userManagementService: UserManagementService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  /**
   * Carrega lista de usuários
   */
  loadUsers(): void {
    this.users$ = this.userManagementService.getAllUsers();
  }

  /**
   * Remove um usuário
   */
  async deleteUser(user: Usuario): Promise<void> {
    const confirmacao = confirm(
      `Tem certeza que deseja remover o usuário "${user.nome}" (${user.email})?\n\nEsta ação não pode ser desfeita.`
    );

    if (!confirmacao) {
      return;
    }

    this.isLoading = true;

    try {
      await this.userManagementService.deleteUser(user.id!);
      
      this.snackBar.open('Usuário removido com sucesso!', 'Fechar', {
        duration: 3000,
        panelClass: ['success-snackbar']
      });

      // Recarregar lista
      this.loadUsers();
    } catch (error: any) {
      this.snackBar.open(
        error.message || 'Erro ao remover usuário',
        'Fechar',
        {
          duration: 5000,
          panelClass: ['error-snackbar']
        }
      );
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Formata data para exibição
   */
  formatDate(timestamp: any): string {
    if (!timestamp) return '-';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return '-';
    }
  }

  /**
   * Navega de volta para o dashboard
   */
  voltarDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
