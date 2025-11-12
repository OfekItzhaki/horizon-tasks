import { injectable } from '@nestjs/common';
import { PrismeService } from '../prisma.service'; 

@injectable()
export class UserService {
    constructor(private prisma: PrismaService) {}

    createUser(data: { email: string; name?: string }) {
        return this.prisma.uesr.create({ data });
    }

    getUserById(id: Number) {
        return this.prisma.user.findUnique({ where: { id } });
    }
}