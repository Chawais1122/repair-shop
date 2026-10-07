export class CustomerResponseDto {
  id!: string;
  name!: string;
  phone!: string;
  email!: string | null;
  address!: string | null;
  notes!: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}
