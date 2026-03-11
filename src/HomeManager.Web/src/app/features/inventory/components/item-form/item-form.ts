import { Component, Input, Output, EventEmitter, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
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

  form!: FormGroup;
  saving = false;
  deleting = false;
  error = '';
  isEdit = false;

  selectedFile: File | null = null;
  previewUrl: string | null = null;
  loadingPhoto = false;
  showDeleteConfirm = false;

  readonly destinationOptions = [
    { value: 'Undecided', label: 'Indefinido' },
    { value: 'Take', label: 'Levar' },
    { value: 'Sell', label: 'Vender' },
    { value: 'Donate', label: 'Dar' },
    { value: 'Trash', label: 'Descartar' },
  ];

  constructor(
    private fb: FormBuilder,
    private inventoryService: InventoryService,
    private supabaseService: SupabaseService,
    private cdr: ChangeDetectorRef
  ) {}

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
    this.loadingPhoto = true;
    this.cdr.markForCheck();
    try {
      const urls = await this.supabaseService.createSignedUrls([photoPath]);
      this.previewUrl = urls[photoPath] ?? null;
    } catch {
      // preview not critical
    } finally {
      this.loadingPhoto = false;
      this.cdr.markForCheck();
    }
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.selectedFile = file;
    const reader = new FileReader();
    reader.onload = e => {
      this.previewUrl = e.target?.result as string;
      this.cdr.markForCheck();
    };
    reader.readAsDataURL(file);
  }

  async submit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving) return;
    this.saving = true;
    this.error = '';

    try {
      let photoUrl = this.item?.photoUrl;
      if (this.selectedFile) {
        const tempId = crypto.randomUUID();
        photoUrl = await this.supabaseService.uploadItemPhoto(this.selectedFile, tempId);
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

      this.saving = false;
      this.cdr.markForCheck();
      this.saved.emit();
    } catch {
      this.error = 'Ocorreu um erro ao guardar. Tenta novamente.';
      this.saving = false;
      this.cdr.markForCheck();
    }
  }

  confirmDelete(): void {
    this.showDeleteConfirm = true;
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
  }

  async deleteItem(): Promise<void> {
    if (!this.item || this.deleting) return;
    this.deleting = true;
    this.error = '';

    try {
      await firstValueFrom(this.inventoryService.deleteItem(this.item.id));
      if (this.item.photoUrl) {
        try {
          await this.supabaseService.deleteItemPhoto(this.item.photoUrl);
        } catch {
          // best-effort storage cleanup
        }
      }
      this.deleting = false;
      this.cdr.markForCheck();
      this.saved.emit();
    } catch {
      this.error = 'Ocorreu um erro ao apagar. Tenta novamente.';
      this.deleting = false;
      this.cdr.markForCheck();
    }
  }

  close(): void {
    this.closed.emit();
  }
}
