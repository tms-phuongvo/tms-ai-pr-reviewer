// define type to save parentMessageId and conversationId
export interface Ids {
  parentMessageId?: string
  conversationId?: string
}

export interface IBot {
  chat: (message: string, ids: Ids) => Promise<[string, Ids]>
}
