import { Inject, Injectable } from '@nestjs/common';
import { ComplianceAuditLog, Regulation, RegulationChunk } from '@domain/entities/regulation.entity';
import { IRegulationRepository, REGULATION_REPOSITORY_TOKEN } from '@domain/interfaces/regulation-repository.interface';
import { IEmbeddingService, EMBEDDING_SERVICE_TOKEN } from '@domain/interfaces/embedding-service.interface';
import { ILlmService, LLM_SERVICE_TOKEN, ComplianceResult } from '@domain/interfaces/llm-service.interface';
import { RedisService } from '@infrastructure/cache/redis.service';
import { MevzuatGovTrFetcherService } from '@infrastructure/rag/mevzuat-fetcher.service';
import { CheckComplianceDto } from '@application/dtos/check-compliance.dto';


//Core Use Case for RAG Compliance Analysis Pipeline. performs Redis Caching, Hybrid Search Retrieval, Scrapper Agent, Context Compression, Ollama Qwen Reasoning, and Audit Logging


@Injectable()
export class CheckComplianceUseCase{
    constructor(
        @Inject(REGULATION_REPOSITORY_TOKEN)
        private readonly regulationRepository: IRegulationRepository,

        @Inject(EMBEDDING_SERVICE_TOKEN)
        private readonly embeddingService: IEmbeddingService,

        @Inject(LLM_SERVICE_TOKEN)
        private readonly llmService: ILlmService,

        private readonly redisService: RedisService,
        private readonly mevzuatFetcherService: MevzuatGovTrFetcherService
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
        let hybridSearchResults = await this.regulationRepository.searchHybrid(
            dto.scenario,
            scenarioEmbedding,
            3
        );

        //if hybrid returns 0, fetch mevzuat.gov.tr
        if (hybridSearchResults.length == 0) {
            await this.autoFetchAndIndexFallback(dto.scenario);
            //rerun hybrid on new db records
            hybridSearchResults = await this.regulationRepository.searchHybrid(
                dto.scenario,
                scenarioEmbedding,
                3
            );
        }

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

    //scrapper agent if db is empty
    private async autoFetchAndIndexFallback(query: string): Promise<void> {
        try {
            const defaultSourceUrl = 'https://www.mevzuat.gov.tr';
            const fetchedText = await this.mevzuatFetcherService.fetchFromUrl(defaultSourceUrl);

            if (fetchedText && fetchedText.length > 0) {
                const regulationId = this.generateUuid();
                const articleRegex = /(Madde\s+\d+[:\s.-]?)/gi;
                const parts = fetchedText.split(articleRegex);

                const chunks: RegulationChunk[] = [];
                for (let i = 1; i < parts.length && chunks.length < 20; i += 2) {
                    const articleNumber = parts[i].trim();
                    const text = parts[i + 1] ? parts[i + 1].trim() : '';
                    
                    if (text.length > 0) {
                        const fullContent = `${articleNumber} : ${text}`;
                        const embedding = await this.embeddingService.embed(fullContent);

                        chunks.push(
                            new RegulationChunk(
                                this.generateUuid(),
                                regulationId,
                                articleNumber,
                                fullContent,
                                embedding,
                                new Date()
                            ),
                        );
                    }
                }

                if (chunks.length > 0) {
                    const regulation = new Regulation(
                        regulationId,
                        `Auto-Fetched Regulation for [${query}]`,
                        'Dynamically fetched via MevzuatGovTr Agent Fallback',
                        defaultSourceUrl,
                        chunks,
                        new Date(),
                        new Date()
                    );
                    await this.regulationRepository.save(regulation);
                }

            }
        }catch{}
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








