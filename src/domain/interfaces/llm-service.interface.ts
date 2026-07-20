export interface ComplianceInput {
  scenario: string;
  context: string[];
}

export interface ComplianceResult {
  isCompliant: boolean;
  status: 'COMPLIANT' | 'NON_COMPLIANT' | 'UNKNOWN';
  reason: string;
  violatedArticles: string[];
}

export interface ILlmService {
  analyze(input: ComplianceInput): Promise<ComplianceResult>;
}

export const LLM_SERVICE_TOKEN = 'ILlmService';
