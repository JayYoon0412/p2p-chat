import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ServerModule } from './../src/server.module';

describe('ServerController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ServerModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health endpoints', () => {
    it('/health (GET)', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.ok).toBe(true);
          expect(res.body.now).toBeDefined();
        });
    });

    it('/version (GET)', () => {
      return request(app.getHttpServer())
        .get('/version')
        .expect(200)
        .expect((res) => {
          expect(res.body.name).toBe('p2p-server');
          expect(res.body.version).toBe('0.1.0');
        });
    });
  });

  describe('Quick-match endpoints', () => {
    it('/quick-match/peek (GET)', () => {
      return request(app.getHttpServer())
        .get('/quick-match/peek')
        .expect(200)
        .expect((res) => {
          expect(res.body.waiting).toBeDefined();
          expect(typeof res.body.waiting).toBe('number');
        });
    });

    it('/quick-match (POST) - first user waits', () => {
      return request(app.getHttpServer())
        .post('/quick-match')
        .expect(201)
        .expect((res) => {
          expect(res.body.status).toBe('waiting');
          expect(res.body.roomId).toBeDefined();
        });
    });

    it('/quick-match (POST) - second user gets paired', async () => {
      // First user
      const firstResponse = await request(app.getHttpServer())
        .post('/quick-match')
        .expect(201);
      
      const roomId = firstResponse.body.roomId;

      // Second user
      const secondResponse = await request(app.getHttpServer())
        .post('/quick-match')
        .expect(201)
        .expect((res) => {
          expect(res.body.status).toBe('paired');
          expect(res.body.roomId).toBe(roomId);
        });
    });

    it('/quick-match/reset (DELETE)', () => {
      return request(app.getHttpServer())
        .delete('/quick-match/reset')
        .expect(200)
        .expect((res) => {
          expect(res.body.ok).toBe(true);
        });
    });
  });
});
