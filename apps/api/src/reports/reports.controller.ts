import { Controller, Get, Query } from '@nestjs/common';
import { UserRole } from '@repair-shop/shared';
import { Roles } from '../auth/decorators/roles.decorator';
import { ReportsService } from './reports.service';
import { MetricsService } from './metrics.service';
import { DashboardResponseDto } from './dto/dashboard-response.dto';
import { MetricsQueryDto, MetricsResponseDto } from './dto/metrics.dto';

@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly metricsService: MetricsService,
  ) {}

  @Get('dashboard')
  getDashboard(): Promise<DashboardResponseDto> {
    return this.reportsService.getDashboard();
  }

  // Sales, profit and per-employee figures are owner/manager information
  @Get('metrics')
  @Roles(UserRole.ADMIN)
  getMetrics(@Query() query: MetricsQueryDto): Promise<MetricsResponseDto> {
    return this.metricsService.getMetrics(query);
  }
}
