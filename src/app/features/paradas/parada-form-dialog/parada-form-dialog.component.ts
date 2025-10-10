import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Parada } from '../../../models';
import { ParadaFormComponent } from '../parada-form/parada-form.component';

export interface ParadaFormDialogData {
  viagemId: string;
  diaViagemId: string;
  parada?: Parada; // opcional para modo edição futuro
}

@Component({
  selector: 'app-parada-form-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, ParadaFormComponent],
  template: `
    <div mat-dialog-content class="dialog-scroll">
      <app-parada-form
        [viagemId]="data.viagemId"
        [diaViagemId]="data.diaViagemId"
        [parada]="data.parada"
        (paradaSalva)="onParadaSalva($event)"
        (cancelar)="onCancelar()"
      ></app-parada-form>
    </div>
  `,
  styles: [
    `
    :host { display: block; }
    .dialog-scroll { max-height: 80vh; overflow: auto; }
    `
  ]
})
export class ParadaFormDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<ParadaFormDialogComponent, Parada | null>,
    @Inject(MAT_DIALOG_DATA) public data: ParadaFormDialogData
  ) {}

  onParadaSalva(parada: Parada): void {
    this.dialogRef.close(parada);
  }

  onCancelar(): void {
    this.dialogRef.close(null);
  }
}
