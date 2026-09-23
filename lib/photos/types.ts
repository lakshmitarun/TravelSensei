/**
 * Types for Pexels Photos Backend Feature
 */

export interface NormalizedPhoto {
  id: number;
  width: number;
  height: number;
  photographer: string;
  photographerUrl: string;
  sourceUrl: string;
  imageUrl: string;
  alt: string;
  /** Pexels average color hex (e.g. "#6E633A"). Used for visual quality scoring. */
  avgColor?: string;
}

export interface PhotoSearchParams {
  q: string;
  per_page?: number;
  page?: number;
}

export interface PhotoSearchResponseData {
  photos: NormalizedPhoto[];
  page: number;
  perPage: number;
  totalResults: number;
}

export interface PhotoApiError {
  code: string;
  message: string;
}

export interface PhotoApiResponse {
  success: boolean;
  data?: PhotoSearchResponseData;
  error?: PhotoApiError;
  message?: string;
}

export class PexelsPhotoError extends Error {
  public status: number;
  public code: string;

  constructor(
    status: number = 502,
    message: string = "Photo service is temporarily unavailable.",
    code: string = "PHOTO_PROVIDER_ERROR"
  ) {
    super(message);
    this.name = "PexelsPhotoError";
    this.status = status;
    this.code = code;
  }
}

// Raw Pexels API Response Shapes (Internal provider types)
export interface RawPexelsPhotoSrc {
  original?: string;
  large2x?: string;
  large?: string;
  medium?: string;
  small?: string;
  portrait?: string;
  landscape?: string;
  tiny?: string;
  [key: string]: unknown;
}

export interface RawPexelsPhoto {
  id: number;
  width: number;
  height: number;
  url?: string;
  photographer?: string;
  photographer_url?: string;
  photographer_id?: number;
  avg_color?: string;
  src?: RawPexelsPhotoSrc;
  liked?: boolean;
  alt?: string;
  [key: string]: unknown;
}

export interface RawPexelsSearchResponse {
  page?: number;
  per_page?: number;
  photos?: RawPexelsPhoto[];
  total_results?: number;
  next_page?: string;
  prev_page?: string;
  error?: string;
  [key: string]: unknown;
}
