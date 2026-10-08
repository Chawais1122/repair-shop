import { IsInt, IsNotEmpty, IsString, MaxLength, NotEquals } from 'class-validator';

export class AdjustStockDto {
  // Positive to add stock, negative to remove (damaged, lost, recount).
  @IsInt()
  @NotEquals(0)
  change!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  note!: string;
}
