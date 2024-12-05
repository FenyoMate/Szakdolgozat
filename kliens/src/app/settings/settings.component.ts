import {Component, inject, OnInit} from '@angular/core';
import {MatSlideToggle} from '@angular/material/slide-toggle';
import {FormsModule} from '@angular/forms';
import {NgIf} from '@angular/common';
import {HttpClient} from '@angular/common/http';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {AuthService} from '../services/auth.service';
import {MatButton, MatButtonModule} from '@angular/material/button';
import {Statistics, User} from './model.component';
import { CommonModule } from '@angular/common';
import { NgFor } from '@angular/common';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    MatSlideToggle,
    FormsModule,
    NgIf,
    MatButton,
    CommonModule,
    NgFor
  ],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent implements OnInit{
  private httpClient = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private url = 'http://localhost:9090/petra/user/';
  users: User[] = [];
  statistics: Statistics = {total_chat_cost: 0, total_dataset_cost: 0, total_tuning_cost: 0};
  isAdmin: boolean = false;
  uid: any;
  username: any;
  oldPassword: any;
  newPassword: any;
  confirmNewPassword: any;

  apiKey: any;

  ngOnInit() {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
    }
    this.uid = this.route.snapshot.paramMap.get('id');
    this.httpClient.get(`http://localhost:9090/auth/user/${this.uid}/`, {
      headers: {
        'Content-Type': 'application',
        'Authorization': `Token ${this.authService.getToken()}`
      }
    }).subscribe((response: any) => {
      this.isAdmin = response.is_admin;
      this.username = response.username;
      this.statistics = response.statistics;
    });
    if (this.isAdmin) {
      this.httpClient.get(`http://localhost:9090/auth/user/list/`, {
        headers: {
          'Content-Type': 'application',
          'Authorization': `Token ${this.authService.getToken()}`
        }
      }).subscribe((response: any) => {
        this.users = response.user;
      });
    }
}


  changePassword() {
    fetch(`http://localhost:9090/auth/user/${this.uid}/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${this.authService.getToken()}`
        },
      body: JSON.stringify({
        old_password: this.oldPassword,
        new_password: this.newPassword,
      })
    }).then(response => {
      if (response.ok) {
        this.authService.clearToken();
        this.router.navigate(['/login']);
      }
      throw new Error('Request failed!');
    }).catch(networkError => console.log(networkError.message));
  }

  changePermissions(user: any) {
    //TODO
  }


  setAPI(apiKey: any) {

  }
}

