export interface StickerMedia {
  type: 'image' | 'video'
  src: string
  /** Stillbillede til video */
  poster?: string
  width?: number
  height?: number
}

export interface StickerData {
  id: string
  title: string
  /** YYYY-MM-DD */
  date: string
  placedBy: string[]
  lat: number
  lng: number
  country: string
  /** ISO 3166-1 alpha-2, fx "DK" */
  countryCode: string
  city: string
  description: string
  media: StickerMedia[]
}

/** Sticker som den ligger i databasen. Indsendte venter på godkendelse. */
export interface StoredSticker extends StickerData {
  status: 'pending' | 'approved'
  /** ISO-tidspunkt for indsendelse via appen */
  submittedAt?: string
}
