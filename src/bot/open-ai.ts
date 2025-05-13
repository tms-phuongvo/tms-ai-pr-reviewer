import '../fetch-polyfill'

import {info, setFailed, warning} from '@actions/core'

import crypto from 'crypto'

import {OpenAI, OpenAIError} from 'openai'
import {
  ChatCompletion,
  ChatCompletionCreateParamsNonStreaming
} from 'openai/resources'

import pRetry from 'p-retry'
import {OpenAIOptions, Options} from '../options'
import {IBot, Ids} from './abc'

export class OpenAIBot implements IBot {
  private readonly api: OpenAI | null = null // not free
  private readonly systemMessage: string

  constructor(
    private readonly options: Options,
    private readonly openaiOptions: OpenAIOptions
  ) {
    if (process.env.OPENAI_API_KEY) {
      const currentDate = new Date().toISOString().split('T')[0]
      this.systemMessage = `${options.systemMessage} 
        Knowledge cutoff: ${openaiOptions.tokenLimits.knowledgeCutOff}
        Current date: ${currentDate}

        IMPORTANT: Entire response must be in the language with ISO code: ${options.language}
      `
      this.api = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      })
    } else {
      const err =
        "Unable to initialize the OpenAI API, both 'OPENAI_API_KEY' environment variable are not available"
      throw new Error(err)
    }
  }

  async chat(message: string): Promise<[string, Ids]> {
    let res: [string, Ids] = ['', {}]
    try {
      res = await this.chat_(message)
      return res
    } catch (e: unknown) {
      if (e instanceof OpenAIError) {
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

    let response: ChatCompletion | undefined

    if (this.api != null) {
      const params: ChatCompletionCreateParamsNonStreaming = {
        model: this.openaiOptions.model,
        messages: [
          {
            role: 'system',
            content: this.systemMessage
          },
          {role: 'user', content: message}
        ],
        // eslint-disable-next-line camelcase
        max_tokens: this.openaiOptions.tokenLimits.maxTokens,
        temperature: this.options.modelTemperature
      }

      try {
        response = await pRetry(
          () => this.api!.chat.completions.create(params),
          {
            retries: this.options.retries
          }
        )
      } catch (e: unknown) {
        if (e instanceof OpenAIError) {
          info(
            `response: ${response}, failed to send message to openai: ${e}, backtrace: ${e.stack}`
          )
        }
      }
      const end = Date.now()
      info(`response: ${JSON.stringify(response)}`)
      info(
        `openai sendMessage (including retries) response time: ${
          end - start
        } ms`
      )
    } else {
      setFailed('The OpenAI API is not initialized')
    }
    let responseText = ''
    if (response != null) {
      responseText = response.choices[0].message.content ?? ''
    } else {
      warning('openai response is null')
    }
    // remove the prefix "with " in the response
    if (responseText.startsWith('with ')) {
      responseText = responseText.substring(5)
    }
    if (this.options.debug) {
      info(`openai responses: ${responseText}`)
    }
    const messageHash = crypto.createHash('md5').update(message).digest('hex')
    const newIds: Ids = {
      parentMessageId: messageHash,
      conversationId: response?.id
    }
    return [responseText, newIds]
  }
}
