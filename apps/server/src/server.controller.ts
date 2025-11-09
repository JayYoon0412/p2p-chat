import { Controller, Get } from '@nestjs/common';

@Controller()
export class ServerController {
  @Get('/health') 
  health() {
    return { ok: true, now: new Date().toISOString() };
  }
  
  @Get('/version')
  version() {
    return { name: 'p2p-server', version: '0.1.0' };
  } 
}
