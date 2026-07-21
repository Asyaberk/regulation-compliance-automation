import { Inject, Injectable } from '@nestjs/common';
import { ComplianceAuditLog } from '@domain/entities/regulation.entity';
import { IRegulationRepository, REGULATION_REPOSITORY_TOKEN } from '@domain/interfaces/regulation-repository.interface';
import { IEmbeddingService, EMBEDDING_SERVICE_TOKEN } from '@domain/interfaces/embedding-service.interface';
import { ILlmService, LLM_SERVICE_TOKEN, ComplianceResult } from '@domain/interfaces/llm-service.interface';
import { RedisService } from '@infrastructure/cache/redis.service';
import { CheckComplianceDto } from '@application/dtos/check-compliance.dto';


//Core Use Case for RAG Compliance Analysis Pipeline. performs Redis Caching, Hybrid Search Retrieval, Context Compression, Ollama Qwen Reasoning, and Audit Logging


@Injectable()
export class CheckComplianceUseCase{
    constructor(
        @Inject(REGULATION_REPOSITORY_TOKEN)
        private readonly regulationRepository: IRegulationRepository,

        @Inject(EMBEDDING_SERVICE_TOKEN)
        private readonly embeddingService: IEmbeddingService,

        @Inject(LLM_SERVICE_TOKEN)
        private readonly llmService: ILlmService,

        private readonly redisService: RedisService
    ) { }
    
    //rag comliance verification pipeliine
    async execute(dto: CheckComplianceDto): Promise<ComplianceResult>{
        const cacheKey = `compliance:${this.hashString(dto.scenario)}`;
        const startTime = Date.now();

        //check redis cache
        const cachedResult = await this.redisService.get(cacheKey);
        if (cachedResult) {
            try {
                return JSON.parse(cachedResult) as ComplianceResult;
            } catch {
            }
        }

        //genrate 384 dim dense vector for input query
        const scenarioEmbedding = await this.embeddingService.embed(dto.scenario);

        //hybrid search for top 3
        const hybridSearchResults = await this.regulationRepository.searchHybrid(
            dto.scenario,
            scenarioEmbedding,
            3
        );

        //context comperession
        const contextChunks = hybridSearchResults.map(
            (res) => `[${res.chunk.articleNumber}]: ${res.chunk.content.replace(/\s+/g, ' ').trim()}`
        );

        //run local ollama qwen2.5 for legal reasoning
        const complianceResult = await this.llmService.analyze({
            scenario: dto.scenario,
            context: contextChunks
        });

        const executionTimeMs = Date.now() - startTime;
        const referencedChunkIds = hybridSearchResults.map((r) => r.chunk.id);

        //save udit record to db
        const auditLog = new ComplianceAuditLog(
            this.generateUuid(),
            dto.scenario,
            JSON.stringify(complianceResult),
            complianceResult.status,
            executionTimeMs,
            referencedChunkIds,
            new Date()
        );
        await this.regulationRepository.saveAudit(auditLog);

        //cache to redis 3600 sec
        await this.redisService.set(cacheKey, JSON.stringify(complianceResult), 3600);

        return complianceResult;

    }

    private hashString(str: string): string{
        let hash = 0;
        for (let i = 0; i < str.length; i++){
            const char = str.codePointAt(i);
            hash = (hash << 5) - hash + char;
            hash = Math.trunc(hash);
        }
        return Math.abs(hash).toString(36);
    }

    private generateUuid(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.trunc(Math.random() * 16);
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }

}








