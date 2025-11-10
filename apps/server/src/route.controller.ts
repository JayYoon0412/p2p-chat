import { Controller, Delete, Get, Post, HttpCode } from "@nestjs/common";
import { randomUUID } from "crypto";

type PendingClient = {id: string, createdAt: number};
const queue: PendingClient[] = [];

@Controller('quick-match')
export class RouteController {
    @Get('peek')
    peek() {
        return { waiting: queue.length };
    }

    @Post()
    @HttpCode(201)
    claim() {
        const now = Date.now();
        // drop old queries past 90 seconds?
        for (let i = queue.length - 1; i >= 0; i--) if (now - queue[i].createdAt > 90_000) queue.splice(i, 1);
        if (queue.length == 0) {
            const roomId = randomUUID();
            queue.push({ id: roomId, createdAt: now});
            return { status: 'waiting', roomId} as const;
        } else {
            const matchedClient = queue.shift();
            return { status: 'paired', roomId: matchedClient?.id} as const;
        }
    }

    @Delete('reset')
    reset() {
        queue.splice(0, queue.length);
        return { ok: true };
    }

}