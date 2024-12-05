import {Component, inject} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {Router, RouterLink} from '@angular/router';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink
  ],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.css'
})
export class SignupComponent {
  private router = inject(Router);
  email: string = '';
  username: string = '';
  password: string = '';
  confirmPassword: string = '';

  signUp() {
    if (this.password !== this.confirmPassword) {
      console.error('Passwords do not match');
      return;
    }
    console.log('Email: ' + this.email);
    console.log('Username: ' + this.username);
    fetch('http://localhost:9090/auth/register/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: this.email,
        username: this.username,
        password: this.password
      })
    }).then(response => {
      if (response.status === 201) {
        response.json().then(data => {
          this.router.navigate(['/login']);
        });
      } else
        response.json().then(data => {
          console.error(data);
        });
    }).catch(error => {
      console.error('Error:', error);
    });
  }
}
