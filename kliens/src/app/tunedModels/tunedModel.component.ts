import {Component, inject, OnInit} from '@angular/core';
import {MatButton} from "@angular/material/button";
import {MatCard, MatCardContent, MatCardFooter, MatCardHeader} from "@angular/material/card";
import {Router, RouterLink} from '@angular/router';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {tunedModel} from '../new-chat/model.component';
import {AsyncPipe, NgForOf} from '@angular/common';
import {AuthService} from '../services/auth.service';

@Component({
  selector: 'app-context',
  standalone: true,
  imports: [
    MatButton,
    MatCard,
    MatCardContent,
    MatCardFooter,
    MatCardHeader,
    RouterLink,
    NgForOf,
    AsyncPipe
  ],
  templateUrl: './tunedModel.component.html',
  styleUrl: './tunedModel.component.css'
})
export class TunedModelComponent implements OnInit {
  private httpClient = inject(HttpClient);
  private authService = inject(AuthService);
  private router = inject(Router);
  private url = 'http://localhost:9090/petra/models/list/';

  ngOnInit() {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
    }
  }
  models: Observable<tunedModel[]> = this.httpClient.get<tunedModel[]>(this.url, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Token ${this.authService.getToken()}`
    }
  });

}
