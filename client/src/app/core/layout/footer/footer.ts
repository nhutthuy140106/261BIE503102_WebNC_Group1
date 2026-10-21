import { Component, inject } from '@angular/core';
import { AreaService } from '../../services/area';

@Component({
  selector: 'app-footer',
  standalone: false,
  styleUrl: './footer.css',
  templateUrl: './footer.html',
})
export class Footer {
  protected readonly area = inject(AreaService);
}
