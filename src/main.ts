import {
  getBooleanInput,
  getInput,
  getMultilineInput,
  setFailed,
  warning
} from '@actions/core'
import {OpenAIBot, IBot, GeminiAIBot, AnthropicAIBot} from './bot'
import {
  OpenAIOptions,
  Options,
  Mode,
  GeminiAIOptions,
  AnthropicAIOptions
} from './options'
import {Prompts} from './prompts'
import {codeReview} from './review'
import {handleReviewComment} from './review-comment'

async function run(): Promise<void> {
  const options: Options = new Options(
    getBooleanInput('debug'),
    getBooleanInput('disable_review'),
    getBooleanInput('disable_release_notes'),
    getInput('max_files'),
    getBooleanInput('review_simple_changes'),
    getBooleanInput('review_comment_lgtm'),
    getMultilineInput('path_filters'),
    getInput('system_message'),
    getInput('mode') as Mode,
    getInput('light_model'),
    getInput('heavy_model'),
    getInput('model_temperature'),
    getInput('retries'),
    getInput('timeout_ms'),
    getInput('concurrency_limit'),
    getInput('github_concurrency_limit'),
    getInput('language')
  )

  // print options
  options.print()

  const prompts: Prompts = new Prompts(
    getInput('summarize'),
    getInput('summarize_release_notes')
  )

  // Create two bots, one for summary and one for review

  let lightBot: IBot | null = null
  try {
    if (options.mode === 'openai') {
      lightBot = new OpenAIBot(
        options,
        new OpenAIOptions(options.lightModel, options.lightTokenLimits)
      )
    } else if (options.mode === 'gemini') {
      lightBot = new GeminiAIBot(
        options,
        new GeminiAIOptions(options.lightModel, options.lightTokenLimits)
      )
    } else if (options.mode === 'anthropic') {
      lightBot = new AnthropicAIBot(
        options,
        new AnthropicAIOptions(options.lightModel, options.lightTokenLimits)
      )
    } else {
      throw new Error('Invalid mode')
    }
  } catch (e: any) {
    warning(
      `Skipped: failed to create summary bot, please check your openai_api_key: ${e}, backtrace: ${e.stack}`
    )
    return
  }

  let heavyBot: IBot | null = null
  try {
    if (options.mode === 'openai') {
      heavyBot = new OpenAIBot(
        options,
        new OpenAIOptions(options.heavyModel, options.heavyTokenLimits)
      )
    } else if (options.mode === 'gemini') {
      heavyBot = new GeminiAIBot(
        options,
        new GeminiAIOptions(options.heavyModel, options.heavyTokenLimits)
      )
    } else if (options.mode === 'anthropic') {
      heavyBot = new AnthropicAIBot(
        options,
        new AnthropicAIOptions(options.heavyModel, options.heavyTokenLimits)
      )
    } else {
      throw new Error('Invalid mode')
    }
  } catch (e: any) {
    warning(
      `Skipped: failed to create review bot, please check your openai_api_key: ${e}, backtrace: ${e.stack}`
    )
    return
  }

  try {
    // check if the event is pull_request
    if (
      process.env.GITHUB_EVENT_NAME === 'pull_request' ||
      process.env.GITHUB_EVENT_NAME === 'pull_request_target'
    ) {
      await codeReview(lightBot, heavyBot, options, prompts)
    } else if (
      process.env.GITHUB_EVENT_NAME === 'pull_request_review_comment'
    ) {
      await handleReviewComment(heavyBot, options, prompts)
    } else {
      warning('Skipped: this action only works on push events or pull_request')
    }
  } catch (e: any) {
    if (e instanceof Error) {
      setFailed(`Failed to run: ${e.message}, backtrace: ${e.stack}`)
    } else {
      setFailed(`Failed to run: ${e}, backtrace: ${e.stack}`)
    }
  }
}

process
  .on('unhandledRejection', (reason, p) => {
    warning(`Unhandled Rejection at Promise: ${reason}, promise is ${p}`)
  })
  .on('uncaughtException', (e: any) => {
    warning(`Uncaught Exception thrown: ${e}, backtrace: ${e.stack}`)
  })

await run()
