import { Module } from '@nestjs/common';
import { MeController } from './me.controller';
import { GetTrashHandler } from './queries/handlers/get-trash.handler';
import { CqrsModule } from '@nestjs/cqrs';

@Module({
  imports: [CqrsModule],
  controllers: [MeController],
  providers: [GetTrashHandler],
})
export class MeModule { }
