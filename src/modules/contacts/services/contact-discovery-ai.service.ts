import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

import { RESUME_PARSE_AI_PROVIDER } from 'src/common/constant/resume-parse-ai.constant';
import {
  CONTACT_DISCOVERY_AI_SYSTEM_PROMPT,
  buildContactDiscoveryUserMessage,
} from 'src/common/constant/contact-discovery-ai.prompt';
import {
  contactDiscoveryResultSchema,
  type ContactItem,
} from '../schemas/contact-result.zod';

function stripCodeFences(text: string): string {
  const t = text.trim();
  const m = /^```(?:json)?\s*([\s\S]*?)```$/i.exec(t);
  return m ? m[1].trim() : t;
}

@Injectable()
export class ContactDiscoveryAiService {
  private readonly logger = new Logger(ContactDiscoveryAiService.name);

  constructor(private readonly configService: ConfigService) {}

  async discoverContacts(params: {
    jobTitle: string;
    companyName: string;
    sourcePlatform: string;
    sourceUrl: string | null;
    jobDescription: string;
    parsedJobJson: string | null;
  }): Promise<ContactItem[]> {
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
    jobTitle: string;
    companyName: string;
    sourcePlatform: string;
    sourceUrl: string | null;
    jobDescription: string;
    parsedJobJson: string | null;
  }): Promise<string> {
    const apiKey = this.configService.get<string>('app.ai.openai.apiKey')?.trim() ?? '';
    const model =
      this.configService.get<string>('app.ai.openai.model')?.trim() ?? 'gpt-4o-mini';

    if (!apiKey) {
      throw new Error(
        'OPENAI_API_KEY is missing. Set the key or switch provider to Gemini.',
      );
    }

    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: CONTACT_DISCOVERY_AI_SYSTEM_PROMPT },
        { role: 'user', content: buildContactDiscoveryUserMessage(params) },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error('OpenAI returned empty content');
    this.logger.debug(`OpenAI contact-discovery raw length=${raw.length}`);
    return raw;
  }

  private async withGemini(params: {
    jobTitle: string;
    companyName: string;
    sourcePlatform: string;
    sourceUrl: string | null;
    jobDescription: string;
    parsedJobJson: string | null;
  }): Promise<string> {
    const apiKey = this.configService.get<string>('app.ai.gemini.apiKey')?.trim() ?? '';
    const modelName =
      this.configService.get<string>('app.ai.gemini.model')?.trim() ?? 'gemini-1.5-flash';

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is missing. Set the key or switch provider to OpenAI.');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: CONTACT_DISCOVERY_AI_SYSTEM_PROMPT,
      generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
    });

    const result = await model.generateContent(buildContactDiscoveryUserMessage(params));
    const raw = result.response.text();
    if (!raw) throw new Error('Gemini returned empty content');
    this.logger.debug(`Gemini contact-discovery raw length=${raw.length}`);
    return raw;
  }

  private validateAndExtract(raw: string): ContactItem[] {
    const cleaned = stripCodeFences(raw);
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      throw new Error(
        `AI returned invalid JSON: ${e instanceof Error ? e.message : String(e)}`,
      );
    }

    const checked = contactDiscoveryResultSchema.safeParse(parsed);
    if (!checked.success) {
      throw new Error(
        `Contact discovery JSON failed validation: ${JSON.stringify(checked.error.flatten())}`,
      );
    }

    return checked.data.contacts;
  }
}
