// Set required environment variables before tests run.
// This prevents PrismaClient and ConfigService from throwing
// due to missing env vars in the unit test environment.
process.env['DATABASE_URL'] = 'postgresql://test:test@localhost:5432/repair_shop_test';
process.env['JWT_SECRET'] = 'test-jwt-secret-min-32-chars-long!!';
process.env['JWT_REFRESH_SECRET'] = 'test-jwt-refresh-secret-min-32-chars!!';
process.env['JWT_EXPIRY'] = '15m';
process.env['JWT_REFRESH_EXPIRY'] = '7d';
process.env['PORT'] = '3001';
process.env['CORS_ORIGIN'] = 'http://localhost:3000';
