import { Module } from '@nestjs/common';
import { ServerController } from './server.controller';
import { RouteController } from './route.controller';

@Module({
  imports: [],
  controllers: [ServerController, RouteController],
})
export class ServerModule {}
