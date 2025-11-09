import { NestFactory } from '@nestjs/core';
import { ServerModule } from './server.module';
import cors from 'cors';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(ServerModule);
  app.use(cors({ origin: true }));
  app.use(helmet());
  await app.listen(process.env.port ?? 3001);
  console.log(`Server listening!! @http://localhost:${process.env.PORT ?? 3001}`);
}
bootstrap();
