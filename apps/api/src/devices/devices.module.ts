import { Module } from '@nestjs/common';
import { EncryptionService } from '../common/services/encryption.service';
import { CustomersModule } from '../customers/customers.module';
import { CustomerDevicesController } from './customer-devices.controller';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';

@Module({
  imports: [CustomersModule],
  controllers: [CustomerDevicesController, DevicesController],
  providers: [DevicesService, EncryptionService],
  exports: [DevicesService],
})
export class DevicesModule {}
