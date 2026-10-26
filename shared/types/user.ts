/** Det en enhed får at vide om sig selv */
export interface MeResponse {
  name: string | null
  avatar?: string
  /** Får denne enhed besked om nye badges */
  push?: boolean
  /** Badges brugeren har set (earnedKeys) */
  seen?: string[]
}

/** Svar når man vælger navn eller bruger en kode: enhedens nøgle */
export interface LoginResponse {
  name: string
  token: string
}

export interface PairCode {
  code: string
  /** ISO-tidspunkt */
  expiresAt: string
}

/** Offentligt om en bruger */
export interface PublicUser {
  name: string
  avatar?: string
}

/** Til admin */
export interface UserSummary {
  name: string
  createdAt: string
  devices: number
  lastSeen: string
}
