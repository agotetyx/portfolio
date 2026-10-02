import OpenAI from 'openai';
import context from '../../src/data/context.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MAX_MESSAGE_LENGTH = 1000;

const SYSTEM_PROMPT = `You are Anurag Gotety’s personal AI agent, embedded into his portfolio site. Your purpose is to answer questions about his projects, skills, resume, and work experience. 
You are technically fluent, clear, and helpful. Assume the user is a recruiter, collaborator, or hiring manager.
Avoid fluff or vague answers. If the question isn't related to Anurag’s work, politely say it's out of scope. 
If a project name is mentioned, focus your answer on that project's purpose, tech stack, and Anurag’s role.`;

export default async (req) => {
  let message;
  try {
    ({ message } = await req.json());
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof message !== 'string' || !message.trim() || message.length > MAX_MESSAGE_LENGTH) {
    return Response.json({ error: `Message must be 1-${MAX_MESSAGE_LENGTH} characters` }, { status: 400 });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Context:\n${JSON.stringify(context)}\n\nUser Question:\n${message}` }
      ]
    });

    return Response.json({ reply: completion.choices?.[0]?.message?.content || 'No response.' });
  } catch (err) {
    console.error('❌ OpenAI error:', err.message || err);
    return Response.json({ error: 'OpenAI API error' }, { status: 500 });
  }
};

export const config = {
  path: '/api/chat',
  method: 'POST',
  // Per-IP limit so the endpoint can't be used to drain the OpenAI budget.
  rateLimit: { windowLimit: 20, windowSize: 60, aggregateBy: ['ip', 'domain'] }
};
