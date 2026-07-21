import { Inject, Injectable } from '@nestjs/common';
import { Regulation, RegulationChunk } from '@domain/entities/regulation.entity';
import { IRegulationRepository, REGULATION_REPOSITORY_TOKEN } from '@domain/interfaces/regulation-repository.interface';
import { IEmbeddingService, EMBEDDING_SERVICE_TOKEN } from '@domain/interfaces/embedding-service.interface';
import { CreateRegulationDto } from '@application/dtos/create-regulation.dto';


//creating a regulation document and performs structure aware regex chunking, generates embeddings, and sends to db
@Injectable()
export class CreateRegulationUseCase{
    constructor(
        @Inject(REGULATION_REPOSITORY_TOKEN)
        private readonly regulationRepository: IRegulationRepository,

        @Inject(EMBEDDING_SERVICE_TOKEN)
        private readonly embeddingService: IEmbeddingService,
    ) { }


    async execute(dto: CreateRegulationDto): Promise<Regulation>{
        //generate uuid
        const regulationId = this.generateUuid();

        //chunking by splitting text by "madde 1,2,3..x"
        const rawChunks = this.splitByArticles(dto.content);

        //genrate 384 vector embeddings
        const chunkTexts = rawChunks.map((c) => `[Regulation: ${dto.title} | ${c.articleNumber}]: ${c.text}`);
        const embeddings = await this.embeddingService.embedMany(chunkTexts);

        //chunk entities
        const chunkEntities = rawChunks.map((c, index) => {
            return new RegulationChunk(
                this.generateUuid(),
                regulationId,
                c.articleNumber,
                c.text,
                embeddings[index],
                new Date()
            );
        });

        //regulation entity
        const regulationEntitiy = new Regulation(
            regulationId,
            dto.title,
            dto.description || null,
            dto.sourceUrl || null,
            chunkEntities,
            new Date(),
            new Date()
        );

        //save db
        return await this.regulationRepository.save(regulationEntitiy);

    }


    //regex structure aware chunking
    private splitByArticles(fullText: string): { articleNumber: string, text: string }[]{
        const articleRegex = /(Madde\s+\d[:\s.-]?)/gi;
        const parts = fullText.split(articleRegex);
        
        if (parts.length < 3) {
            const paragraphs = fullText.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
            return paragraphs.map((p, i) => ({
                articleNumber: `section ${i + 1}`,
                text: p.trim()
            }));
        }

        //falack if there is no word "madde ..x"
        const chunks: { articleNumber: string; text: string }[] = [];
        for (let i = 1; i < parts.length; i += 2){
            const articleNumber = parts[i].trim();
            const text = parts[i + 1] ? parts[i + 1].trim() : '';
            if (text.length > 0) {
                chunks.push({ articleNumber, text: `${articleNumber} : ${text}` });

            }
        }

        return chunks.length > 0 ? chunks : [{ articleNumber: 'General', text: fullText }];

    }

    private generateUuid(): string{
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }

}