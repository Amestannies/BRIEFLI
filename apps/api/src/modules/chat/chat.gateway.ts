import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../../prisma/prisma.service';

interface JoinPayload {
  room: string;
  token?: string;
  userId?: string;
}

interface MessagePayload {
  room: string;
  body: string;
  senderType: 'CLIENT' | 'FIRM';
  senderId: string;
  caseId?: string;
  firmId: string;
  clientId: string;
}

interface TypingPayload {
  room: string;
  senderType: string;
}

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/chat' })
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  constructor(private readonly prisma: PrismaService) {}

  handleConnection(client: Socket) {
    console.log(`Chat client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Chat client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join')
  handleJoin(@MessageBody() payload: JoinPayload, @ConnectedSocket() client: Socket) {
    client.join(payload.room);
    client.emit('joined', { room: payload.room });
  }

  @SubscribeMessage('message')
  async handleMessage(@MessageBody() payload: MessagePayload, @ConnectedSocket() client: Socket) {
    try {
      const msg = await this.prisma.portalMessage.create({
        data: {
          firmId: payload.firmId,
          clientId: payload.clientId,
          caseId: payload.caseId ?? null,
          senderId: payload.senderId,
          senderType: payload.senderType,
          body: payload.body,
        },
      });
      this.server.to(payload.room).emit('message', msg);
    } catch {
      client.emit('error', { message: 'Failed to save message' });
    }
  }

  @SubscribeMessage('typing')
  handleTyping(@MessageBody() payload: TypingPayload, @ConnectedSocket() client: Socket) {
    client.to(payload.room).emit('typing', { senderType: payload.senderType });
  }

  @SubscribeMessage('read')
  async handleRead(
    @MessageBody() payload: { room: string; clientId: string },
    @ConnectedSocket() _client: Socket,
  ) {
    await this.prisma.portalMessage.updateMany({
      where: { clientId: payload.clientId, isRead: false },
      data: { isRead: true },
    });
    this.server.to(payload.room).emit('read', { clientId: payload.clientId });
  }
}
