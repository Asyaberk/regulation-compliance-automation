import { Injectable, LoggerService } from '@nestjs/common';

@Injectable()
export class AppLoggerService implements LoggerService {

  log(message: string, context?: string): void {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [INFO] [${context || 'Application'}]: ${message}`);
  }

  error(message: string, trace?: string, context?: string): void {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [ERROR] [${context || 'Application'}]: ${message}`, trace ? `\nTrace: ${trace}` : '');
  }

  warn(message: string, context?: string): void {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [WARN] [${context || 'Application'}]: ${message}`);
  }

  debug(message: string, context?: string): void {
    const timestamp = new Date().toISOString();
    console.debug(`[${timestamp}] [DEBUG] [${context || 'Application'}]: ${message}`);
  }

    
  //grafana vs.
  logAuditMetric(action: string, executionTimeMs: number, status: string): void {
    const timestamp = new Date().toISOString();
    const metricJson = JSON.stringify({
      timestamp,
      telemetry: 'COMPLIANCE_AUDIT_METRIC',
      action,
      executionTimeMs,
      status,
    });
    console.log(metricJson);
  }
    
    
    
}