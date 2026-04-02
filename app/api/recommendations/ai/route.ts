import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 });
  }

  try {
    const { ratedBooks, candidates } = await request.json();

    const ratedSummary = ratedBooks
      .map((b: { title: string; author: string; rating: number; genre: string }) =>
        `- "${b.title}" by ${b.author} (${b.genre}): ${b.rating}/10`)
      .join('\n');

    const candidateSummary = candidates
      .map((b: { id: number; title: string; author: string; genre: string; description: string }, i: number) =>
        `${i + 1}. [ID:${b.id}] "${b.title}" by ${b.author} (${b.genre})\n   ${b.description}`)
      .join('\n\n');

    const message = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `You are a literary taste expert. Based on a reader's ratings, re-rank these book candidates and write a personalized 1–2 sentence reason for each.

BOOKS THE READER HAS RATED:
${ratedSummary}

CANDIDATES TO RE-RANK (currently ordered by algorithm score):
${candidateSummary}

Respond with ONLY a JSON array (no markdown, no explanation outside the JSON) in this exact format:
[
  { "bookId": <number>, "reason": "<1-2 sentence personalized reason>" },
  ...
]

Include all ${candidates.length} candidates, re-ordered by your recommendation confidence. Write reasons that reference specific books they've rated and explain the connection.`,
      }],
    });

    const text = (message.content[0] as { type: string; text: string }).text.trim();
    // Strip markdown code fences if present
    const jsonText = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const reranked = JSON.parse(jsonText);
    return NextResponse.json({ reranked });
  } catch (error) {
    console.error('AI recommendations error:', error);
    return NextResponse.json({ error: 'Failed to get AI recommendations' }, { status: 500 });
  }
}
