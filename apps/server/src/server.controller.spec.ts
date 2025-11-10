import { Test, TestingModule } from '@nestjs/testing';
import { ServerController } from './server.controller';
import { ServerService } from './server.service';

describe('ServerController', () => {
  let serverController: ServerController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [ServerController],
      providers: [ServerService],
    }).compile();

    serverController = app.get<ServerController>(ServerController);
  });

  describe('health', () => {
    it('should return health status', () => {
      const result = serverController.health();
      expect(result.ok).toBe(true);
      expect(result.now).toBeDefined();
    });
  });

  describe('version', () => {
    it('should return version information', () => {
      const result = serverController.version();
      expect(result.name).toBe('p2p-server');
      expect(result.version).toBe('0.1.0');
    });
  });
});
