import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { ConciergeService } from './concierge.service';
import { CreateConciergeDto, ReviewConciergeDto } from './dto/concierge.dto';
import { ConciergeStatus } from './concierge-request.entity';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { User, UserRole } from '../users/user.entity';

@ApiTags('Concierge Sourcing')
@Controller('concierge')
export class ConciergeController {
  constructor(
    private readonly conciergeService: ConciergeService,
    private readonly jwtService: JwtService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Public()
  async create(@Req() req: Request, @Body() dto: CreateConciergeDto) {
    const user = await this.extractOptionalUser(req);
    return this.conciergeService.create(dto, user);
  }

  @Get('my')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  findMy(@Req() req: Request) {
    const user = req.user as User;
    return this.conciergeService.findMy(user.id);
  }

  @Get()
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  findAll(@Query('status') status?: ConciergeStatus) {
    return this.conciergeService.findAll(status);
  }

  @Patch(':id/review')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  review(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReviewConciergeDto,
  ) {
    return this.conciergeService.review(id, dto);
  }

  private async extractOptionalUser(
    req: Request,
  ): Promise<{ id: number; email?: string } | undefined> {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return undefined;
    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: number;
        email?: string;
      }>(auth.slice(7));
      return { id: payload.sub, email: payload.email };
    } catch {
      return undefined;
    }
  }
}
