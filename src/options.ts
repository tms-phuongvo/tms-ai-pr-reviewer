import {info} from '@actions/core'
import {minimatch} from 'minimatch'
import {
  OpenAITokenLimits,
  GeminiTokenLimits,
  AnthropicTokenLimits,
  TokenLimits
} from './limits'

export type Mode = 'openai' | 'gemini'

export class Options {
  debug: boolean
  disableReview: boolean
  disableReleaseNotes: boolean
  maxFiles: number
  reviewSimpleChanges: boolean
  reviewCommentLGTM: boolean
  pathFilters: PathFilter
  systemMessage: string
  mode: Mode
  lightModel: string
  heavyModel: string
  modelTemperature: number
  retries: number
  timeoutMS: number
  concurrencyLimit: number
  githubConcurrencyLimit: number
  lightTokenLimits: TokenLimits
  heavyTokenLimits: TokenLimits
  language: string

  constructor(
    debug: boolean,
    disableReview: boolean,
    disableReleaseNotes: boolean,
    maxFiles = '0',
    reviewSimpleChanges = false,
    reviewCommentLGTM = false,
    pathFilters: string[] | null = null,
    systemMessage = '',
    mode: Mode = 'openai',
    lightModel = 'gpt-4o-mini',
    heavyModel = 'gpt-4o-mini',
    modelTemperature = '0.0',
    retries = '3',
    timeoutMS = '120000',
    concurrencyLimit = '6',
    githubConcurrencyLimit = '6',
    language = 'en-US'
  ) {
    this.debug = debug
    this.disableReview = disableReview
    this.disableReleaseNotes = disableReleaseNotes
    this.maxFiles = parseInt(maxFiles)
    this.reviewSimpleChanges = reviewSimpleChanges
    this.reviewCommentLGTM = reviewCommentLGTM
    this.pathFilters = new PathFilter(pathFilters)
    this.systemMessage = systemMessage
    this.mode = mode
    this.lightModel = lightModel
    this.heavyModel = heavyModel
    this.modelTemperature = parseFloat(modelTemperature)
    this.retries = parseInt(retries)
    this.timeoutMS = parseInt(timeoutMS)
    this.concurrencyLimit = parseInt(concurrencyLimit)
    this.githubConcurrencyLimit = parseInt(githubConcurrencyLimit)
    if (mode === 'openai') {
      this.lightTokenLimits = new OpenAITokenLimits(lightModel)
      this.heavyTokenLimits = new OpenAITokenLimits(heavyModel)
    } else {
      this.lightTokenLimits = new GeminiTokenLimits(lightModel)
      this.heavyTokenLimits = new GeminiTokenLimits(heavyModel)
    }
    this.language = language
  }

  // print all options using core.info
  print(): void {
    info(`debug: ${this.debug}`)
    info(`disable_review: ${this.disableReview}`)
    info(`disable_release_notes: ${this.disableReleaseNotes}`)
    info(`max_files: ${this.maxFiles}`)
    info(`review_simple_changes: ${this.reviewSimpleChanges}`)
    info(`review_comment_lgtm: ${this.reviewCommentLGTM}`)
    info(`path_filters: ${this.pathFilters}`)
    info(`system_message: ${this.systemMessage}`)
    info(`light_model: ${this.lightModel}`)
    info(`heavy_model: ${this.heavyModel}`)
    info(`model_temperature: ${this.modelTemperature}`)
    info(`retries: ${this.retries}`)
    info(`timeout_ms: ${this.timeoutMS}`)
    info(`concurrency_limit: ${this.concurrencyLimit}`)
    info(`github_concurrency_limit: ${this.githubConcurrencyLimit}`)
    info(`summary_token_limits: ${this.lightTokenLimits.string()}`)
    info(`review_token_limits: ${this.heavyTokenLimits.string()}`)
    info(`language: ${this.language}`)
  }

  checkPath(path: string): boolean {
    const ok = this.pathFilters.check(path)
    info(`checking path: ${path} => ${ok}`)
    return ok
  }
}

export class PathFilter {
  private readonly rules: Array<[string /* rule */, boolean /* exclude */]>

  constructor(rules: string[] | null = null) {
    this.rules = []
    if (rules != null) {
      for (const rule of rules) {
        const trimmed = rule?.trim()
        if (trimmed) {
          if (trimmed.startsWith('!')) {
            this.rules.push([trimmed.substring(1).trim(), true])
          } else {
            this.rules.push([trimmed, false])
          }
        }
      }
    }
  }

  check(path: string): boolean {
    if (this.rules.length === 0) {
      return true
    }

    let included = false
    let excluded = false
    let inclusionRuleExists = false

    for (const [rule, exclude] of this.rules) {
      if (minimatch(path, rule)) {
        if (exclude) {
          excluded = true
        } else {
          included = true
        }
      }
      if (!exclude) {
        inclusionRuleExists = true
      }
    }

    return (!inclusionRuleExists || included) && !excluded
  }
}

export class OpenAIOptions {
  model: string
  tokenLimits: OpenAITokenLimits

  constructor(
    model = 'gpt-4o-mini',
    tokenLimits: OpenAITokenLimits | null = null
  ) {
    this.model = model
    if (tokenLimits != null) {
      this.tokenLimits = tokenLimits
    } else {
      this.tokenLimits = new OpenAITokenLimits(model)
    }
  }
}

export class GeminiAIOptions {
  model: string
  tokenLimits: GeminiTokenLimits

  constructor(
    model = 'gemini-1.5-flash',
    tokenLimits: GeminiTokenLimits | null = null
  ) {
    this.model = model
    if (tokenLimits != null) {
      this.tokenLimits = tokenLimits
    } else {
      this.tokenLimits = new GeminiTokenLimits(model)
    }
  }
}

export class AnthropicAIOptions {
  model: string
  tokenLimits: GeminiTokenLimits

  constructor(
    model = 'claude-3-5-sonnet',
    tokenLimits: AnthropicTokenLimits | null = null
  ) {
    this.model = model
    if (tokenLimits != null) {
      this.tokenLimits = tokenLimits
    } else {
      this.tokenLimits = new GeminiTokenLimits(model)
    }
  }
}
