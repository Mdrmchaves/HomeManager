import { Component, Input, Output, EventEmitter, OnInit, signal, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { InventoryItem, CreateItemRequest, UpdateItemRequest } from '../../../../core/models/inventory-item.model';
import { Location } from '../../../../core/models/location.model';
import { Category } from '../../../../core/models/category.model';
import { InventoryService } from '../../../../core/services/inventory.service';
import { SupabaseService } from '../../../../core/services/supabase.service';

@Component({
  selector: 'app-item-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './item-form.html'
})
export class ItemFormComponent implements OnInit {
  @Input() householdId!: string;
  @Input() locations: Location[] = [];
  @Input() categories: Category[] = [];
  @Input() item?: InventoryItem;
  @Input() preselectedLocationId?: string;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  private fb = inject(FormBuilder);
  private inventoryService = inject(InventoryService);
  private supabaseService = inject(SupabaseService);

  form!: FormGroup;
  isEdit = false;

  saving = signal(false);
  deleting = signal(false);
  error = signal('');
  selectedFile = signal<File | null>(null);
  previewUrl = signal<string | null>(null);
  loadingPhoto = signal(false);
  showDeleteConfirm = signal(false);

  readonly destinationOptions = [
    { value: 'Undecided', label: 'Indefinido' },
    { value: 'Take', label: 'Levar' },
    { value: 'Sell', label: 'Vender' },
    { value: 'Donate', label: 'Dar' },
    { value: 'Trash', label: 'Descartar' },
  ];

  ngOnInit(): void {
    this.isEdit = !!this.item;
    this.form = this.fb.group({
      name: [this.item?.name ?? '', Validators.required],
      quantity: [this.item?.quantity ?? null],
      locationId: [this.item?.locationId ?? this.preselectedLocationId ?? ''],
      categoryId: [this.item?.categoryId ?? ''],
      value: [this.item?.value ?? ''],
      description: [this.item?.description ?? ''],
      destination: [this.item?.destination ?? ''],
    });

    if (this.item?.photoUrl) {
      this.loadExistingPhoto(this.item.photoUrl);
    }
  }

  private async loadExistingPhoto(photoPath: string): Promise<void> {
    this.loadingPhoto.set(true);
    try {
      const urls = await this.supabaseService.createSignedUrls([photoPath]);
      this.previewUrl.set(urls[photoPath] ?? null);
    } catch {
      // preview not critical
    } finally {
      this.loadingPhoto.set(false);
    }
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.selectedFile.set(file);
    const reader = new FileReader();
    reader.onload = e => {
      this.previewUrl.set(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }

  async submit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    this.error.set('');

    try {
      let photoUrl = this.item?.photoUrl;
      if (this.selectedFile()) {
        const tempId = crypto.randomUUID();
        photoUrl = await this.supabaseService.uploadItemPhoto(this.selectedFile()!, tempId);
      }

      const v = this.form.getRawValue();
      const valueNum = v.value !== '' && v.value !== null ? Number(v.value) : undefined;

      if (this.isEdit && this.item) {
        const payload: UpdateItemRequest = {
          name: v.name,
          quantity: v.quantity ? Number(v.quantity) : undefined,
          locationId: v.locationId || undefined,
          categoryId: v.categoryId || undefined,
          value: valueNum,
          description: v.description || undefined,
          destination: v.destination || undefined,
          photoUrl,
        };
        await firstValueFrom(this.inventoryService.updateItem(this.item.id, payload));
      } else {
        const payload: CreateItemRequest = {
          householdId: this.householdId,
          name: v.name,
          quantity: v.quantity ? Number(v.quantity) : undefined,
          locationId: v.locationId || undefined,
          categoryId: v.categoryId || undefined,
          value: valueNum,
          description: v.description || undefined,
          destination: v.destination || undefined,
          photoUrl,
        };
        await firstValueFrom(this.inventoryService.createItem(payload));
      }

      this.saving.set(false);
      this.saved.emit();
    } catch {
      this.error.set('Ocorreu um erro ao guardar. Tenta novamente.');
      this.saving.set(false);
    }
  }

  confirmDelete(): void {
    this.showDeleteConfirm.set(true);
  }

  cancelDelete(): void {
    this.showDeleteConfirm.set(false);
  }

  async deleteItem(): Promise<void> {
    if (!this.item || this.deleting()) return;
    this.deleting.set(true);
    this.error.set('');

    try {
      await firstValueFrom(this.inventoryService.deleteItem(this.item.id));
      if (this.item.photoUrl) {
        try {
          await this.supabaseService.deleteItemPhoto(this.item.photoUrl);
        } catch {
          // best-effort storage cleanup
        }
      }
      this.deleting.set(false);
      this.saved.emit();
    } catch {
      this.error.set('Ocorreu um erro ao apagar. Tenta novamente.');
      this.deleting.set(false);
    }
  }

  close(): void {
    this.closed.emit();
  }
}
