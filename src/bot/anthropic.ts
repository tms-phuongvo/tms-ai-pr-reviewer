import '../fetch-polyfill'

import crypto from 'crypto'

import {info, setFailed, warning} from '@actions/core'
import {IBot, Ids} from './abc'

import Anthropic, {AnthropicError} from '@anthropic-ai/sdk'
import {
  Message,
  MessageCreateParamsNonStreaming
} from '@anthropic-ai/sdk/resources/messages'

import pRetry from 'p-retry'
import {Options, AnthropicAIOptions} from '../options'

export class AnthropicAIBot implements IBot {
  private readonly api: Anthropic | null = null
  private readonly systemMessage: string | undefined

  constructor(
    private readonly options: Options,
    private readonly anthropicOptions: AnthropicAIOptions
  ) {
    this.options = options
    this.anthropicOptions = anthropicOptions
    if (process.env.ANTHROPIC_API_KEY) {
      const currentDate = new Date().toISOString().split('T')[0]
      this.systemMessage = `${options.systemMessage} 
        Knowledge cutoff: ${anthropicOptions.tokenLimits.knowledgeCutOff}
        Current date: ${currentDate}

        IMPORTANT: Entire response must be in the language with ISO code: ${options.language}
      `
      this.api = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
      })
    } else {
      const err =
        "Unable to initialize the OpenAI API, both 'ANTHROPIC_API_KEY' environment variable are not available"
      throw new AnthropicError(err)
    }
  }

  async chat(message: string): Promise<[string, Ids]> {
    let res: [string, Ids] = ['', {}]
    try {
      res = await this.chat_(message)
      return res
    } catch (e: unknown) {
      if (e instanceof Error) {
        warning(`Failed to chat: ${e}, backtrace: ${e.stack}`)
      }
      return res
    }
  }

  async chat_(message: string): Promise<[string, Ids]> {
    // record timing
    const start = Date.now()
    if (!message) {
      return ['', {}]
    }

    let response: Message | undefined

    if (this.api != null) {
      const config: MessageCreateParamsNonStreaming = {
        model: this.anthropicOptions.model,
        messages: [
          {
            role: 'user',
            content: message
          }
        ],
        system: this.systemMessage,
        temperature: this.options.modelTemperature,
        // eslint-disable-next-line camelcase
        max_tokens: this.anthropicOptions.tokenLimits.maxTokens
      }

      try {
        response = await pRetry(() => this.api!.messages.create(config), {
          retries: this.options.retries
        })
      } catch (e: unknown) {
        if (e instanceof AnthropicError) {
          info(
            `response: ${response}, failed to send message to anthropic: ${e}, backtrace: ${e.stack}`
          )
        }
      }
      const end = Date.now()
      info(`response: ${JSON.stringify(response)}`)
      info(
        `anthropic sendMessage (including retries) response time: ${
          end - start
        } ms`
      )
    } else {
      setFailed('The Anthropic API is not initialized')
    }
    let responseText = ''
    if (response != null) {
      responseText =
        response.content[0].type === 'text' ? response.content[0].text : ''
    } else {
      warning('anthropic response is null')
    }
    // remove the prefix "with " in the response
    if (responseText.startsWith('with ')) {
      responseText = responseText.substring(5)
    }
    if (this.options.debug) {
      info(`anthropic responses: ${responseText}`)
    }
    const parentMessageId = crypto
      .createHash('md5')
      .update(message)
      .digest('hex')
    const newIds: Ids = {
      parentMessageId,
      conversationId: response?.id
    }
    return [responseText, newIds]
  }
}
