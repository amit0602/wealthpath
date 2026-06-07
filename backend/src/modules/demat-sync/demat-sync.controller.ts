import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ConfirmDematDto } from './dto/confirm-demat.dto';
import { DematSyncService } from './demat-sync.service';

@Controller('demat-sync')
@UseGuards(JwtAuthGuard)
export class DematSyncController {
  constructor(private readonly dematSyncService: DematSyncService) {}

  /**
   * POST /demat-sync/upload
   * Accepts a multipart CSV file (field name: "file").
   * Returns parsed equity holdings for user review before confirmation.
   */
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
      fileFilter: (_req, file, cb) => {
        if (!file.originalname.match(/\.(csv|txt)$/i)) {
          return cb(
            new BadRequestException('Only CSV files are accepted.'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  uploadCas(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file uploaded.');
    const content = file.buffer.toString('utf-8');
    return this.dematSyncService.uploadAndParse(
      req.user.userId,
      file.originalname,
      content,
    );
  }

  /**
   * POST /demat-sync/confirm
   * User confirms (optionally edited) holdings → upserted into investments.
   */
  @Post('confirm')
  confirmSync(@Request() req: any, @Body() dto: ConfirmDematDto) {
    return this.dematSyncService.confirmSync(req.user.userId, dto);
  }

  /**
   * GET /demat-sync/sessions
   * Returns past sync session history for the user.
   */
  @Get('sessions')
  getSessions(@Request() req: any) {
    return this.dematSyncService.getSessions(req.user.userId);
  }
}
