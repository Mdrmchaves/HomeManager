import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { InventoryService } from '../../../core/services/inventory.service';
import { HouseholdService } from '../../../core/services/household.service';
import { SupabaseService } from '../../../core/services/supabase.service';
import { Household } from '../../../core/models/household.model';
import { CreateItemRequest } from '../../../core/models/inventory-item.model';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-item-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatInputModule,
    MatButtonModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatSelectModule,
    MatIconModule,
  ],
  templateUrl: './item-form.html',
  styleUrl: './item-form.scss'
})
export class ItemFormComponent implements OnInit {
  itemForm: FormGroup;
  loading = false;
  uploadingPhoto = false;
  households$!: Observable<Household[]>;

  selectedFile: File | null = null;
  photoPreviewUrl: string | null = null;

  readonly destinations = ['Undecided', 'Take', 'Sell', 'Donate', 'Trash'];

  constructor(
    private formBuilder: FormBuilder,
    private inventoryService: InventoryService,
    private householdService: HouseholdService,
    private supabaseService: SupabaseService,
    public router: Router,
    private snackBar: MatSnackBar
  ) {
    this.itemForm = this.formBuilder.group({
      householdId: ['', Validators.required],
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
      description: ['', Validators.maxLength(1000)],
      value: [null],
      location: ['', Validators.maxLength(255)],
      destination: [''],
      tags: [''],
    });
  }

  ngOnInit(): void {
    this.households$ = this.householdService.getMyHouseholds();
  }

  onPhotoSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.compressImage(file).then(compressed => {
      this.selectedFile = compressed;
      const reader = new FileReader();
      reader.onload = () => {
        this.photoPreviewUrl = reader.result as string;
      };
      reader.readAsDataURL(compressed);
    });

    // Reset input so the same file can be selected again if needed
    input.value = '';
  }

  private compressImage(file: File, maxWidth = 1200, quality = 0.82): Promise<File> {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          blob => resolve(new File([blob!], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })),
          'image/jpeg',
          quality
        );
      };
      img.src = url;
    });
  }

  removePhoto(): void {
    this.selectedFile = null;
    this.photoPreviewUrl = null;
  }

  async onSubmit(): Promise<void> {
    if (this.itemForm.invalid) {
      this.itemForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    let photoUrl: string | undefined;

    try {
      if (this.selectedFile) {
        this.uploadingPhoto = true;
        const tempId = crypto.randomUUID();
        photoUrl = await this.supabaseService.uploadItemPhoto(this.selectedFile, tempId);
        this.uploadingPhoto = false;
      }

      const formValue = this.itemForm.value;

      const tagsJson = formValue.tags
        ? JSON.stringify(
            formValue.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
          )
        : undefined;

      const payload: CreateItemRequest = {
        householdId: formValue.householdId,
        name: formValue.name,
        description: formValue.description || undefined,
        value: formValue.value ?? undefined,
        photoUrl,
        location: formValue.location || undefined,
        destination: formValue.destination || undefined,
        tags: tagsJson,
      };

      this.inventoryService.createItem(payload).subscribe({
        next: () => {
          this.snackBar.open('Item created successfully!', 'Close', { duration: 3000 });
          this.router.navigate(['/inventory']);
        },
        error: (err) => {
          console.error('Error creating item:', err);
          this.snackBar.open('Error creating item', 'Close', { duration: 5000 });
          this.loading = false;
        }
      });
    } catch (err) {
      console.error('Error uploading photo:', err);
      this.snackBar.open('Error uploading photo', 'Close', { duration: 5000 });
      this.uploadingPhoto = false;
      this.loading = false;
    }
  }
}
