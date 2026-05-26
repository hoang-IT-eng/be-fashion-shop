import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ChatInputDto {
  @IsString()
  @MaxLength(2000)
  message: string;

  @IsOptional()
  @IsString()
  sessionId?: string;
}
