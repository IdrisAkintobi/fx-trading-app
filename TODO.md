# FX Trading App - TODO

## Phase 1: MVP Enhancements (Must Have)

### User Experience
- [ ] Collect user's first name during registration
- [ ] Update email templates to use first name for personalization
- [ ] Add password update endpoint (change password while logged in)
- [ ] Email transaction receipts for all transactions

### Security & Authentication
- [ ] Implement rate limiting per user (currently global only)
- [ ] Add account lockout after N failed login attempts
- [ ] Collect client metadata (IP address, User-Agent) on login/registration
- [ ] Add 2FA/MFA (Two-Factor Authentication)
- [ ] Session management (track active sessions, allow revocation)

### Audit & Compliance
- [ ] Implement comprehensive audit trail for all sensitive operations
  - User login/logout events
  - Password changes
  - Transaction history
  - Configuration changes
- [ ] Add transaction limits (daily/monthly per user)
- [ ] Withdrawal verification for large amounts

### Admin Tools
- [ ] Basic admin dashboard for user management
  - View all users
  - Enable/disable user accounts
  - View user transaction history
  - Search and filter users
- [ ] Admin authentication and authorization (separate from regular users)

---

## Phase 2: Production Readiness

### KYC & Compliance
- [ ] Implement KYC (Know Your Customer) verification flow
  - Document upload (ID, proof of address)
  - Verification status tracking
  - Integration with KYC provider API
- [ ] Add data export functionality (user's right to data)
- [ ] Implement account deletion (right to be forgotten)
- [ ] Extend admin dashboard with KYC approval workflow

### Monitoring & Operations
- [ ] Add performance monitoring (APM integration)
- [ ] Set up error tracking (Sentry or similar)
- [ ] Implement health check endpoints
- [ ] Add monitoring & alerting (Prometheus + Grafana)
- [ ] Set up log aggregation (ELK stack or CloudWatch)

### User Management
- [ ] Email verification reminder (if not verified after X days)
- [ ] Suspicious activity detection and alerts
  - Unusual login locations
  - Large/unusual transactions
  - Multiple failed login attempts
- [ ] Notification preferences (opt-in/opt-out)

---

## Phase 3: Advanced Features

### Admin Tools Enhancement
- [ ] Enhanced admin dashboard with system monitoring
  - Transaction monitoring and analytics
  - System health metrics
  - User activity reports
- [ ] Admin action audit trail
- [ ] Role-based access control for admin users

### Enhanced Functionality
- [ ] Export transaction history (CSV/PDF)
- [ ] Transaction categories/tags for organization
- [ ] Recurring transactions (scheduled conversions)
- [ ] Transaction dispute/support system
- [ ] Currency conversion calculator (preview rates)

---

## Phase 4: Scale & Optimize

### Performance
- [ ] Load testing with k6 or Artillery
- [ ] Database query optimization review
- [ ] Implement Redis caching for frequently accessed data
- [ ] Add database indexes based on query patterns
- [ ] Performance benchmarking suite

### Infrastructure
- [ ] Database backup & restore strategy
  - Automated daily backups
  - Point-in-time recovery
  - Backup testing procedures
- [ ] Secrets management (HashiCorp Vault or cloud provider)
- [ ] Infrastructure as Code (Terraform/Pulumi)
- [ ] Message queue for async processing (RabbitMQ/Redis)
  - Email notifications
  - Transaction processing
  - Audit log writing

### Architecture
- [ ] Consider microservices split if needed
  - Auth service
  - Wallet service
  - Transaction service
  - Notification service

---

## Phase 5: Testing & Quality

### Testing Coverage
- [ ] Fuzzy testing implementation
- [ ] Mutation testing with Stryker.js
- [ ] Integration tests for complex workflows
- [ ] Performance regression tests
- [ ] Security scanning in CI/CD (Snyk, npm audit)

### Security
- [ ] Professional penetration testing
- [ ] Security audit of codebase
- [ ] Dependency vulnerability scanning
- [ ] Regular security updates process

---

## Technical Debt & Improvements

### Code Quality
- [ ] Review and refactor complex service methods
- [ ] Add JSDoc comments for public APIs
- [ ] Standardize error messages
- [ ] Review and optimize TypeORM queries

### Documentation
- [ ] Update README with production deployment guide
- [ ] Create architecture decision records (ADRs)
- [ ] Document API rate limits and quotas
- [ ] Create runbook for common operational tasks

### DevOps
- [ ] Set up multiple environments (dev, staging, prod)
- [ ] Automate database migration testing
- [ ] Implement canary deployments
- [ ] Create disaster recovery plan

---

## Notes

- **Priority**: Phase 1 items are critical for production launch
- **Dependencies**: Some items depend on others (e.g., KYC requires audit trail)
- **Review**: Revisit and update this TODO quarterly
- **Estimation**: Each phase represents approximately 2-4 weeks of development

---

**Last Updated**: 2026-03-18  
**Version**: 1.0.0
