import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { UsersService } from '../../../../src/modules/users/users.service';
import { User } from '../../../../src/modules/users/entities/user.entity';
import { mockUsersRepository } from '../mocks/repository.mock';
import { mockUser } from '../mocks/data.mock';

jest.mock('argon2');

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUsersRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new user successfully', async () => {
      const email = 'newuser@example.com';
      const password = 'SecurePass123!';
      const hashedPassword = '$argon2id$v=19$m=65536,t=3,p=4$hashed';

      mockUsersRepository.findOne.mockResolvedValue(null);
      (argon2.hash as jest.Mock).mockResolvedValue(hashedPassword);
      mockUsersRepository.create.mockReturnValue({
        email,
        password: hashedPassword,
      });
      mockUsersRepository.save.mockResolvedValue(mockUser);

      const result = await service.create(email, password);

      expect(mockUsersRepository.findOne).toHaveBeenCalledWith({
        where: { email },
      });
      expect(argon2.hash).toHaveBeenCalledWith(password);
      expect(mockUsersRepository.create).toHaveBeenCalledWith({
        email,
        password: hashedPassword,
      });
      expect(mockUsersRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockUser);
    });

    it('should throw ConflictException if user already exists', async () => {
      const email = 'existing@example.com';
      const password = 'SecurePass123!';

      mockUsersRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.create(email, password)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(email, password)).rejects.toThrow(
        'User with this email already exists',
      );
      expect(mockUsersRepository.findOne).toHaveBeenCalledWith({
        where: { email },
      });
      expect(argon2.hash).not.toHaveBeenCalled();
      expect(mockUsersRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('findByEmail', () => {
    it('should return a user by email', async () => {
      const email = 'test@example.com';
      mockUsersRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail(email);

      expect(result).toEqual(mockUser);
      expect(mockUsersRepository.findOne).toHaveBeenCalledWith({
        where: { email },
      });
    });

    it('should return null if user not found', async () => {
      const email = 'notfound@example.com';
      mockUsersRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail(email);

      expect(result).toBeNull();
      expect(mockUsersRepository.findOne).toHaveBeenCalledWith({
        where: { email },
      });
    });
  });

  describe('findById', () => {
    it('should return a user by id', async () => {
      const userId = 'user-123';
      mockUsersRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findById(userId);

      expect(result).toEqual(mockUser);
      expect(mockUsersRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      const userId = 'nonexistent-id';
      mockUsersRepository.findOne.mockResolvedValue(null);

      await expect(service.findById(userId)).rejects.toThrow(NotFoundException);
      await expect(service.findById(userId)).rejects.toThrow('User not found');
      expect(mockUsersRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
      });
    });
  });

  describe('verifyUser', () => {
    it('should update user verification status', async () => {
      const userId = 'user-123';
      mockUsersRepository.update.mockResolvedValue({ affected: 1 });

      await service.verifyUser(userId);

      expect(mockUsersRepository.update).toHaveBeenCalledWith(userId, {
        isVerified: true,
      });
    });
  });

  describe('validatePassword', () => {
    it('should return true for valid password', async () => {
      const password = 'SecurePass123!';
      const hashedPassword = '$argon2id$v=19$m=65536,t=3,p=4$hashed';
      (argon2.verify as jest.Mock).mockResolvedValue(true);

      const result = await service.validatePassword(password, hashedPassword);

      expect(result).toBe(true);
      expect(argon2.verify).toHaveBeenCalledWith(hashedPassword, password);
    });

    it('should return false for invalid password', async () => {
      const password = 'WrongPassword123!';
      const hashedPassword = '$argon2id$v=19$m=65536,t=3,p=4$hashed';
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      const result = await service.validatePassword(password, hashedPassword);

      expect(result).toBe(false);
      expect(argon2.verify).toHaveBeenCalledWith(hashedPassword, password);
    });
  });
});
