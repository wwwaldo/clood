# TODO

## OpenRouter refactor
- Swap API endpoint in `src/lib/api.ts` to `https://openrouter.ai/api/v1/chat/completions`
- Change auth header from `x-api-key` to `Authorization: Bearer <key>`
- Convert request body from Anthropic format to OpenAI chat completions format
- Update SSE parsing: `choices[0].delta.content` instead of `content_block_delta`
- Update tool_use parsing to match OpenAI function calling format
- Update `validateApiKey` to use OpenRouter endpoint
- Update key prefix validation in `app/index.tsx` (no longer `sk-ant-`)
- Update `src/lib/storage.ts` key name if needed
