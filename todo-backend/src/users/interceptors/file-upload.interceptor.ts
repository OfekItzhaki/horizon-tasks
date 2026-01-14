import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';

export interface FileRequest extends Request {
  file?: Express.Multer.File;
}

@Injectable()
export class FileUploadInterceptor implements NestInterceptor {
  private readonly allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
  ];
  private readonly maxFileSize = 5 * 1024 * 1024; // 5MB

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<FileRequest>();

    if (request.file) {
      // Validate file type
      if (!this.allowedMimeTypes.includes(request.file.mimetype)) {
        throw new BadRequestException(
          `Invalid file type. Allowed types: ${this.allowedMimeTypes.join(', ')}`,
        );
      }

      // Validate file size
      if (request.file.size > this.maxFileSize) {
        throw new BadRequestException(
          `File too large. Maximum size is ${this.maxFileSize / 1024 / 1024}MB`,
        );
      }
    }

    return next.handle();
  }
}
