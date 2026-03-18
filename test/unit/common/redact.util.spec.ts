import {
  redactEmail,
  redactSensitiveData,
} from '../../../src/common/utils/redact.util';

describe('Redact Utility', () => {
  describe('redactEmail', () => {
    it('should redact email addresses correctly', () => {
      expect(redactEmail('user@example.com')).toBe('u***@e***.com');
      expect(redactEmail('john.doe@company.org')).toBe('j***@c***.org');
      expect(redactEmail('a@b.com')).toBe('*@*.com');
      expect(redactEmail('test@test.co.uk')).toBe('t***@t***.co.uk');
    });

    it('should handle invalid emails', () => {
      expect(redactEmail('')).toBe('***');
      expect(redactEmail('notanemail')).toBe('***');
      expect(redactEmail('no-at-sign.com')).toBe('***');
    });
  });

  describe('redactSensitiveData', () => {
    it('should redact password fields', () => {
      const data = { username: 'john', password: 'secret123' };
      const redacted = redactSensitiveData(data);

      expect(redacted.username).toBe('john');
      expect(redacted.password).toBe('***');
    });

    it('should redact email fields', () => {
      const data = { name: 'John', email: 'john@example.com' };
      const redacted = redactSensitiveData(data);

      expect(redacted.name).toBe('John');
      expect(redacted.email).toBe('j***@e***.com');
    });

    it('should redact token and otp fields', () => {
      const data = {
        userId: '123',
        token: 'abc123xyz',
        otp: '123456',
        apiSecret: 'secret-key',
      };
      const redacted = redactSensitiveData(data);

      expect(redacted.userId).toBe('123');
      expect(redacted.token).toBe('***');
      expect(redacted.otp).toBe('***');
      expect(redacted.apiSecret).toBe('***');
    });

    it('should handle nested objects', () => {
      const data = {
        user: {
          name: 'John',
          email: 'john@example.com',
          credentials: {
            password: 'secret',
            token: 'abc123',
          },
        },
      };
      const redacted = redactSensitiveData(data);

      expect(redacted.user.name).toBe('John');
      expect(redacted.user.email).toBe('j***@e***.com');
      expect(redacted.user.credentials.password).toBe('***');
      expect(redacted.user.credentials.token).toBe('***');
    });

    it('should handle arrays', () => {
      const data = [
        { email: 'user1@test.com', password: 'pass1' },
        { email: 'user2@test.com', password: 'pass2' },
      ];
      const redacted = redactSensitiveData(data);

      expect(redacted[0].email).toBe('u***@t***.com');
      expect(redacted[0].password).toBe('***');
      expect(redacted[1].email).toBe('u***@t***.com');
      expect(redacted[1].password).toBe('***');
    });

    it('should handle primitive values', () => {
      expect(redactSensitiveData('plain string')).toBe('plain string');
      expect(redactSensitiveData('test@example.com')).toBe('t***@e***.com');
      expect(redactSensitiveData(123)).toBe(123);
      expect(redactSensitiveData(null)).toBe(null);
      expect(redactSensitiveData(undefined)).toBe(undefined);
    });
  });
});
