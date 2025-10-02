import { NextRequest, NextResponse } from 'next/server';
import { GeneratePlanRequest, Plan } from '@/types';
import { getGroqConfig } from '@/utils/config';
import { generatePlanPrompt, validatePromptContext, sanitizeInput } from '@/utils/prompts';
import { parsePlanResponse, ParseError } from '@/utils/parsers';

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body: GeneratePlanRequest = await request.json();
    
    // Validate required fields
    if (!body.intent?.trim()) {
      return NextResponse.json(
        { error: 'Intent is required' },
        { status: 400 }
      );
    }

    // Sanitize inputs to prevent prompt injection
    const sanitizedIntent = sanitizeInput(body.intent);
    const sanitizedCodeContext = body.codeContext ? sanitizeInput(body.codeContext) : '';

    // Validate prompt context
    try {
      validatePromptContext({
        codeContext: sanitizedCodeContext || ' ', // Provide minimal context if empty
        intent: sanitizedIntent
      });
    } catch (validationError) {
      return NextResponse.json(
        { error: validationError instanceof Error ? validationError.message : 'Invalid input' },
        { status: 400 }
      );
    }

    // Get Groq configuration
    const groqConfig = getGroqConfig();

    // Generate prompt
    const prompt = generatePlanPrompt({
      codeContext: sanitizedCodeContext,
      intent: sanitizedIntent
    });

    // Call Groq API
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqConfig.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: groqConfig.model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: groqConfig.maxTokens,
        temperature: groqConfig.temperature,
      }),
    });

    if (!groqResponse.ok) {
      const errorData = await groqResponse.json().catch(() => ({}));
      
      if (groqResponse.status === 429) {
        return NextResponse.json(
          { 
            error: 'Rate limit exceeded. Please try again later.',
            retryAfter: groqResponse.headers.get('retry-after') || '60'
          },
          { status: 429 }
        );
      }

      if (groqResponse.status === 401) {
        return NextResponse.json(
          { error: 'Invalid API key configuration' },
          { status: 500 }
        );
      }

      console.error('Groq API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to generate plan. Please try again.' },
        { status: 502 }
      );
    }

    const groqData = await groqResponse.json();
    
    if (!groqData.choices?.[0]?.message?.content) {
      return NextResponse.json(
        { error: 'Invalid response from AI service' },
        { status: 502 }
      );
    }

    const aiResponse = groqData.choices[0].message.content;

    // Parse the AI response into a Plan object
    try {
      const plan: Plan = parsePlanResponse(aiResponse);
      return NextResponse.json(plan);
    } catch (parseError) {
      console.error('Parse error:', parseError);
      
      if (parseError instanceof ParseError) {
        return NextResponse.json(
          { 
            error: 'Failed to parse AI response',
            details: parseError.message,
            originalResponse: parseError.originalResponse
          },
          { status: 502 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to process AI response' },
        { status: 502 }
      );
    }

  } catch (error) {
    console.error('Error in generate-plan:', error);
    
    // Handle specific error types
    if (error instanceof Error && error.message.includes('GROQ_API_KEY')) {
      return NextResponse.json(
        { error: 'API configuration error' },
        { status: 500 }
      );
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}