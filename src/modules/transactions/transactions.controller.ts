import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';
import { Currency } from '../../common/constants/enums';
import { TransactionQueryDto } from './dto/transaction-query.dto';

@Controller('api/v1/transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  async findAll(@GetUser() user: User, @Query() query: TransactionQueryDto) {
    return this.transactionsService.findAll({
      userId: user.id,
      type: query.type,
      currency: query.currency,
      status: query.status,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get('stats')
  async getStats(
    @GetUser() user: User,
    @Query('currency') currency?: Currency,
  ) {
    return this.transactionsService.getTransactionStats(user.id, currency);
  }

  @Get(':id')
  async findOne(@GetUser() user: User, @Param('id') id: string) {
    const transaction = await this.transactionsService.findOne(id, user.id);

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }
}
