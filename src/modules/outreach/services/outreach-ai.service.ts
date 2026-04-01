import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

import { RESUME_PARSE_AI_PROVIDER } from 'src/common/constant/resume-parse-ai.constant';
import {
  OUTREACH_AI_SYSTEM_PROMPT,
  buildOutreachUserMessage,
} from 'src/common/constant/outreach-ai.prompt';
import type { OutreachMessageType } from 'src/common/constant/outreach.constant';
import { outreachResultFromAiSchema } from '../schemas/outreach-result.zod';

function stripCodeFences(text: string): string {
  const t = text.trim();
  const m = /^```(?:json)?\s*([\s\S]*?)```$/i.exec(t);
  return m ? m[1].trim() : t;
}

@Injectable()
export class OutreachAiService {
  private readonly logger = new Logger(OutreachAiService.name);

  constructor(private readonly configService: ConfigService) {}

  async generateMessage(params: {
    type: OutreachMessageType;
    jobTitle: string;
    companyName: string;
    jobDescription: string;
    analysisJson: string;
    resumeParsedJson: string;
    contactName?: string | null;
    contactRole?: string | null;
  }): Promise<string> {
    const provider =
      this.configService.get<number>('app.ai.resumeParseProvider') ??
      RESUME_PARSE_AI_PROVIDER.OPENAI;

    const raw =
      provider === RESUME_PARSE_AI_PROVIDER.GEMINI
        ? await this.withGemini(params)
        : await this.withOpenAI(params);

    return this.validateAndExtract(raw);
  }

  private async withOpenAI(params: {
    type: OutreachMessageType;
    jobTitle: string;
    companyName: string;
    jobDescription: string;
    analysisJson: string;
    resumeParsedJson: string;
    contactName?: string | null;
    contactRole?: string | null;
  }): Promise<string> {
    const apiKey = this.configService.get<string>('app.ai.openai.apiKey')?.trim() ?? '';
    const model =
      this.configService.get<string>('app.ai.openai.model')?.trim() ?? 'gpt-4o-mini';

    if (!apiKey) {
      throw new Error(
        'OPENAI_API_KEY is missing but AI_RESUME_PARSE_PROVIDER=1 (OpenAI). Set the key or switch provider to 2.',
      );
    }

    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model,
      temperature: 0.55,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: OUTREACH_AI_SYSTEM_PROMPT },
        { role: 'user', content: buildOutreachUserMessage(params) },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error('OpenAI returned empty content');
    this.logger.debug(`OpenAI outreach raw length=${raw.length}`);
    return raw;
  }

  private async withGemini(params: {
    type: OutreachMessageType;
    jobTitle: string;
    companyName: string;
    jobDescription: string;
    analysisJson: string;
    resumeParsedJson: string;
    contactName?: string | null;
    contactRole?: string | null;
  }): Promise<string> {
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
      systemInstruction: OUTREACH_AI_SYSTEM_PROMPT,
      generationConfig: { temperature: 0.55, responseMimeType: 'application/json' },
    });

    const result = await model.generateContent(buildOutreachUserMessage(params));
    const raw = result.response.text();
    if (!raw) throw new Error('Gemini returned empty content');
    this.logger.debug(`Gemini outreach raw length=${raw.length}`);
    return raw;
  }

  private validateAndExtract(raw: string): string {
    const cleaned = stripCodeFences(raw);
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      throw new Error(
        `AI returned invalid JSON: ${e instanceof Error ? e.message : String(e)}`,
      );
    }

    const checked = outreachResultFromAiSchema.safeParse(parsed);
    if (!checked.success) {
      throw new Error(
        `Outreach JSON failed validation: ${JSON.stringify(checked.error.flatten())}`,
      );
    }

    return checked.data.message;
  }
}
