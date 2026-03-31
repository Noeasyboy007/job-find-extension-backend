import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

import { RESUME_PARSE_AI_PROVIDER } from 'src/common/constant/resume-parse-ai.constant';
import {
  JOB_ANALYSIS_AI_SYSTEM_PROMPT,
  buildJobAnalysisUserMessage,
} from 'src/common/constant/job-analysis-ai.prompt';
import { jobAnalysisResultFromAiSchema } from 'src/modules/job-analysis/schemas/job-analysis-result.zod';

function stripCodeFences(text: string): string {
  const t = text.trim();
  const m = /^```(?:json)?\s*([\s\S]*?)```$/i.exec(t);
  return m ? m[1].trim() : t;
}

@Injectable()
export class JobAnalysisAiService {
  private readonly logger = new Logger(JobAnalysisAiService.name);

  constructor(private readonly configService: ConfigService) { }

  async analyzeMatch(params: {
    jobTitle: string;
    companyName: string;
    jobDescription: string;
    parsedJobJson: string | null;
    resumeParsedJson: string;
  }): Promise<Record<string, unknown>> {
    const provider =
      this.configService.get<number>('app.ai.resumeParseProvider') ??
      RESUME_PARSE_AI_PROVIDER.OPENAI;

    if (provider === RESUME_PARSE_AI_PROVIDER.GEMINI) {
      return this.withGemini(params);
    }
    return this.withOpenAI(params);
  }

  private async withOpenAI(params: {
    jobTitle: string;
    companyName: string;
    jobDescription: string;
    parsedJobJson: string | null;
    resumeParsedJson: string;
  }): Promise<Record<string, unknown>> {
    const apiKey = this.configService.get<string>('app.ai.openai.apiKey')?.trim() ?? '';
    const model =
      this.configService.get<string>('app.ai.openai.model')?.trim() ?? 'gpt-4o-mini';

    if (!apiKey) {
      throw new Error(
        'OPENAI_API_KEY is missing but AI_RESUME_PARSE_PROVIDER=1 (OpenAI). Set the key or switch provider to 2.',
      );
    }

    const openai = new OpenAI({ apiKey });
    const userContent = buildJobAnalysisUserMessage(params);

    const completion = await openai.chat.completions.create({
      model,
      temperature: 0.25,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: JOB_ANALYSIS_AI_SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      throw new Error('OpenAI returned empty content');
    }

    this.logger.debug(`OpenAI job-analysis raw response length=${raw.length}`);
    return this.validateAndWrap(raw, 'openai', model);
  }

  private async withGemini(params: {
    jobTitle: string;
    companyName: string;
    jobDescription: string;
    parsedJobJson: string | null;
    resumeParsedJson: string;
  }): Promise<Record<string, unknown>> {
    const apiKey = this.configService.get<string>('app.ai.gemini.apiKey')?.trim() ?? '';
    const modelName =
      this.configService.get<string>('app.ai.gemini.model')?.trim() ?? 'gemini-1.5-flash';

    if (!apiKey) {
      throw new Error(
        'GEMINI_API_KEY is missing but AI_RESUME_PARSE_PROVIDER=2 (Gemini). Set the key or switch provider to 1.',
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: JOB_ANALYSIS_AI_SYSTEM_PROMPT,
      generationConfig: {
        temperature: 0.25,
        responseMimeType: 'application/json',
      },
    });

    const result = await model.generateContent(buildJobAnalysisUserMessage(params));
    const raw = result.response.text();
    if (!raw) {
      throw new Error('Gemini returned empty content');
    }

    this.logger.debug(`Gemini job-analysis raw response length=${raw.length}`);
    return this.validateAndWrap(raw, 'gemini', modelName);
  }

  private validateAndWrap(
    raw: string,
    provider: 'openai' | 'gemini',
    model: string,
  ): Record<string, unknown> {
    const cleaned = stripCodeFences(raw);
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      throw new Error(
        `AI returned invalid JSON: ${e instanceof Error ? e.message : String(e)}`,
      );
    }

    const checked = jobAnalysisResultFromAiSchema.safeParse(parsed);
    if (!checked.success) {
      throw new Error(
        `Job analysis JSON failed validation: ${JSON.stringify(checked.error.flatten())}`,
      );
    }

    return {
      ...checked.data,
      meta: {
        analyzed_at: new Date().toISOString(),
        provider,
        model,
      },
    };
  }
}
