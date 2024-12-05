import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private tokenKey = 'Authorization';

  // Save token
  setToken(token: string, uid: string): void {
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem('uid', uid);
  }

  // Retrieve token
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  // Retrieve uid
  getUid(): string | null {
    return localStorage.getItem('uid');
  }

  // Clear token
  clearToken(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem('uid');
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}
