import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateProfilePictureCommand } from '../update-profile-picture.command';
import { CloudinaryService } from '../../../common/cloudinary/cloudinary.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

interface CloudinaryResponse {
  secure_url: string;
}

@CommandHandler(UpdateProfilePictureCommand)
export class UpdateProfilePictureHandler
  implements ICommandHandler<UpdateProfilePictureCommand> {
  constructor(
    private readonly cloudinaryService: CloudinaryService,
    private readonly prisma: PrismaService,
  ) { }

  async execute(command: UpdateProfilePictureCommand) {
    const { userId, file } = command;

    // 1. Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // 2. Upload to Cloudinary
    // Logic: Resize/crop is already handled in CloudinaryService's transformation
    const result = (await this.cloudinaryService.uploadFile(
      file,
      'profile_pictures',
    )) as unknown;

    if (!result || typeof result !== 'object' || !('secure_url' in result)) {
      const error = result as { message?: string };
      throw new BadRequestException(
        `Cloudinary upload failed: ${error?.message || 'Unknown error'}`,
      );
    }

    const uploadResult = result as CloudinaryResponse;

    // 3. Update database with the new URL
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        profilePicture: uploadResult.secure_url,
      },
    });

    return {
      message: 'Profile picture updated successfully',
      profilePicture: updatedUser.profilePicture,
    };
  }
}
