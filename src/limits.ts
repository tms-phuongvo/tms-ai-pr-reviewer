export interface TokenLimits {
  maxTokens: number
  requestTokens: number
  responseTokens: number
  knowledgeCutOff: string

  string(): string
}

export class OpenAITokenLimits implements TokenLimits {
  maxTokens: number
  requestTokens: number
  responseTokens: number
  knowledgeCutOff: string

  constructor(model = 'gpt-4o-mini') {
    this.knowledgeCutOff = '2023-10-1'
    if (model === 'gpt-4o-mini') {
      this.maxTokens = 128000
      this.responseTokens = 3000
    } else if (model === 'gpt-4.1-mini') {
      this.maxTokens = 128000
      this.responseTokens = 3000
    } else if (model === 'gpt-4o') {
      this.maxTokens = 128000
      this.responseTokens = 3000
    } else if (model === 'gpt-4.1') {
      this.maxTokens = 1047576
      this.responseTokens = 3000
    } else {
      this.maxTokens = 128000
      this.responseTokens = 2000
    }
    // provide some margin for the request tokens
    this.requestTokens = this.maxTokens - this.responseTokens - 100
  }

  string(): string {
    return `max_tokens=${this.maxTokens}, request_tokens=${this.requestTokens}, response_tokens=${this.responseTokens}`
  }
}

export class GeminiTokenLimits implements TokenLimits {
  maxTokens: number
  requestTokens: number
  responseTokens: number
  knowledgeCutOff: string

  constructor(model = 'gemini-1.5-flash') {
    this.knowledgeCutOff = '2025-05-11'
    if (model === 'gemini-1.5-flash') {
      this.maxTokens = 1048576
      this.responseTokens = 3000
    } else if (model === 'gemini-1.5-pro') {
      this.maxTokens = 2097152
      this.responseTokens = 3000
    } else if (model === 'gemini-2.0-flash') {
      this.maxTokens = 1048576
      this.responseTokens = 3000
    } else {
      this.maxTokens = 1048576
      this.responseTokens = 1000
    }
    // provide some margin for the request tokens
    this.requestTokens = this.maxTokens - this.responseTokens - 100
  }

  string(): string {
    return `max_tokens=${this.maxTokens}, request_tokens=${this.requestTokens}, response_tokens=${this.responseTokens}`
  }
}

export class AnthropicTokenLimits implements TokenLimits {
  maxTokens: number
  requestTokens: number
  responseTokens: number
  knowledgeCutOff: string

  constructor(model = 'claude-3-opus-20240229') {
    this.knowledgeCutOff = '2024-06-20'
    if (model === 'claude-3-opus-20240229') {
      this.maxTokens = 200000
      this.responseTokens = 3000
    } else if (model === 'claude-3-5-haiku-20241022') {
      this.maxTokens = 200000
      this.responseTokens = 3000
    } else if (model === 'claude-3-5-sonnet-20241022') {
      this.maxTokens = 200000
      this.responseTokens = 3000
    } else {
      this.maxTokens = 200000
      this.responseTokens = 1000
    }
    // provide some margin for the request tokens
    this.requestTokens = this.maxTokens - this.responseTokens - 100
  }

  string(): string {
    return `max_tokens=${this.maxTokens}, request_tokens=${this.requestTokens}, response_tokens=${this.responseTokens}`
  }
}
