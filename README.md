# Coding Agent Planner

An AI-powered coding assistant that generates step-by-step implementation plans and executes code changes using Groq's LLM API. Built with Next.js 15 and TypeScript.

## Features

- **Plan Generation**: Generate detailed, step-by-step implementation plans from code context and user intent
- **Step Execution**: Execute individual steps with AI-generated code patches
- **Groq Integration**: Powered by Groq's fast LLM API (llama-3.1-70b-versatile)
- **Input Validation**: Comprehensive request validation and sanitization
- **Error Handling**: Robust error handling with rate limiting support
- **TypeScript**: Full type safety throughout the application

## API Endpoints

### POST `/api/generate-plan`

Generates an implementation plan based on code context and user intent.

**Request Body:**

```json
{
  "codeContext": "string",
  "intent": "string"
}
```

**Response:**

```json
{
  "task": "string",
  "language": "string",
  "file": "string",
  "steps": [
    {
      "id": "string",
      "title": "string",
      "description": "string",
      "input_files": ["string"],
      "output": {
        "type": "patch",
        "patch_format": "unified_diff"
      }
    }
  ]
}
```

### POST `/api/execute-step`

Executes a specific step and returns code changes.

**Request Body:**

```json
{
  "step": {
    "id": "string",
    "title": "string",
    "description": "string",
    "input_files": ["string"]
  },
  "codeContext": "string"
}
```

**Response:**

```json
{
  "step_id": "string",
  "suggested_patch": {
    "format": "unified_diff",
    "diff": "string"
  },
  "explanation": "string"
}
```

## Setup

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd coding-agent-planner
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Configuration**

   Create a `.env.local` file with your Groq API credentials:

   ```bash
   GROQ_API_KEY=your_groq_api_key_here
   GROQ_MODEL=llama-3.1-70b-versatile
   GROQ_MAX_TOKENS=4096
   GROQ_TEMPERATURE=0.1
   ```

   Get your Groq API key from [console.groq.com](https://console.groq.com)

4. **Run the development server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── generate-plan/route.ts    # Plan generation endpoint
│   │   └── execute-step/route.ts     # Step execution endpoint
│   └── page.tsx                      # Main page (UI coming soon)
├── types/
│   └── index.ts                      # TypeScript type definitions
└── utils/
    ├── config.ts                     # Environment configuration
    ├── prompts.ts                    # LLM prompt generation
    └── parsers.ts                    # Response parsing and validation
```


## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **AI Provider**: Groq API (llama-3.1-70b-versatile)
- **Styling**: Tailwind CSS
- **Validation**: Custom input sanitization and validation

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request or open an issue for any bugs, feature requests, or improvements.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

MIT
