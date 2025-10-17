import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

/**
 * Componente para consultar clima da viagem via Windy
 */
@Component({
    selector: 'app-clima-viagem',
    standalone: true,
    imports: [
        CommonModule,
        MatCardModule,
        MatIconModule
    ],
    templateUrl: './clima-viagem.component.html',
    styleUrls: ['./clima-viagem.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ClimaViagemComponent {
    @Input() viagemId!: string;
    
    windyUrl: SafeResourceUrl;

    constructor(private sanitizer: DomSanitizer) {
        // URL do Windy com coordenadas padrão (pode ser ajustada conforme necessário)
        const url = 'https://embed.windy.com/embed2.html?lat=-19.923&lon=-43.945&detailLat=-20.063&detailLon=-43.971&width=650&height=450&zoom=11&level=surface&overlay=wind&product=ecmwf&menu=&message=true&marker=&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=default&metricTemp=default&radarRange=-1';
        this.windyUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    }
}
