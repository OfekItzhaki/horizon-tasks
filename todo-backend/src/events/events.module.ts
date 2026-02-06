import { Module, Global } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { EventsService } from './events.service';
import { JwtModule } from '@nestjs/jwt';

@Global()
@Module({
    imports: [
        JwtModule.register({
            secret: process.env.JWT_SECRET || 'dev-secret',
            signOptions: { expiresIn: '1d' },
        }),
    ],
    providers: [EventsGateway, EventsService],
    exports: [EventsGateway, EventsService],
})
export class EventsModule { }
