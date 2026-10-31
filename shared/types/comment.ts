/** Kommentar som den gemmes. Svar har parentId (kun ét niveau). */
export interface CommentData {
  id: string
  stickerId: string
  /** Visningsnavn på den, der skrev den */
  author: string
  text: string
  parentId?: string
  /** Taggede brugere (@Navn) */
  mentions: string[]
  /** ISO */
  createdAt: string
  editedAt?: string
}

export interface CommentLikes {
  count: number
  /** Logget ind */
  names: string[]
  /** Ikke logget ind */
  anonymous: number
  /** Har denne enhed/bruger givet 👍 */
  mine: boolean
}

export interface CommentView extends CommentData {
  likes: CommentLikes
}

/** Til badges, pr. navn (små bogstaver) */
export interface CommentStats {
  comments: number
  tagged: number
  /** 👍 i alt på ens kommentarer */
  likes: number
  /** Flest 👍 på én kommentar */
  maxLikes: number
}
