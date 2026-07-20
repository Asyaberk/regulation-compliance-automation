export class RegulationChunk {
  constructor(
    public readonly id: string,
    public readonly regulationId: string,
    public readonly articleNumber: string,
    public readonly content: string,
    public readonly embedding?: number[],
    public readonly createdAt?: Date,
  ) {}
}

export class Regulation {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly description: string | null,
    public readonly sourceUrl: string | null,
    public readonly chunks: RegulationChunk[],
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date,
  ) {}
}

export type ComplianceStatusType = 'COMPLIANT' | 'NON_COMPLIANT' | 'UNKNOWN';

export class ComplianceAuditLog {
  constructor(
    public readonly id: string,
    public readonly query: string,
    public readonly response: string,
    public readonly status: ComplianceStatusType,
    public readonly executionTimeMs: number,
    public readonly referencedChunkIds: string[],
    public readonly createdAt?: Date,
  ) {}
}
