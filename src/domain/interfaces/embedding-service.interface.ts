export interface IEmbeddingService {
  embed(text: string): Promise<number[]>;
  embedMany(texts: string[]): Promise<number[][]>;
}

export const EMBEDDING_SERVICE_TOKEN = 'IEmbeddingService';
