import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { MysteryBoxesService } from './mystery-boxes.service';
import {
  CreateMysteryBoxDto,
  DecodeStyleQuizDto,
  UpdateMysteryBoxDto,
} from './dto/mystery-box.dto';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { User, UserRole } from '../users/user.entity';

@ApiTags('Mystery Boxes & Style Codex')
@Controller('mystery-boxes')
export class MysteryBoxesController {
  constructor(
    private readonly mysteryBoxesService: MysteryBoxesService,
    private readonly jwtService: JwtService,
  ) {}

  @Get()
  @Public()
  findAll() {
    return this.mysteryBoxesService.findAll(false);
  }

  @Get('quiz-questions')
  @Public()
  getQuizQuestions() {
    return this.mysteryBoxesService.getQuizQuestions();
  }

  @Post('decode-style')
  @HttpCode(HttpStatus.OK)
  @Public()
  async decodeStyle(@Req() req: Request, @Body() dto: DecodeStyleQuizDto) {
    const userId = await this.extractOptionalUserId(req);
    return this.mysteryBoxesService.decodeStyle(dto, userId);
  }

  @Get('my-codex')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard)
  getMyCodex(@Req() req: Request) {
    const user = req.user as User;
    return this.mysteryBoxesService.getMyCodex(user.id);
  }

  @Get('profiles')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getAllProfiles() {
    return this.mysteryBoxesService.getAllProfiles();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateMysteryBoxDto) {
    return this.mysteryBoxesService.create(dto);
  }

  @Put(':id')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMysteryBoxDto,
  ) {
    return this.mysteryBoxesService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth('access-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.mysteryBoxesService.remove(id);
  }

  private async extractOptionalUserId(
    req: Request,
  ): Promise<number | undefined> {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return undefined;
    try {
      const payload = await this.jwtService.verifyAsync<{ sub: number }>(
        auth.slice(7),
      );
      return payload.sub;
    } catch {
      return undefined;
    }
  }
}
