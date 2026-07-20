import { Regulation, RegulationChunk, ComplianceAuditLog } from '../entities/regulation.entity';

export interface VectorSearchResult {
  chunk: RegulationChunk;
  similarityScore: number;
}

export interface HybridSearchResult {
  chunk: RegulationChunk;
  score: number;
}

export interface IRegulationRepository {
  save(regulation: Regulation): Promise<Regulation>;
  findById(id: string): Promise<Regulation | null>;
  findAll(): Promise<Regulation[]>;
  searchByVector(embedding: number[], topK: number): Promise<VectorSearchResult[]>;
  searchHybrid(queryText: string, embedding: number[], topK: number): Promise<HybridSearchResult[]>;
  saveAudit(log: ComplianceAuditLog): Promise<ComplianceAuditLog>;
  getAudits(limit?: number): Promise<ComplianceAuditLog[]>;
}

export const REGULATION_REPOSITORY_TOKEN = 'IRegulationRepository';
