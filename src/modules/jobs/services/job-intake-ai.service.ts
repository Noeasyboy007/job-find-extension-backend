import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

import { RESUME_PARSE_AI_PROVIDER } from 'src/common/constant/resume-parse-ai.constant';
import {
  JOB_INTAKE_AI_SYSTEM_PROMPT,
  buildJobIntakeUserMessage,
  type JobIntakeScrapeHints,
} from 'src/common/constant/job-intake-ai.prompt';
import { parsedJobFromAiSchema } from 'src/modules/jobs/schemas/parsed-job.zod';

function stripCodeFences(text: string): string {
  const t = text.trim();
  const m = /^```(?:json)?\s*([\s\S]*?)```$/i.exec(t);
  return m ? m[1].trim() : t;
}

@Injectable()
export class JobIntakeAiService {
  private readonly logger = new Logger(JobIntakeAiService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Uses the same provider switch as resume parsing (`AI_RESUME_PARSE_PROVIDER`).
   */
  async parseStructuredJob(
    hints: JobIntakeScrapeHints,
    normalizedDescription: string,
    sourceDescriptionCharCount: number,
  ): Promise<Record<string, unknown>> {
    const provider =
      this.configService.get<number>('app.ai.resumeParseProvider') ??
      RESUME_PARSE_AI_PROVIDER.OPENAI;

    if (provider === RESUME_PARSE_AI_PROVIDER.GEMINI) {
      return this.parseWithGemini(hints, normalizedDescription, sourceDescriptionCharCount);
    }
    return this.parseWithOpenAI(hints, normalizedDescription, sourceDescriptionCharCount);
  }

  private async parseWithOpenAI(
    hints: JobIntakeScrapeHints,
    normalizedDescription: string,
    sourceDescriptionCharCount: number,
  ): Promise<Record<string, unknown>> {
    const apiKey = this.configService.get<string>('app.ai.openai.apiKey')?.trim() ?? '';
    const model =
      this.configService.get<string>('app.ai.openai.model')?.trim() ?? 'gpt-4o-mini';

    if (!apiKey) {
      throw new Error(
        'OPENAI_API_KEY is missing but AI_RESUME_PARSE_PROVIDER=1 (OpenAI). Set the key or switch provider to 2.',
      );
    }

    const openai = new OpenAI({ apiKey });
    const userContent = buildJobIntakeUserMessage(hints, normalizedDescription);

    const completion = await openai.chat.completions.create({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: JOB_INTAKE_AI_SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      throw new Error('OpenAI returned empty content');
    }

    this.logger.debug(`OpenAI job-intake raw response length=${raw.length}`);
    return this.validateAndWrap(raw, 'openai', model, sourceDescriptionCharCount);
  }

  private async parseWithGemini(
    hints: JobIntakeScrapeHints,
    normalizedDescription: string,
    sourceDescriptionCharCount: number,
  ): Promise<Record<string, unknown>> {
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
      systemInstruction: JOB_INTAKE_AI_SYSTEM_PROMPT,
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    });

    const result = await model.generateContent(
      buildJobIntakeUserMessage(hints, normalizedDescription),
    );
    const raw = result.response.text();
    if (!raw) {
      throw new Error('Gemini returned empty content');
    }

    this.logger.debug(`Gemini job-intake raw response length=${raw.length}`);
    return this.validateAndWrap(raw, 'gemini', modelName, sourceDescriptionCharCount);
  }

  private validateAndWrap(
    raw: string,
    provider: 'openai' | 'gemini',
    model: string,
    sourceDescriptionCharCount: number,
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

    const checked = parsedJobFromAiSchema.safeParse(parsed);
    if (!checked.success) {
      throw new Error(
        `Job JSON failed validation: ${JSON.stringify(checked.error.flatten())}`,
      );
    }

    return {
      ...checked.data,
      meta: {
        parsed_at: new Date().toISOString(),
        provider,
        model,
        source_description_char_count: sourceDescriptionCharCount,
      },
    };
  }
}
