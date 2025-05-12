import {info, setFailed, warning} from '@actions/core'
import {IBot, Ids} from './abc'

import {
  GoogleGenAI,
  GenerateContentResponse,
  GenerateContentConfig
} from '@google/genai'

import pRetry from 'p-retry'
import {Options, GeminiAIOptions} from '../options'

export class GeminiAIBot implements IBot {
  private readonly api: GoogleGenAI | null = null // not free

  private readonly options: Options
  private readonly geminiOptions: GeminiAIOptions
  private readonly systemMessage: string | undefined

  constructor(options: Options, geminiOptions: GeminiAIOptions) {
    this.options = options
    this.geminiOptions = geminiOptions
    if (process.env.GOOGLE_API_KEY) {
      const currentDate = new Date().toISOString().split('T')[0]
      this.systemMessage = `${options.systemMessage} 
Knowledge cutoff: ${geminiOptions.tokenLimits.knowledgeCutOff}
Current date: ${currentDate}

IMPORTANT: Entire response must be in the language with ISO code: ${options.language}
`
      this.api = new GoogleGenAI({
        apiKey: process.env.GOOGLE_API_KEY
      })
    } else {
      const err =
        "Unable to initialize the OpenAI API, both 'OPENAI_API_KEY' environment variable are not available"
      throw new Error(err)
    }
  }

  chat = async (message: string, ids: Ids): Promise<[string, Ids]> => {
    let res: [string, Ids] = ['', {}]
    try {
      res = await this.chat_(message, ids)
      return res
    } catch (e: unknown) {
      if (e instanceof Error) {
        warning(`Failed to chat: ${e}, backtrace: ${e.stack}`)
      }
      return res
    }
  }

  private readonly chat_ = async (
    message: string,
    ids: Ids
  ): Promise<[string, Ids]> => {
    // record timing
    const start = Date.now()
    if (!message) {
      return ['', {}]
    }

    let response: GenerateContentResponse | undefined

    if (this.api != null) {
      const config: GenerateContentConfig = {
        systemInstruction: this.systemMessage,
        temperature: this.options.modelTemperature,
        maxOutputTokens: this.geminiOptions.tokenLimits.maxTokens
      }

      try {
        response = await pRetry(
          () =>
            this.api!.models.generateContent({
              model: this.geminiOptions.model,
              contents: message,
              config
            }),
          {
            retries: this.options.retries
          }
        )
      } catch (e: unknown) {
        if (e instanceof Error) {
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
      responseText = response.text || ''
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
    const newIds: Ids = {
      parentMessageId: response?.responseId,
      conversationId: response?.responseId
    }
    return [responseText, newIds]
  }
}
