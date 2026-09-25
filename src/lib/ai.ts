import Anthropic from '@anthropic-ai/sdk';
import type { GscQueryMetric } from './gsc';

export interface PageSuggestionInput {
  url: string;
  title: string;
  baselineClicks: number;
  recentClicks: number;
  dropPercentClicks: number;
  dropPercentImpressions: number;
  clicksLost?: number;
  topQueries?: GscQueryMetric[] | Array<{ query: string; clicksLost: number; baselinePosition: number; recentPosition: number }>;
}

/**
 * Generates a tailored, query-specific AI recovery playbook
 */
export async function generateContentSuggestion(page: PageSuggestionInput): Promise<string> {
  const queryLines = (page.topQueries || [])
    .slice(0, 4)
    .map((q) => `- Query: "${q.query}" | Lost: ${q.clicksLost || 0} clicks | Avg Rank: ${q.baselinePosition || '?'} → ${q.recentPosition || '?'}`)
    .join('\n');

  const queryContext = queryLines.length > 0
    ? `\nTop Declining Search Queries on Google:\n${queryLines}\n`
    : '';

  const prompt = `You are a senior SEO strategist and technical content auditor.
The following web page has suffered organic search traffic decay on Google:
- URL: ${page.url}
- Title / Topic: ${page.title}
- 8-Week Baseline Clicks: ${page.baselineClicks}
- Recent Clicks: ${page.recentClicks} (Drop: ${page.dropPercentClicks}%, Lost: ${page.clicksLost || Math.max(0, page.baselineClicks - page.recentClicks)} clicks)
- Impression Drop: ${page.dropPercentImpressions}%
${queryContext}
Provide a tailored, 2-to-3 sentence actionable recovery plan for this specific page.
${queryLines.length > 0 ? 'CRITICAL REQUIREMENT: You MUST specifically mention the top declining search query and its ranking shift in your advice.' : ''}
Give concrete advice tailored to the exact topic and query intent. Do NOT output generic boilerplate. Output strictly the advice text directly without introductory filler.`;

  // 1. Google Gemini API (Latest Working Production Models)
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
  if (geminiKey && !geminiKey.startsWith('dummy_') && geminiKey.trim() !== '') {
    const modelsToTry = ['gemini-flash-lite-latest', 'gemini-flash-latest', 'gemini-pro-latest'];

    for (const modelName of modelsToTry) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiKey.trim()}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': geminiKey.trim(),
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { maxOutputTokens: 350, temperature: 0.4 },
            }),
            signal: AbortSignal.timeout(7000),
          }
        );

        const data = await response.json();
        if (data?.error) {
          console.warn(`[DecayFix AI] Gemini API (${modelName}) error:`, data.error.message || data.error);
          continue;
        }

        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim().length > 0) {
          return text.trim();
        }
      } catch (err: any) {
        console.warn(`[DecayFix AI] Gemini fetch error on ${modelName}:`, err?.message || err);
      }
    }
  } else {
    console.warn('[DecayFix AI] No valid GEMINI_API_KEY found in environment. Using dynamic heuristic engine.');
  }

  // 2. OpenAI API
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey && !openaiKey.startsWith('dummy_') && openaiKey.trim() !== '') {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey.trim()}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 300,
          temperature: 0.4,
        }),
        signal: AbortSignal.timeout(6000),
      });
      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content;
      if (text && text.trim().length > 0) {
        return text.trim();
      }
    } catch (err: any) {
      console.warn('OpenAI API error:', err?.message || err);
    }
  }

  // 3. Groq Cloud API
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey && !groqKey.startsWith('dummy_') && groqKey.trim() !== '') {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${groqKey.trim()}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 300,
          temperature: 0.4,
        }),
        signal: AbortSignal.timeout(6000),
      });
      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content;
      if (text && text.trim().length > 0) {
        return text.trim();
      }
    } catch (err: any) {
      console.warn('Groq API error:', err?.message || err);
    }
  }

  // 4. Anthropic Claude API
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey && anthropicKey.startsWith('sk-ant-')) {
    try {
      const anthropic = new Anthropic({ apiKey: anthropicKey.trim() });
      const message = await anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 300,
        temperature: 0.3,
        messages: [{ role: 'user', content: prompt }],
      });

      const contentBlock = message.content[0];
      if (contentBlock.type === 'text') {
        return contentBlock.text.trim();
      }
    } catch (error: any) {
      console.warn(`Anthropic API error for ${page.url}:`, error?.message || error);
    }
  }

  // 4. Built-in Deeply Varied Heuristic Fallback Engine
  return generateFallbackSuggestion(page);
}

/**
 * Dynamic Heuristic fallback suggestion generator tailored with unique variation per page
 */
export function generateFallbackSuggestion(page: PageSuggestionInput): string {
  const topic = page.title || 'this page';
  const topQ = page.topQueries?.[0];
  const queryMention = topQ 
    ? `specifically for "${topQ.query}" (rank dropped from ${topQ.baselinePosition || 'top'} → ${topQ.recentPosition || 'lower results'}, lost ${topQ.clicksLost || 0} clicks)` 
    : `for "${topic}"`;

  // Deterministic seed based on URL characters for variation
  const charCodeSum = page.url.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const variant = charCodeSum % 3;

  if (page.dropPercentClicks >= 60 || (page.clicksLost && page.clicksLost >= 10)) {
    if (variant === 0) {
      return `Critical intent erosion detected ${queryMention}. Rewrite the introductory hook with high-CTR action modifiers, update all pricing & date references to the current year, and audit the top 3 ranking competitors to cover missing H2 subtopics.`;
    } else if (variant === 1) {
      return `Major ranking displacement detected ${queryMention}. Inject a comparison table or structured FAQ section answering "People Also Ask" questions, and route 2-3 internal links from your newest ranking pages to pass link equity.`;
    } else {
      return `Substantial organic traffic decline detected ${queryMention}. Modernize outdated statistics and media assets, optimize the meta title with current power modifiers, and refresh the primary H1 to closely align with searcher intent.`;
    }
  }

  if (page.dropPercentClicks >= 30) {
    if (variant === 0) {
      return `Ranking softness identified ${queryMention}. Expand thin content sections with recent case studies, add a targeted FAQ section answering high-intent questions, and update the meta description for higher SERP click-through rate.`;
    } else if (variant === 1) {
      return `Organic search impressions have dipped ${queryMention}. Strengthen content depth with specific specifications or user checklists, refresh all outgoing references, and test an updated title tag containing the current year.`;
    } else {
      return `Search visibility is softening ${queryMention}. Re-align the H2 headers with modern commercial search intent, add a quick summary callout box at the top, and verify mobile Core Web Vitals speed.`;
    }
  }

  return `Search impressions have softened ${queryMention}. Update the H1 and H2 tags with current search intent modifiers, refresh all outgoing references, and test an updated title tag containing the current year to lift organic CTR.`;
}
