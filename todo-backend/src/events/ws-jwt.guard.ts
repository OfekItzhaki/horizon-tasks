import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
    private logger = new Logger('WsJwtGuard');

    constructor(private readonly jwtService: JwtService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        try {
            const client: Socket = context.switchToWs().getClient<Socket>();
            const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];

            if (!token) {
                throw new WsException('No token provided');
            }

            const payload = this.jwtService.verify(token);
            client.data.user = payload;

            return true;
        } catch (err) {
            this.logger.error(`WS Authentication failed: ${err.message}`);
            throw new WsException('Unauthorized access');
        }
    }
}
