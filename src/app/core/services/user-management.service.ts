import { Injectable } from '@angular/core';
import { 
  Firestore, 
  collection, 
  collectionData, 
  doc, 
  deleteDoc,
  query,
  orderBy
} from '@angular/fire/firestore';
import { Auth, deleteUser } from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { Usuario } from '../../models';

@Injectable({
  providedIn: 'root'
})
export class UserManagementService {

  constructor(
    private firestore: Firestore,
    private auth: Auth
  ) { }

  /**
   * Obtém lista de todos os usuários
   */
  getAllUsers(): Observable<Usuario[]> {
    const usersCollection = collection(this.firestore, 'usuarios');
    const usersQuery = query(usersCollection, orderBy('criadoEm', 'desc'));
    return collectionData(usersQuery, { idField: 'id' }) as Observable<Usuario[]>;
  }

  /**
   * Remove um usuário do Firestore
   * Nota: Não é possível remover o usuário do Authentication sem estar logado como ele
   */
  async deleteUser(userId: string): Promise<void> {
    try {
      // Remover documento do usuário do Firestore
      const userRef = doc(this.firestore, 'usuarios', userId);
      await deleteDoc(userRef);
      
      // Nota: Para remover do Authentication, seria necessário usar Firebase Admin SDK no backend
      // Por enquanto, apenas removemos do Firestore
    } catch (error: any) {
      console.error('Erro ao remover usuário:', error);
      throw new Error(`Erro ao remover usuário: ${error.message || error}`);
    }
  }

  /**
   * Verifica se o usuário atual é administrador
   */
  isAdmin(email: string | null | undefined): boolean {
    return email === 'pegons.log@gmail.com';
  }
}
