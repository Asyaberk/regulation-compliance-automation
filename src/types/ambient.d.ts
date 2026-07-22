// Ambient fallback type declarations for external modules prior to running npm install

declare module '@nestjs/common' {
  export interface NestMiddleware {
    use(req: any, res: any, next: (error?: any) => void): any;
  }
  export interface LoggerService {
    log(message: any, ...optionalParams: any[]): any;
    error(message: any, ...optionalParams: any[]): any;
    warn(message: any, ...optionalParams: any[]): any;
    debug?(message: any, ...optionalParams: any[]): any;
    verbose?(message: any, ...optionalParams: any[]): any;
  }
  export interface OnModuleInit {
    onModuleInit(): any;
  }
  export interface OnModuleDestroy {
    onModuleDestroy(): any;
  }
  export function Injectable(options?: any): ClassDecorator;
  export function Inject(token: any): ParameterDecorator;
  export function Controller(prefix?: string): ClassDecorator;
  export function Get(path?: string): MethodDecorator;
  export function Post(path?: string): MethodDecorator;
  export function Body(): ParameterDecorator;
  export function Param(param?: string): ParameterDecorator;
  export function Query(param?: string): ParameterDecorator;
  export function HttpCode(code: number): MethodDecorator;
  export function UseGuards(...guards: any[]): MethodDecorator & ClassDecorator;
  export function UseInterceptors(...interceptors: any[]): MethodDecorator & ClassDecorator;
  export class HttpException extends Error {
    constructor(response: string | object, status: number);
  }
  export class HttpStatus {
    static OK: number;
    static CREATED: number;
    static BAD_REQUEST: number;
    static NOT_FOUND: number;
    static INTERNAL_SERVER_ERROR: number;
  }
}

declare module '@nestjs/swagger' {
  export function ApiTags(...tags: string[]): ClassDecorator & MethodDecorator;
  export function ApiOperation(options: { summary: string; description?: string }): MethodDecorator;
  export function ApiResponse(options: { status: number; description?: string; type?: any }): MethodDecorator;
  export function ApiBearerAuth(name?: string): ClassDecorator & MethodDecorator;
}

declare module '@prisma/client' {
  export class PrismaClient {
    $connect(): Promise<void>;
    $disconnect(): Promise<void>;
    $executeRawUnsafe(query: string, ...values: any[]): Promise<any>;
    $queryRawUnsafe<T = any>(query: string, ...values: any[]): Promise<T>;
    regulation: any;
    regulationChunk: any;
    complianceAuditLog: any;
  }
}
