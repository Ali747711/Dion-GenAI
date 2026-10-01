export type LyricsMode = "lyrics" | "generate";
export type VocalGender = "male" | "female" | null;

export interface MusicInput {
  prompt: string;
  lyricsMode: LyricsMode;
  lyrics?: string;
  lyricsPrompt?: string;
  title?: string;
  tags?: string[];
  negativeTags?: string[];
  vocalGender?: VocalGender;
}
