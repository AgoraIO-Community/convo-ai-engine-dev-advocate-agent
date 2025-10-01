# Conversational AI: Marketing Demo for Vapicon

A Next.js-based web-app for conversational AI agents, built with Agora's Real-Time Communication SDK.

<img src="./.github/assets/Conversation-Ai-Client.gif" alt="Conversational AI Client" />

## Guides and Documentation

- [Guide.md](./DOCS/Guide.md) on how to build this application from scratch.
- [User Interaction Diagram](./DOCS/User-Interaction-Diagram.md) for how the application interacts with the different services.

## Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (version 16.x or higher)
- [pnpm](https://pnpm.io/) (version 8.x or higher)

You must have an Agora account and a project to use this application.

- [Agora Account](https://console.agora.io/)

## Installation

1. Clone the repository:

```bash
git clone https://github.com/AgoraIO-Community/conversational-ai-nextjs-client
cd conversational-ai-nextjs-client
```

2. Install dependencies:

```bash
pnpm install
```

3. Create a `.env.local` file in the root directory and add your environment variables:

```bash
cp .env.local.example .env.local
```

The following environment variables are required:

### Agora Configuration

- `NEXT_PUBLIC_AGORA_APP_ID` - Your Agora App ID
- `NEXT_AGORA_APP_CERTIFICATE` - Your Agora App Certificate
- `NEXT_AGORA_CONVO_AI_BASE_URL` - Agora Conversation AI Base URL
- `NEXT_AGORA_CUSTOMER_ID` - Your Agora Customer ID
- `NEXT_AGORA_CUSTOMER_SECRET` - Your Agora Customer Secret
- `NEXT_AGENT_UID` - Agent UID (defaults to "Agent")

### LLM Configuration

- `NEXT_LLM_URL` - LLM API endpoint URL
- `NEXT_PUBLIC_LLM_TOKEN` - LLM API authentication token
- `NEXT_LLM_MODEL` - LLM model to use (optional)

### TTS Configuration

Choose one of the following TTS providers:

#### Microsoft TTS

- `NEXT_TTS_VENDOR=microsoft`
- `NEXT_MICROSOFT_TTS_KEY` - Microsoft TTS API key
- `NEXT_MICROSOFT_TTS_REGION` - Microsoft TTS region
- `NEXT_MICROSOFT_TTS_VOICE_NAME` - Voice name (optional, defaults to 'en-US-AndrewMultilingualNeural')
- `NEXT_MICROSOFT_TTS_RATE` - Speech rate (optional, defaults to 1.0)
- `NEXT_MICROSOFT_TTS_VOLUME` - Volume (optional, defaults to 100.0)

#### ElevenLabs

- `NEXT_TTS_VENDOR=elevenlabs`
- `NEXT_ELEVENLABS_API_KEY` - ElevenLabs API key
- `NEXT_ELEVENLABS_VOICE_ID` - ElevenLabs voice ID
- `NEXT_ELEVENLABS_MODEL_ID` - Model ID (optional, defaults to 'eleven_flash_v2_5')

### Modalities Configuration

- `NEXT_INPUT_MODALITIES` - Comma-separated list of input modalities (defaults to 'text')
- `NEXT_OUTPUT_MODALITIES` - Comma-separated list of output modalities (defaults to 'text,audio')

4. Run the development server:

```bash
pnpm dev
```

4. Open your browser and navigate to `http://localhost:3000` to see the application in action.

## Deployment to Vercel

This project is configured for quick deployments to Vercel.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FAgoraIO-Community%2Fconversational-ai-nextjs-client&project-name=conversational-ai-nextjs-client&repository-name=conversational-ai-nextjs-client&env=NEXT_PUBLIC_AGORA_APP_ID,NEXT_AGORA_APP_CERTIFICATE,NEXT_AGORA_CUSTOMER_ID,NEXT_AGORA_CUSTOMER_SECRET,NEXT_AGENT_UID,NEXT_LLM_API_KEY,NEXT_MICROSOFT_TTS_KEY,NEXT_ELEVENLABS_API_KEY&envDescription=API%20keys%20needed%20for%20the%20application&envLink=https://github.com/AgoraIO-Community/conversational-ai-nextjs-client%23prerequisites&demo-title=Conversational%20AI%20Demo&demo-description=A%20Next.js-based%20web-app%20for%20conversational%20AI%20agents&demo-image=https://raw.githubusercontent.com/AgoraIO-Community/conversational-ai-nextjs-client/main/.github/assets/Conversation-Ai-Client.gif&defaultValues=NEXT_AGORA_CONVO_AI_BASE_URL=https://api.agora.io/api/conversational-ai-agent/v2/projects/,NEXT_LLM_URL=https://api.openai.com/v1/chat/completions,NEXT_LLM_MODEL=gpt-4,NEXT_TTS_VENDOR=microsoft,NEXT_MICROSOFT_TTS_REGION=eastus,NEXT_MICROSOFT_TTS_VOICE_NAME=en-US-AndrewMultilingualNeural,NEXT_ELEVENLABS_VOICE_ID=XrExE9yKIg1WjnnlVkGX,NEXT_ELEVENLABS_MODEL_ID=eleven_flash_v2_5,NEXT_INPUT_MODALITIES=text,NEXT_OUTPUT_MODALITIES=text%2Caudio)

This will:

1. Clone the repository to your GitHub account
2. Create a new project on Vercel
3. Prompt you to fill in the required environment variables:
   - **Required**: Agora credentials (`NEXT_PUBLIC_AGORA_APP_ID`, `NEXT_AGORA_APP_CERTIFICATE`, etc.)
   - **Required**: LLM API key (`NEXT_LLM_API_KEY`) - OpenAI API key by default
   - **Required**: Either Microsoft TTS key (`NEXT_MICROSOFT_TTS_KEY`) or ElevenLabs API key (`NEXT_ELEVENLABS_API_KEY`)
   - Other variables have defaults if values are not provided
4. Deploy the application automatically

## Voice Options

### Microsoft TTS

Male voices:

- en-US-AndrewMultilingualNeural (default)
- en-US-ChristopherNeural (casual, friendly)
- en-US-GuyNeural (professional)
- en-US-JasonNeural (clear, energetic)
- en-US-TonyNeural (enthusiastic)

Female voices:

- en-US-JennyNeural (assistant-like)
- en-US-AriaNeural (professional)
- en-US-EmmaNeural (friendly)
- en-US-SaraNeural (warm)

Try voices: https://speech.microsoft.com/portal/voicegallery

### ElevenLabs

Try voices: https://elevenlabs.io/app/voice-lab

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## API Endpoints

The application provides the following API endpoints:

### Generate Agora Token

- **Endpoint**: `/api/generate-agora-token`
- **Method**: GET
- **Query Parameters**:
  - `uid` (optional) - User ID (defaults to 0)
  - `channel` (optional) - Channel name (auto-generated if not provided)
- **Response**: Returns token, uid, and channel information

### Invite Agent

- **Endpoint**: `/api/invite-agent`
- **Method**: POST
- **Body**:

```typescript
{
  requester_id: string;
  channel_name: string;
  input_modalities?: string[];
  output_modalities?: string[];
}
```

### Stop Conversation

- **Endpoint**: `/api/stop-conversation`
- **Method**: POST
- **Body**:

```typescript
{
  agent_id: string;
}
```
