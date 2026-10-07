import { Controller, Get } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { DashboardResponseDto } from './dto/dashboard-response.dto';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  getDashboard(): Promise<DashboardResponseDto> {
    return this.reportsService.getDashboard();
  }
}
