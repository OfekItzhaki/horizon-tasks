import { Module } from '@nestjs/common';
import { ListSharesController } from './list-shares.controller';
import { ListSharesService } from './list-shares.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ListSharesController],
  providers: [ListSharesService],
  exports: [ListSharesService],
})
export class ListSharesModule {}
