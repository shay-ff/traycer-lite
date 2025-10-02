import { NextRequest, NextResponse } from "next/server";
import { ExecuteStepRequest, StepExecution } from "@/types";
import { getGroqConfig } from "@/utils/config";
import {
  generateStepExecutionPrompt,
  validateStepExecutionContext,
  sanitizeInput,
} from "@/utils/prompts";
import { parseStepExecutionResponse, ParseError } from "@/utils/parsers";

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body: ExecuteStepRequest = await request.json();

    // Validate required fields
    if (!body.step) {
      return NextResponse.json({ error: "Step is required" }, { status: 400 });
    }

    if (!body.step.title?.trim()) {
      return NextResponse.json(
        { error: "Step title is required" },
        { status: 400 }
      );
    }

    if (!body.step.description?.trim()) {
      return NextResponse.json(
        { error: "Step description is required" },
        { status: 400 }
      );
    }

    // Sanitize inputs to prevent prompt injection
    const sanitizedTitle = sanitizeInput(body.step.title);
    const sanitizedDescription = sanitizeInput(body.step.description);
    const sanitizedCodeContext = sanitizeInput(body.codeContext || "");

    // Validate step execution context
    try {
      validateStepExecutionContext({
        stepTitle: sanitizedTitle,
        stepDescription: sanitizedDescription,
        codeContext: sanitizedCodeContext,
        inputFiles: body.step.input_files,
      });
    } catch (validationError) {
      return NextResponse.json(
        {
          error:
            validationError instanceof Error
              ? validationError.message
              : "Invalid input",
        },
        { status: 400 }
      );
    }

    // Get Groq configuration
    const groqConfig = getGroqConfig();

    // Generate prompt for step execution
    const prompt = generateStepExecutionPrompt({
      stepTitle: sanitizedTitle,
      stepDescription: sanitizedDescription,
      codeContext: sanitizedCodeContext,
      inputFiles: body.step.input_files,
    });

    // Call Groq API
    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqConfig.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: groqConfig.model,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          max_tokens: groqConfig.maxTokens,
          temperature: groqConfig.temperature,
        }),
      }
    );

    if (!groqResponse.ok) {
      const errorData = await groqResponse.json().catch(() => ({}));

      if (groqResponse.status === 429) {
        return NextResponse.json(
          {
            error: "Rate limit exceeded. Please try again later.",
            retryAfter: groqResponse.headers.get("retry-after") || "60",
          },
          { status: 429 }
        );
      }

      if (groqResponse.status === 401) {
        return NextResponse.json(
          { error: "Invalid API key configuration" },
          { status: 500 }
        );
      }

      console.error("Groq API error:", errorData);
      return NextResponse.json(
        { error: "Failed to execute step. Please try again." },
        { status: 502 }
      );
    }

    const groqData = await groqResponse.json();

    if (!groqData.choices?.[0]?.message?.content) {
      return NextResponse.json(
        { error: "Invalid response from AI service" },
        { status: 502 }
      );
    }

    const aiResponse = groqData.choices[0].message.content;

    // Parse the AI response into a StepExecution object
    try {
      const stepExecution: StepExecution =
        parseStepExecutionResponse(aiResponse);

      // Ensure the step_id matches the input step id
      stepExecution.step_id = body.step.id;

      return NextResponse.json(stepExecution);
    } catch (parseError) {
      console.error("Parse error:", parseError);

      if (parseError instanceof ParseError) {
        return NextResponse.json(
          {
            error: "Failed to parse AI response",
            details: parseError.message,
            originalResponse: parseError.originalResponse,
          },
          { status: 502 }
        );
      }

      return NextResponse.json(
        { error: "Failed to process AI response" },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error("Error in execute-step:", error);

    // Handle specific error types
    if (error instanceof Error && error.message.includes("GROQ_API_KEY")) {
      return NextResponse.json(
        { error: "API configuration error" },
        { status: 500 }
      );
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "Invalid request format" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
