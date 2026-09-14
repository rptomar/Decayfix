import Anthropic from '@anthropic-ai/sdk';

export interface PageSuggestionInput {
  url: string;
  title: string;
  baselineClicks: number;
  recentClicks: number;
  dropPercentClicks: number;
  dropPercentImpressions: number;
}

/**
 * Generates an AI-driven content refresh suggestion.
 * Supports:
 * 1. Google Gemini API (100% Free on Google AI Studio tier)
 * 2. Groq Cloud API (100% Free tier)
 * 3. Anthropic Claude API (Claude 3.5 Haiku)
 * 4. Built-in Smart Heuristic SEO Rule Engine (100% Free, 0 external API calls)
 */
export async function generateContentSuggestion(page: PageSuggestionInput): Promise<string> {
  const prompt = `You are a world-class SEO strategist and content editor.
A blog post has suffered search traffic decay:
- URL: ${page.url}
- Title/Topic: ${page.title}
- Historical Baseline Clicks: ${page.baselineClicks}
- Recent Clicks: ${page.recentClicks} (Drop: ${page.dropPercentClicks}%)
- Impression Drop: ${page.dropPercentImpressions}%

Provide a concise, 2-to-4 sentence specific recommendation for how the blogger should refresh and optimize this page to recover its rankings and traffic.
Focus on actionable advice (e.g. updating outdated stats/dates, addressing new user search intent, expanding weak sections, improving title CTR, or adding relevant FAQs).
Keep it strictly under 4 sentences. Do not use conversational filler.`;

  // 1. Check for Free Google Gemini API (GEMINI_API_KEY)
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey && !geminiKey.startsWith('dummy_') && geminiKey.trim() !== '') {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 250, temperature: 0.3 },
          }),
        }
      );
      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text && text.trim().length > 0) {
        return text.trim();
      }
    } catch (err: any) {
      console.warn('Gemini API call failed, falling back:', err?.message || err);
    }
  }

  // 2. Check for Free Groq API (GROQ_API_KEY)
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey && !groqKey.startsWith('dummy_') && groqKey.trim() !== '') {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 250,
          temperature: 0.3,
        }),
      });
      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content;
      if (text && text.trim().length > 0) {
        return text.trim();
      }
    } catch (err: any) {
      console.warn('Groq API call failed, falling back:', err?.message || err);
    }
  }

  // 3. Check for Anthropic Claude API (ANTHROPIC_API_KEY)
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey && !anthropicKey.startsWith('dummy_') && anthropicKey.trim() !== '') {
    try {
      const anthropic = new Anthropic({ apiKey: anthropicKey });
      const message = await anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 250,
        temperature: 0.3,
        messages: [{ role: 'user', content: prompt }],
      });

      const contentBlock = message.content[0];
      if (contentBlock.type === 'text') {
        return contentBlock.text.trim();
      }
    } catch (error: any) {
      console.warn(`Anthropic API call failed for ${page.url}:`, error?.message || error);
    }
  }

  // 4. Built-in Smart Heuristic SEO Rule Engine (100% Free, Zero External API Dependency)
  return generateFallbackSuggestion(page);
}

/**
 * Smart Heuristic fallback suggestion generator
 */
export function generateFallbackSuggestion(page: {
  title: string;
  dropPercentClicks: number;
  baselineClicks: number;
}): string {
  const topic = page.title || 'this topic';

  if (page.dropPercentClicks >= 65) {
    return `Major search intent shift detected. Audit the current top 3 Google SERP competitors for "${topic}" to identify newly added sections, update all dates/screenshots to the current year, and rewrite the introductory hook. Update the meta title and H1 tag with compelling power modifiers to regain lost CTR.`;
  }

  if (page.dropPercentClicks >= 40) {
    return `Notable ranking softness detected. Refresh outdated statistics, replace obsolete outbound references, and add a targeted 3-question FAQ section directly answering "People Also Ask" queries for "${topic}". Ensure internal links from your latest high-authority blog posts point directly to this URL.`;
  }

  return `Search impressions have softened. Expand thin content sections with recent examples, optimize header hierarchy (H2/H3) for target search terms, and test an updated title tag containing the current year to boost organic click-through rates.`;
}
