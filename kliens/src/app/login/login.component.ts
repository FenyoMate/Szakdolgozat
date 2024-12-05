import {Component, EventEmitter, Output} from '@angular/core';
import {MatDivider} from '@angular/material/divider';
import {FormsModule} from '@angular/forms';
import {AuthService} from '../services/auth.service';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {inject} from '@angular/core';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    MatDivider,
    FormsModule,
    RouterLink
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  username: string = '';
  password: string = '';
  @Output() loginEvent = new EventEmitter<void>();
  private router = inject(Router);
  constructor(private authService: AuthService) {}


  login() {
    console.log('Username: ' + this.username);
    console.log('Password: ' + this.password);
    fetch('http://localhost:9090/auth/login/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: this.username,
        password: this.password
      })
    }).then(response => {
      console.log(response);
      if (response.status === 200) {
        response.json().then(data => {
          this.authService.setToken(data.token, data.uid);
          this.loginEvent.emit();
          this.router.navigate(['/model']);
        });
      }
    }).catch(error => {
      console.error('Error:', error);
    });
  }
}
