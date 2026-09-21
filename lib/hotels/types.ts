export interface HotelTaxOrFee {
  included: boolean;
  description: string;
  amount: number;
  currency: string;
}

export interface HotelCancellationDeadline {
  cancelTime?: string;
  amount?: number;
  currency?: string;
  type?: string;
}

export interface HotelCancellationPolicy {
  refundableTag?: "RFN" | "NRFN" | string;
  refundableStatus: "refundable" | "non_refundable";
  deadline?: string;
  penaltyAmount?: number;
  penaltyCurrency?: string;
  cancelPolicies?: HotelCancellationDeadline[];
  remarks?: string[];
}

export interface HotelRate {
  hotelId: string;
  roomId?: string;
  roomName: string;
  boardType?: string;
  boardName?: string;
  price: number;
  currency: string;
  initialPrice?: number;
  suggestedSellingPrice?: number;
  taxesAndFees?: HotelTaxOrFee[];
  cancellationPolicy?: HotelCancellationPolicy;
  isRefundable: boolean;
  refundableStatus: "refundable" | "non_refundable";
  offerId?: string;
  rateId?: string;
  maxOccupancy?: number;
  adultCount?: number;
  childCount?: number;
  paymentTypes?: string[];
}

export interface Hotel {
  id: string;
  name: string;
  description?: string;
  address?: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  starRating?: number;
  rating?: number;
  reviewCount?: number;
  image?: string;
  thumbnail?: string;
  images?: string[];
  amenities?: string[];
  rates?: HotelRate[];
  minRate?: {
    price: number;
    currency: string;
  };
}

export interface HotelSearchParams {
  destination?: string;
  city?: string;
  countryCode?: string;
  hotelIds?: string[];
  checkin: string; // YYYY-MM-DD
  checkout: string; // YYYY-MM-DD
  adults?: number;
  children?: number;
  childrenAges?: number[];
  rooms?: number;
  currency?: string;
  guestNationality?: string;
  limit?: number;
}

export interface HotelSearchMetadata {
  totalHotels: number;
  checkin: string;
  checkout: string;
  adults: number;
  children: number;
  rooms: number;
  destination?: string;
  city?: string;
  countryCode?: string;
  sandbox?: boolean;
}

export interface HotelSearchResult {
  hotels: Hotel[];
  metadata: HotelSearchMetadata;
  currency: string;
  provider: string;
  sessionId?: string;
}

export interface HotelSearchResponse {
  success: boolean;
  data?: HotelSearchResult;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
}
