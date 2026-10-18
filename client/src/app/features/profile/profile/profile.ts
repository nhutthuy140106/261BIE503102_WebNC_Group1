import { Component, inject } from '@angular/core';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-profile',
  standalone: false,
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile {
  protected readonly auth = inject(AuthService);
}
