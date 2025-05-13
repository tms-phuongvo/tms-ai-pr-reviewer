// define type to save parentMessageId and conversationId
export interface Ids {
  parentMessageId?: string
  conversationId?: string
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface IBot {
  chat: (message: string) => Promise<[string, Ids]>
}
