import { NestFactory } from '@nestjs/core';
import { ServerModule } from './server.module';
import cors from 'cors';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(ServerModule);
  app.use(cors({ origin: true }));
  app.use(helmet());
  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`Server listening!! @http://localhost:${port}`);
}
bootstrap();
