import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AppLoggerService } from '@infrastructure/logging/app-logger.service';

@Injectable()
export class LoggingMiddleware implements NestMiddleware{
    constructor(
        private readonly logger: AppLoggerService
    ) { }
    
    use(req: Request, res: Response, next: NextFunction) {
        const { method, originalUrl } = req;
        const startTime = Date.now();
        
        res.on('finish', () => {
            const { statusCode } = res;
            const duration = Date.now() - startTime;

            this.logger.log(
                `[HTTP] ${method} ${originalUrl} ${statusCode} - ${duration}ms`,
                `LoggingMiddleware`
            );
        });
     
        next();
    }


}







