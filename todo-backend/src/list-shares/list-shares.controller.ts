import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ListSharesService } from './list-shares.service';
import { ShareListDto } from './dto/share-list.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../auth/current-user.decorator';

@ApiTags('List Sharing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('list-shares')
export class ListSharesController {
  constructor(private readonly listSharesService: ListSharesService) {}

  @Post('todo-list/:todoListId')
  @ApiOperation({ summary: 'Share a list with another user' })
  @ApiResponse({ status: 201, description: 'List shared successfully' })
  @ApiResponse({ status: 404, description: 'List or user not found' })
  shareList(
    @Param('todoListId', ParseIntPipe) todoListId: number,
    @Body() shareListDto: ShareListDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.listSharesService.shareList(
      todoListId,
      shareListDto,
      user.userId,
    );
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get all lists shared with a user' })
  @ApiResponse({ status: 200, description: 'Returns shared lists' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - can only view own shares',
  })
  getSharedLists(
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    if (user.userId !== userId) {
      throw new ForbiddenException("Cannot view another user's shares");
    }
    return this.listSharesService.getSharedLists(userId);
  }

  @Get('todo-list/:todoListId')
  @ApiOperation({ summary: 'Get all users a list is shared with' })
  @ApiResponse({ status: 200, description: 'Returns list of users' })
  @ApiResponse({ status: 404, description: 'List not found' })
  getListShares(
    @Param('todoListId', ParseIntPipe) todoListId: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.listSharesService.getListShares(todoListId, user.userId);
  }

  @Delete('todo-list/:todoListId/user/:userId')
  @ApiOperation({ summary: 'Unshare a list with a user' })
  @ApiResponse({ status: 200, description: 'List unshared successfully' })
  @ApiResponse({ status: 404, description: 'List or share not found' })
  unshareList(
    @Param('todoListId', ParseIntPipe) todoListId: number,
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.listSharesService.unshareList(todoListId, userId, user.userId);
  }
}
