# FX Trading App Backend

A production-ready multi-currency FX trading application backend built with NestJS, PostgreSQL, Redis, and TypeORM.

## Features

- 🔐 **Secure Authentication**: JWT-based authentication with email verification via OTP
- 💰 **Multi-Currency Wallet**: Support for NGN, USD, EUR, GBP, JPY, CAD, AUD
- 💱 **Real-Time FX Rates**: Live exchange rates with Redis caching
- 🔄 **Currency Trading**: Convert and trade between currencies with distributed locking
- 📊 **Transaction History**: Comprehensive transaction tracking with pagination and filtering
- 🔒 **Idempotency**: Prevent duplicate transactions with idempotency keys
- 🧪 **Comprehensive Testing**: 49 unit tests + 43 E2E tests
- 📝 **Postman Collection**: Complete API documentation with examples

## Tech Stack

- **Node.js 24** - Using native `.env` support
- **NestJS 11** - With Fastify adapter for better performance
- **PostgreSQL 17** - Relational database with TypeORM
- **Redis 8.0** - For caching and distributed locks (using ioredis)
- **TypeScript** - Type-safe development
- **Argon2** - Secure password hashing
- **Jest** - Testing framework
- **Docker Compose** - For local development

## Architecture Highlights

- **Multi-currency wallet**: Separate `wallet_balances` table for better concurrency
- **Locking strategy**: Pessimistic locking + distributed Redis locks
- **OTP storage**: Redis-only with SHA-256 hashing and auto-expiry
- **Stateless JWT**: No session tracking required
- **Idempotency**: Transaction idempotency keys prevent duplicates
- **Deadlock prevention**: Lock currencies in alphabetical order
- **Demand-driven caching**: FX rates cached for 5 minutes
- **Controller-level versioning**: `/api/v1/*` endpoints

## Prerequisites

- Node.js 24+
- pnpm 9+
- Docker and Docker Compose (for local development)
- PostgreSQL 17 (or use Docker Compose)
- Redis 8.0 (or use Docker Compose)

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd fx-trading-app
pnpm install
```

### 2. Environment Setup

Copy the example environment file and update the values:

```bash
cp .env.example .env
```

**Important:** Edit the `.env` file and follow the instructions in `.env.example` to configure all required environment variables.

Key variables to configure:
- **Database credentials**: Update if not using default Docker Compose values
- **JWT_SECRET**: Change to a strong random secret for production
- **SMTP settings**: Configure your email service provider details
- **FX_RATE_API_KEY**: Get your free API key from [ExchangeRate-API](https://www.exchangerate-api.com/)

> 💡 **Tip:** All variables have sensible defaults defined in `src/config/env.schema.ts`. Only override what you need to change.

### 3. Start Services with Docker Compose

```bash
docker-compose up -d
```

This starts PostgreSQL, Redis, and pgAdmin.

### 4. Run Database Migrations

```bash
pnpm run migration:run
```

### 5. Start the Application

```bash
# Development mode with hot reload
pnpm run start:dev

# Production mode
pnpm run build
pnpm run start:prod
```

The API will be available at `http://localhost:3000`

## API Documentation

Import the Postman collection from `docs/postman-collection.json` into Postman or Insomnia for complete API documentation with examples and pre-configured requests.

The collection includes:
- All API endpoints with example requests and responses
- Authentication flow examples
- Pre-configured environment variables
- Comprehensive test scenarios

### Key Endpoints

#### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/verify-email` - Verify email with OTP
- `POST /api/v1/auth/send-otp` - Resend OTP
- `POST /api/v1/auth/login` - Login and get JWT token

#### Wallet
- `GET /api/v1/wallet/balances` - Get all wallet balances
- `GET /api/v1/wallet/balance/:currency` - Get balance for specific currency
- `POST /api/v1/wallet/fund` - Fund wallet
- `POST /api/v1/wallet/convert` - Convert currency
- `POST /api/v1/wallet/trade` - Trade currency

#### Transactions
- `GET /api/v1/transactions` - Get transaction history (with pagination)
- `GET /api/v1/transactions/:id` - Get single transaction
- `GET /api/v1/transactions/stats` - Get transaction statistics

#### FX Rates
- `GET /api/v1/fx-rates/rate?from=USD&to=EUR` - Get exchange rate

## Testing

### Run Unit Tests

```bash
# All unit tests
pnpm test

# Specific module
pnpm test test/unit/users

# Watch mode
pnpm test:watch

# Coverage
pnpm test:cov
```

### Run E2E Tests

**IMPORTANT:** E2E tests use a separate test database to avoid polluting your development data.

#### Setup Test Database (One-time)

```bash
# 1. Create test database (if using Docker Compose)
docker exec -it fx-trading-postgres psql -U postgres -c "CREATE DATABASE fx_trading_test;"

# 2. Copy and configure test environment
cp .env.example .env.test
# Edit .env.test and set DATABASE_NAME=fx_trading_test and REDIS_DB=1

# 3. Run migrations on test database
NODE_ENV=test node --env-file=.env.test node_modules/.bin/typeorm migration:run -d src/data-source.ts
```

#### Run Tests

```bash
# E2E tests will automatically use .env.test
pnpm test:e2e
```

**Note:** E2E tests use:
- Database: `fx_trading_test` (separate from `fx_trading`)
- Redis DB: `1` (separate from default DB `0`)
- Mocked external services (Email, FX Rate API)

