import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ConfirmImportDto } from './dto/confirm-import.dto';
import { MfImportService } from './mf-import.service';

@Controller('mf-import')
@UseGuards(JwtAuthGuard)
export class MfImportController {
  constructor(private readonly mfImportService: MfImportService) {}

  /**
   * POST /mf-import/upload
   * Accepts a multipart CSV file (field name: "file").
   * Returns parsed holdings for user review before confirmation.
   */
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
      fileFilter: (_req, file, cb) => {
        if (!file.originalname.match(/\.(csv|txt)$/i)) {
          return cb(new BadRequestException('Only CSV files are accepted.'), false);
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
    return this.mfImportService.uploadAndParse(req.user.userId, file.originalname, content);
  }

  /**
   * POST /mf-import/confirm
   * User confirms (optionally edited) holdings → upserted into investments.
   */
  @Post('confirm')
  confirmImport(@Request() req: any, @Body() dto: ConfirmImportDto) {
    return this.mfImportService.confirmImport(req.user.userId, dto);
  }

  /**
   * GET /mf-import/sessions
   * Returns past import session history for the user.
   */
  @Get('sessions')
  getSessions(@Request() req: any) {
    return this.mfImportService.getSessions(req.user.userId);
  }
}
