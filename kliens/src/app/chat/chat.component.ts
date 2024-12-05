import {Component, inject} from '@angular/core';
import {MatCard, MatCardActions, MatCardContent, MatCardFooter, MatCardHeader} from '@angular/material/card';
import {AsyncPipe, NgForOf} from '@angular/common';
import {MatButton} from '@angular/material/button';
import {MatIcon} from '@angular/material/icon';
import {Router, RouterLink} from '@angular/router';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {Chat} from './model.component';
import {AuthService} from '../services/auth.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    MatCard,
    MatCardHeader,
    MatCardContent,
    MatIcon,
    NgForOf,
    MatCardActions,
    MatCardFooter,
    MatButton,
    RouterLink,
    AsyncPipe
  ],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css'
})
export class ChatComponent{
  private httpClient = inject(HttpClient);
  private router = inject(Router);
  private authService = inject(AuthService);
  private url = `http://localhost:9090/petra/chats/${this.authService.getUid()}/`;
  chats: Observable<Chat[]> = this.httpClient.get<Chat[]>(this.url,{
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Token ${this.authService.getToken()}`
    }
  });

  deleteChat(id: number) {
    fetch(`http://localhost:9090/petra/chat/${id}/`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${this.authService.getToken()}`
      }
    }).then(response => {
      if (response.ok) {
        return response.json();
      }
      throw new Error('Request failed!');
    }, networkError => console.log(networkError.message))
    .then(jsonResponse => {
      this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
        this.router.navigate(['/chat']);
      });
    }).catch(networkError => console.log(networkError.message));
  }
}
