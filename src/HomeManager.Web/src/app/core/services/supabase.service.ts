import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment.development';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor() {
    this.supabase = createClient(
      environment.supabase_url,
      environment.supabase_anonKey
    );

    // Carrega sessão existente
    this.loadSession();

    // Listen auth changes
    this.supabase.auth.onAuthStateChange((event, session) => {
      this.currentUserSubject.next(session?.user ?? null);
    });
  }

  private async loadSession() {
    const { data } = await this.supabase.auth.getSession();
    this.currentUserSubject.next(data.session?.user ?? null);
  }

  async signUp(email: string, password: string, name: string) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name
        }
      }
    });

    if (error) throw error;
    return data;
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
    return data;
  }

  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;
  }

  async getSession() {
    const { data } = await this.supabase.auth.getSession();
    return data.session;
  }

  async getAccessToken(): Promise<string | null> {
    const session = await this.getSession();
    return session?.access_token ?? null;
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  // Upload de imagem
  async uploadItemPhoto(file: File, itemId: string): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${itemId}-${Date.now()}.${fileExt}`;
    const filePath = `items/${fileName}`;

    const { error } = await this.supabase.storage
      .from('item-photos')
      .upload(filePath, file);

    if (error) throw error;

    // Retorna URL pública
    const { data } = this.supabase.storage
      .from('item-photos')
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  async deleteItemPhoto(photoUrl: string) {
    // Extrai o path do URL
    const path = photoUrl.split('/item-photos/')[1];

    const { error } = await this.supabase.storage
      .from('item-photos')
      .remove([`items/${path}`]);

    if (error) throw error;
  }
}
