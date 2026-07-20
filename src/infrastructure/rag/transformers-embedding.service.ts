import { Injectable, OnModuleInit } from "@nestjs/common";
import { pipeline } from "@xenova/transformers";
import { IEmbeddingService } from "@domain/interfaces/embedding-service.interface";

//Runs all-MiniLM-L6-v2 model locally inside nodejs process generating 384dimensional dense vectors
@Injectable()
export class TransformersEmbeddingService implements IEmbeddingService, OnModuleInit{
    private extractor: any;

    //Preloads the feature extraction pipeline
    async onModuleInit(): Promise<void> {
        this.extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    }

    //Converts a single text input into a normalized 384-dimensional embedding vector.
    async embed(text: string): Promise<number[]>{
        if (!this.extractor) {
            this.extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        }


        const output = await this.extractor(text, { pooling: 'mean', normalize: true });
        return Array.from(output.data);
    }

    async embedMany(texts: string[]): Promise<number[][]>{
        const results: number[][] = [];
        for (const text of texts) {
            const vector = await this.embed(text);
            results.push(vector);
        }
        return results;
    }



}