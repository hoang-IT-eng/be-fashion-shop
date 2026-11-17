import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuctionsService } from './auctions.service';
import {
  CreateAuctionDto,
  ExtendAuctionDto,
  PlaceBidDto,
  UpdateAuctionDto,
} from './dto/create-auction.dto';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { User, UserRole } from '../users/user.entity';

@ApiTags('Auctions')
@Controller('auctions')
export class AuctionsController {
  constructor(private readonly auctionsService: AuctionsService) {}

  @Get()
  @Public()
  findAll(@Query('status') status?: string) {
    return this.auctionsService.findAll(status);
  }

  @Get(':id')
  @Public()
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.auctionsService.findOne(id);
  }

  @Post(':id/bids')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  placeBid(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
    @Body() dto: PlaceBidDto,
  ) {
    const user = req.user as User;
    return this.auctionsService.placeBid({
      auctionId: id,
      userId: user.id,
      userName: user.name,
      dto,
    });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateAuctionDto) {
    return this.auctionsService.create(dto);
  }

  @Put(':id')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAuctionDto) {
    return this.auctionsService.update(id, dto);
  }

  @Patch(':id/extend')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  extendLot(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ExtendAuctionDto,
  ) {
    return this.auctionsService.extendLot(id, dto.seconds);
  }

  @Patch(':id/settle')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  settleLot(@Param('id', ParseIntPipe) id: number) {
    return this.auctionsService.settleLot(id);
  }

  @Delete(':id')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.auctionsService.remove(id);
  }
}
