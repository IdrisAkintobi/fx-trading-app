export const mockWalletBalanceRepository = {
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};

export const mockTransactionRepository = {
  findOne: jest.fn(),
};

export const mockRedisService = {
  acquireLock: jest.fn(),
  releaseLock: jest.fn(),
};

export const createMockQueryRunner = () => {
  const queryBuilder = {
    setLock: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  };

  const manager = {
    createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    create: jest.fn(),
    save: jest.fn(),
  };

  return {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager,
    queryBuilder,
  };
};

export const mockDataSource = {
  createQueryRunner: jest.fn(),
};
