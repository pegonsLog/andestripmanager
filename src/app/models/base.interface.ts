import { Timestamp } from '@angular/fire/firestore';

/**
 * Interface base para todas as entidades do sistema
 * Contém campos comuns de auditoria
 */
export interface BaseEntity {
    /** ID único da entidade */
    id?: string;

    /** Data de criação do registro */
    criadoEm?: Timestamp;

    /** Data da última atualização */
    atualizadoEm?: Timestamp;

    /** ID do usuário que criou o registro */
    criadoPor?: string;

    /** ID do usuário que fez a última atualização */
    atualizadoPor?: string;
}