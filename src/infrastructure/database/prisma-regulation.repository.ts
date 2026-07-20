import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import {
  IRegulationRepository,
  VectorSearchResult,
  HybridSearchResult,
} from '@domain/interfaces/regulation-repository.interface';
import { Regulation, RegulationChunk, ComplianceAuditLog } from '@domain/entities/regulation.entity';

@Injectable()
export class PrismaRegulationRepository implements IRegulationRepository{
    constructor(private readonly prisma: PrismaService) { }

    //Saves regulations with structure aware chunks and vector embeddings into postgresql
    async save(regulation: Regulation): Promise<Regulation> {
        const created = await this.prisma.regulation.create({
            data: {
                id: regulation.id,
                title: regulation.title,
                description: regulation.description,
                sourceUrl: regulation.sourceUrl,
                chunks: {
                    create: regulation.chunks.map((chunk) => ({
                        id: chunk.id,
                        articleNumber: chunk.articleNumber,
                        content: chunk.content
                    }))
                }
            },
            include: { chunks: true }
        });

        for (const chunk of regulation.chunks) {
            if (chunk.embedding && chunk.embedding.length > 0) {
                const vectorString = `[${chunk.embedding.join(',')}]`;
                await this.prisma.$executeRawUnsafe(
                    `UPDATE regulation_chunks SET embedding=$1::vector WHERE id=$2`,
                    vectorString,
                    chunk.id
                )
            }
        }
        return new Regulation(
            created.id,
            created.title,
            created.description,
            created.sourceUrl,
            created.chunks.map((c) => new RegulationChunk(
                c.id,
                c.regulationId,
                c.articleNumber,
                c.content,
                undefined,
                c.createdAt)),
            created.createdAt,
            created.updatedAt
        )
    }



    async findById(id: string): Promise<Regulation | null> {
        const record = await this.prisma.regulation.findUnique({
            where: { id },
            include: { chunks: true },
        });

        if (!record) return null;

        return new Regulation(
          record.id,
          record.title,
          record.description,
          record.sourceUrl,
          record.chunks.map(
            (c) =>
              new RegulationChunk(
                c.id,
                c.regulationId,
                c.articleNumber,
                c.content,
                undefined,
                c.createdAt,
              ),
          ),
          record.createdAt,
          record.updatedAt,
        );
    }



    async findAll(): Promise<Regulation[]> {
        const records = await this.prisma.regulation.findMany({
            include: { chunks: true },
            orderBy: {createdAt: 'desc'}
        });

        return records.map(
            (record) => new Regulation(
                record.id,
                record.title,
                record.description,
                record.sourceUrl,
                record.chunks.map(
                    (c) =>
                        new RegulationChunk(
                            c.id,
                            c.regulationId,
                            c.articleNumber,
                            c.content,
                            undefined,
                            c.createdAt,
                        ),
                ),
                record.createdAt,
                record.updatedAt,
            )
        );
    }


    //Performs cosine distance vector search on pgvector column (1 - (embedding <=> queryVector))
    async searchByVector(embedding: number[], topK: number = 3): Promise<VectorSearchResult[]>{
        const vectorString = `[${embedding.join(',')}]`;

        //cosine distance operator
        const rawResults: any[] = await this.prisma.$queryRawUnsafe(
            `SELECT id, "regulationId", "articleNumber", content, "createdAt",
                1 - (embedding <=> $1::vector) AS similarity
            FROM regulation_chunks
            WHERE embedding IS NOT NULL
            ORDER BY embedding <=> $1::vector ASC
            LIMIT $2`,
            vectorString,
            topK,
        );

        return rawResults.map((r) => ({
            chunk: new RegulationChunk(
                r.id,
                r.regulationId,
                r.articleNumber,
                r.content,
                undefined,
                r.createdAt,
            ),
            similarityScore: Number(r.similarity || 0)
        }));
    }


    //Hybrid Search combinig Dense and Keyword
    async searchHybrid(queryText: string, embedding: number[], topK: number = 3): Promise<HybridSearchResult[]> {
        const vectorString = `[${embedding.join(",")}]`;
        const searchPattern = `%${queryText}%`;

        //Combine vector score and keyword score 
        const rawResults: any[] = await this.prisma.$queryRawUnsafe(
            `SELECT id, "regulationId", "articleNumber", content, "createdAt",
              (1 - (embedding <=> $1::vector)) + (CASE WHEN content ILIKE $2 THEN 0.5 ELSE 0 END) AS score
            FROM regulation_chunks
            WHERE embedding IS NOT NULL
            ORDER BY score DESC
            LIMIT $3`,
            vectorString,
            searchPattern,
            topK,
        );

        return rawResults.map((r) => ({
            chunk: new RegulationChunk(
                r.id,
                r.regulationId,
                r.articleNumber,
                r.content,
                undefined,
                r.createdAt,
            ),
            score: Number(r.score || 0),
        })); 
    }



    async saveAudit(log: ComplianceAuditLog): Promise<ComplianceAuditLog> {
        const created = await this.prisma.complianceAuditLog.create({
            data: {
                id: log.id,
                query: log.query,
                response: log.response,
                status: log.status,
                executionTimeMs: log.executionTimeMs,
                referencedChunkIds: log.referencedChunkIds,
            },
        });
        return new ComplianceAuditLog(
            created.id,
            created.query,
            created.response,
            created.status,
            created.executionTimeMs,
            created.referencedChunkIds as string[],
            created.createdAt,
        );
    }


    async getAudits(limit: number = 20): Promise<ComplianceAuditLog[]> {
        const records = await this.prisma.complianceAuditLog.findMany({
            take: limit,
            orderBy: { createdAt: 'desc' },
        });

        return records.map((r) =>
            new ComplianceAuditLog(
                r.id,
                r.query,
                r.response,
                r.status,
                r.executionTimeMs,
                r.referencedChunkIds as string[],
                r.createdAt,
            ),
        );
    }
    
    



}