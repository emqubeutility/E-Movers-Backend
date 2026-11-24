process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_ACCESS_SECRET = 'test-secret-test-secret-test-secret-1234';
process.env.CORS_ORIGINS = 'http://localhost:5173';
process.env.BCRYPT_ROUNDS = '4';
process.env.RATE_LIMIT_MAX = '10000';
process.env.ALLOW_PUBLIC_REGISTRATION = 'true';
