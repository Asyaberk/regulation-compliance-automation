import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ILlmService, ComplianceInput, ComplianceResult } from '@domain/interfaces/llm-service.interface';

//implementation of ILlmService using local Ollama (Qwen-2.5-Instruct) and evaluates compliance scenarios against legal context and returns JSON
@Injectable()
export class OllamaLlmService implements ILlmService{
    private readonly baseUrl: string;
    private readonly model: string;

    constructor(private readonly configService: ConfigService) {
        this.baseUrl = this.configService.get<string>('ollama.baseUrl') || 'http://localhost:11434';
        this.model = this.configService.get<string>('ollama.model') || 'qwen2.5:latest';
    }

    //Sends user scenario and retrieved legal context to local Qwen model for compliance evaluation
    async analyze(input: ComplianceInput): Promise<ComplianceResult>{
        const prompt = this.buildPrompt(input.scenario, input.context);

        try {
            const response = await axios.post(`${this.baseUrl}/api/generate`, {
                model: this.model,
                prompt: prompt,
                stream: false,
                format: 'json'
            });

            const responseText = response.data?.response;
            return this.parseResponse(responseText);
        } catch (error) {
            return {
                isCompliant: false,
                status: 'UNKNOWN',
                reason: `LLM execution error: ${(error as Error).message}`,
                violatedArticles: []
            };
        }

    }

    //Constructs system prompt for legal auditor persona and structured JSON output format
    private buildPrompt(scenario: string, context: string[]): string {
        const formattedContext = context.map((c, i) => `[Article ${i + 1}]: ${c}`).join('\n\n');

        return `You are an expert Legal Compliance Auditor.
                Analyze the following operational SCENARIO against the provided LEGAL CONTEXT.
                
                LEGAL CONTEXT:
                ${formattedContext}

                OPERATIONAL SCENARIO:
                ${scenario}

                You MUST return a VALID JSON object matching this schema:
                {
                    "isCompliant": boolean,
                    "status": "COMPLIANT" | "NON_COMPLIANT" | "UNKNOWN",
                    "reason": "Detailed legal reasoning explaining why it is compliant or violated",
                    "violatedArticles": ["List of article numbers violated, if any"]
                }`;
    }


    //Safely parses JSON response from Ollama
    private parseResponse(responseText: string): ComplianceResult{
        try {
            const parsed = JSON.parse(responseText);
            return {
                isCompliant: Boolean(parsed.isCompliant),
                status: parsed.status || (parsed.isCompliant ? 'COMPLIANT' : 'NON_COMPLIANT'),
                reason: parsed.reason || 'No detailed rreason provided.',
                violatedArticles: Array.isArray(parsed.violatedArticles) ? parsed.violatedArticles : []
            };
        } catch {
            return {
                isCompliant: false,
                status: 'UNKNOWN',
                reason: responseText || 'Failed to parse LLM JSON response.',
                violatedArticles: []
            };
        }
    }


}