## Database Management

### Create a New Migration

```bash
pnpm run migration:create src/database/migrations/MigrationName
```

### Generate Migration from Entities

```bash
pnpm run migration:generate src/database/migrations/MigrationName
```

### Run Migrations

```bash
pnpm run migration:run
```

### Revert Last Migration

```bash
pnpm run migration:revert
```

## Development Tools

### Access pgAdmin

pgAdmin is available at `http://localhost:5050`
- Email: `admin@admin.com`
- Password: `admin`

### Linting and Formatting

```bash
# Lint code
pnpm run lint

# Format code
pnpm run format
```

### Git Hooks

Husky is configured with:
- **Pre-commit**: Lint and format staged files
- **Pre-push**: Run tests and build

## Project Structure

```
src/
├── common/                  # Shared utilities
│   ├── constants/          # Enums and constants
│   ├── decorators/         # Custom decorators
│   ├── filters/            # Exception filters
│   ├── guards/             # Auth guards
│   ├── interceptors/       # Logging and transform interceptors
│   └── pagination/         # Pagination utilities
├── config/                 # Configuration
│   ├── env.validation.ts   # Environment validation
│   └── env.schema.ts       # Environment schema (no defaults - enforced)
├── database/               # Database configuration
│   └── migrations/         # TypeORM migrations
├── modules/                # Feature modules
│   ├── auth/              # Authentication
│   ├── email/             # Email service
│   ├── fx-rates/          # Exchange rates
│   ├── redis/             # Redis service
│   ├── transactions/      # Transaction history
│   ├── users/             # User management
│   └── wallet/            # Wallet operations
└── main.ts                # Application entry point

test/
├── e2e/                   # E2E test suites
│   ├── test-setup.ts      # E2E app configuration
│   └── test-utils.ts      # Cleanup utilities
├── unit/                  # Unit tests
├── setup.ts              # Test configuration
└── global-teardown.ts    # Clean database after all tests

docs/
└── postman-collection.json  # Postman API collection
```

## Configuration

**All environment variables are required** and must be set in `.env` file or via environment. The application will fail to start if any required variables are missing. See `.env.example` for the complete list.

### Key Configuration Options

- **Environment**: `NODE_ENV` (development, production, test)
- **Logging**: `LOG_LEVEL` (debug, info, warn, error) - default: info
- **Database**: All database config required (HOST, PORT, USER, PASSWORD, NAME)
- **Redis**: `REDIS_HOST`, `REDIS_PORT`, `REDIS_DB` (optional, default: 0)
- **JWT**: `JWT_SECRET`, `JWT_EXPIRATION`, `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRATION`
- **OTP**: `OTP_EXPIRATION_SEC`, `OTP_LENGTH`
- **FX Rates**: `FX_RATE_API_URL`, `FX_RATE_API_KEY`, `FX_RATE_CACHE_TTL_SEC`
- **Email**: SMTP configuration (HOST, PORT, USER, PASSWORD, EMAIL_FROM)

> 💡 **Tip**: Copy `.env.example` to `.env` and update all values before running the app.

## Security Features

- ✅ Argon2 password hashing
- ✅ JWT token authentication
- ✅ OTP verification with SHA-256 hashing
- ✅ Rate limiting ready (implement with Redis)
- ✅ CORS configured
- ✅ Helmet for security headers
- ✅ Input validation with class-validator
- ✅ SQL injection prevention (TypeORM parameterized queries)
- ✅ Distributed locks to prevent race conditions

## Performance Optimizations

- ✅ Fastify adapter (faster than Express)
- ✅ Redis caching for FX rates
- ✅ Pessimistic + distributed locking for wallet operations
- ✅ Deadlock prevention with alphabetical lock ordering
- ✅ Pagination for large data sets
- ✅ Efficient database queries with TypeORM

## Production Considerations

Before deploying to production:

1. **Environment Variables**: Set strong secrets for `JWT_SECRET` and database passwords
2. **Database & Redis**: Ensure you have production-ready instances configured
3. **Email**: Configure proper SMTP service credentials
4. **FX Rates API**: Get production API key from ExchangeRate-API
5. **Rate Limiting**: Implement rate limiting for API endpoints
6. **HTTPS**: Use HTTPS in production
7. **Database Backups**: Set up automated backups

## API Rate Limits (Recommended)

Consider implementing these rate limits:

- Authentication endpoints: 5 requests per minute per IP
- Wallet operations: 10 requests per minute per user
- FX rate queries: 30 requests per minute per user
- General endpoints: 100 requests per minute per user

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker-compose ps

# View PostgreSQL logs
docker-compose logs postgres
```

### Redis Connection Issues

```bash
# Check if Redis is running
docker-compose ps

# View Redis logs
docker-compose logs redis
```

### Migration Issues

```bash
# Check migration status
pnpm run typeorm migration:show

# Revert and re-run
pnpm run migration:revert
pnpm run migration:run
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Message Guidelines

- Use present tense ("Add feature" not "Added feature")
- Keep first line under 50 characters
- Reference issues and pull requests when relevant
- Use conventional commits format: `type: description`

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For questions and support:
- Open an issue on GitHub
- Contact: support@fxtradingapp.com

## Acknowledgments

- Built with [NestJS](https://nestjs.com/)
- Exchange rates powered by [ExchangeRate-API](https://www.exchangerate-api.com/)
- Icons and UI inspiration from various open-source projects
