import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger('EventsGateway');
    private userSockets = new Map<string, string[]>(); // userId -> socketIds
    private userPresence = new Map<string, string>(); // socketId -> listId

    constructor(private readonly jwtService: JwtService) { }

    async handleConnection(client: Socket) {
        try {
            const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];
            if (!token) {
                client.disconnect();
                return;
            }

            const payload = this.jwtService.verify(token);
            const userId = payload.sub;

            client.data.userId = userId;

            const sockets = this.userSockets.get(userId) || [];
            sockets.push(client.id);
            this.userSockets.set(userId, sockets);

            this.logger.log(`Client connected: ${client.id} (User: ${userId})`);
        } catch (e) {
            this.logger.error(`Connection failed: ${e.message}`);
            client.disconnect();
        }
    }

    handleDisconnect(client: Socket) {
        const userId = client.data.userId;
        if (userId) {
            const sockets = this.userSockets.get(userId) || [];
            const updatedSockets = sockets.filter(id => id !== client.id);
            if (updatedSockets.length > 0) {
                this.userSockets.set(userId, updatedSockets);
            } else {
                this.userSockets.delete(userId);
            }
        }

        // Clean up presence if they were in a list
        const listId = this.userPresence.get(client.id);
        if (listId) {
            this.userPresence.delete(client.id);
            this.server.to(`list:${listId}`).emit('user-left-list', { userId, listId });
        }

        this.logger.log(`Client disconnected: ${client.id}`);
    }

    @SubscribeMessage('enter-list')
    handleEnterList(client: Socket, listId: string) {
        const userId = client.data.userId;
        client.join(`list:${listId}`);
        this.userPresence.set(client.id, listId);
        this.logger.log(`User ${userId} entered list ${listId}`);
        this.server.to(`list:${listId}`).emit('user-entered-list', { userId, listId });
    }

    @SubscribeMessage('leave-list')
    handleLeaveList(client: Socket, listId: string) {
        const userId = client.data.userId;
        client.leave(`list:${listId}`);
        this.userPresence.delete(client.id);
        this.logger.log(`User ${userId} left list ${listId}`);
        this.server.to(`list:${listId}`).emit('user-left-list', { userId, listId });
    }

    @SubscribeMessage('ping')
    handlePing(client: Socket) {
        return { event: 'pong', data: new Date().toISOString() };
    }

    // Helper to send message to specific user
    sendToUser(userId: string, event: string, data: unknown) {
        const socketIds = this.userSockets.get(userId);
        if (socketIds) {
            socketIds.forEach(socketId => {
                this.server.to(socketId).emit(event, data);
            });
        }
    }

    // Broadcaster
    broadcast(event: string, data: unknown) {
        this.server.emit(event, data);
    }
}
