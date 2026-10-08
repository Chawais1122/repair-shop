import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { TimeClockController } from './time-clock.controller';
import { TimeClockService } from './time-clock.service';

@Module({
  imports: [UsersModule],
  controllers: [TimeClockController],
  providers: [TimeClockService],
  exports: [TimeClockService],
})
export class TimeClockModule {}
