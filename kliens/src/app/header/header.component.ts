import {Component, inject, OnChanges, OnInit, SimpleChanges} from '@angular/core';
import {MatToolbar} from '@angular/material/toolbar';
import {MatMenu, MatMenuItem, MatMenuTrigger} from '@angular/material/menu';
import {MatIcon} from '@angular/material/icon';
import {MatButton, MatIconButton} from '@angular/material/button';
import {Router, RouterLink, RouterOutlet} from '@angular/router';
import {AuthService} from '../services/auth.service';
import {NgIf} from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    MatToolbar,
    MatMenuTrigger,
    MatIcon,
    MatMenu,
    MatButton,
    MatIconButton,
    MatMenuItem,
    RouterLink,
    RouterOutlet,
    NgIf
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit, OnChanges {
  private router = inject(Router);
  private authService = inject(AuthService);

  title = "Petra"
  id: number = 0;
  uid: string | null = '';
  isAuthenticated: boolean = false;

  ngOnInit() {
    if (this.authService.isAuthenticated()) {
      this.isAuthenticated = true;
      this.uid = this.authService.getUid()
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.authService.isAuthenticated()) {
      this.isAuthenticated = true;
    }
  }

  createNewChat() {
    console.log(this.authService.getUid());
    fetch('http://localhost:9090/petra/chat/new/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${this.authService.getToken()}`
      },
      body: JSON.stringify(
        {
          uid: this.authService.getUid()
        })
    }).then(response => {
      if (response.ok) {
        return response.json();
      }
      throw new Error('Request failed!');
    }, networkError => console.log(networkError.message))
      .then(jsonResponse => {
        this.router.navigate([`/chat/${jsonResponse}`])
      }).catch(networkError => console.log(networkError.message));
  }

  logout() {
    this.authService.clearToken();
    this.isAuthenticated = this.authService.isAuthenticated(); // Update the state
    this.router.navigate(['/login']);
  }
}
