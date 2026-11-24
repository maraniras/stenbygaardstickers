export const CROSSWORD_LETTER_PRICES = [50, 100, 150, 200, 250, 300, 350, 400, 450, 500] as const
export interface CrosswordLetterShop {
  bought: number
  limit: number
  nextPrice: number | null
  letters: Record<string, string>
}
