import { Test, TestingModule } from '@nestjs/testing';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { DashboardResponseDto } from './dto/dashboard-response.dto';
import { TicketStatus } from '@repair-shop/shared';

const mockDashboard: DashboardResponseDto = {
  totalCustomers: 5,
  totalTickets: 10,
  ticketsByStatus: Object.fromEntries(
    Object.values(TicketStatus).map((s) => [s, 0]),
  ) as Record<TicketStatus, number>,
  totalRevenue: '500.00',
  outstandingBalance: '120.00',
  recentTickets: [],
};

describe('ReportsController', () => {
  let controller: ReportsController;
  let service: { getDashboard: jest.Mock };

  beforeEach(async () => {
    service = { getDashboard: jest.fn().mockResolvedValue(mockDashboard) };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [{ provide: ReportsService, useValue: service }],
    }).compile();

    controller = module.get<ReportsController>(ReportsController);
  });

  it('delegates getDashboard to the service', async () => {
    const result = await controller.getDashboard();
    expect(service.getDashboard).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockDashboard);
  });
});
