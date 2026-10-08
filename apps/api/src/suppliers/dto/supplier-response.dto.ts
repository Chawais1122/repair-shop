export class SupplierResponseDto {
  id!: string;
  name!: string;
  contactName!: string | null;
  email!: string | null;
  phone!: string | null;
  website!: string | null;
  notes!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}
