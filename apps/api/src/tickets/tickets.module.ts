import { Module } from '@nestjs/common';
import { CustomersModule } from '../customers/customers.module';
import { DevicesModule } from '../devices/devices.module';
import { InventoryModule } from '../inventory/inventory.module';
import { UsersModule } from '../users/users.module';
import { TicketItemsController } from './ticket-items.controller';
import { TicketItemsService } from './ticket-items.service';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

@Module({
  imports: [CustomersModule, DevicesModule, UsersModule, InventoryModule],
  controllers: [TicketsController, TicketItemsController],
  providers: [TicketsService, TicketItemsService],
  exports: [TicketsService, TicketItemsService],
})
export class TicketsModule {}
