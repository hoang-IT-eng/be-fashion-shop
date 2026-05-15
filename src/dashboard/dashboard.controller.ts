import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

@ApiTags('Dashboard')
@ApiBearerAuth('access-token')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  // GET /dashboard/stats
  @Get('stats')
  getStats() {
    return this.dashboardService.getStats();
  }

  // GET /dashboard/latest-orders
  @Get('latest-orders')
  getLatest2Orders() {
    return this.dashboardService.getLatest2Orders();
  }

  // GET /dashboard/revenue?year=2026
  @Get('revenue')
  getRevenueByMonth(@Query('year') year?: string) {
    const y = this.dashboardService.parseYear(year);
    return this.dashboardService.getRevenueByMonth(y);
  }
}
