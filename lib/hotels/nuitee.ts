import {
  Hotel,
  HotelRate,
  HotelTaxOrFee,
  HotelCancellationPolicy,
  HotelSearchParams,
  HotelSearchResult,
  HotelSearchMetadata,
} from "./types";

// Raw LiteAPI / Nuitee Interfaces (Internal to adapter)
interface RawNuiteeTaxOrFee {
  included?: boolean;
  description?: string;
  amount?: number;
  currency?: string;
}

interface RawNuiteePriceItem {
  amount?: number;
  currency?: string;
}

interface RawNuiteeCancelPolicyInfo {
  cancelTime?: string;
  amount?: number;
  currency?: string;
  type?: string;
  timezone?: string;
}

interface RawNuiteeCancellationPolicies {
  refundableTag?: string;
  hotelRemarks?: string[];
  cancelPolicyInfos?: RawNuiteeCancelPolicyInfo[];
}

interface RawNuiteeRate {
  rateId?: string;
  occupancyNumber?: number;
  name?: string;
  maxOccupancy?: number;
  adultCount?: number;
  childCount?: number;
  boardType?: string;
  boardName?: string;
  remarks?: string;
  retailRate?: {
    total?: RawNuiteePriceItem[];
    suggestedSellingPrice?: RawNuiteePriceItem[];
    initialPrice?: RawNuiteePriceItem[];
    taxesAndFees?: RawNuiteeTaxOrFee[];
  };
  cancellationPolicies?: RawNuiteeCancellationPolicies;
  paymentTypes?: string[];
}

interface RawNuiteeRoomType {
  roomTypeId?: string;
  name?: string;
  offerId?: string;
  rates?: RawNuiteeRate[];
}

interface RawNuiteeHotelOffer {
  hotelId: string;
  roomTypes?: RawNuiteeRoomType[];
}

interface RawNuiteeHotelMetadata {
  id: string;
  name: string;
  main_photo?: string;
  thumbnail?: string;
  address?: string;
  country_code?: string;
  city_name?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  stars?: number;
  review_count?: number;
  description?: string;
  facilities?: Array<{ id: number; name: string }>;
  tags?: string[];
}

interface RawNuiteeRatesResponse {
  data?: RawNuiteeHotelOffer[];
  hotels?: RawNuiteeHotelMetadata[];
  sandbox?: boolean;
  guestLevel?: number;
  error?: {
    code?: string | number;
    message?: string;
    details?: unknown;
  };
}

// Error class for Nuitee API failures
export class NuiteeApiError extends Error {
  public status: number;
  public code: string;

  constructor(status: number, message: string, code: string = "NUITEE_ERROR") {
    super(message);
    this.name = "NuiteeApiError";
    this.status = status;
    this.code = code;
  }
}

function getNuiteeConfig(): { apiKey: string; baseUrl: string } {
  const apiKey = process.env.NUITEE_API_KEY;
  const baseUrl = (process.env.NUITEE_API_BASE_URL || "https://api.liteapi.travel/v3.0").replace(/\/+$/, "");

  if (!apiKey || !apiKey.trim()) {
    throw new NuiteeApiError(
      503,
      "Hotel search service is not configured. Missing API key.",
      "MISSING_API_KEY"
    );
  }

  return { apiKey: apiKey.trim(), baseUrl };
}

function mapNuiteeError(status: number, rawData?: Record<string, unknown>): NuiteeApiError {
  const providerError =
    typeof rawData?.error === "object" && rawData?.error !== null
      ? (rawData.error as Record<string, unknown>)
      : undefined;
  const providerMessage =
    typeof providerError?.message === "string"
      ? providerError.message
      : typeof rawData?.message === "string"
      ? rawData.message
      : undefined;
  const providerCode =
    typeof providerError?.code === "string"
      ? providerError.code
      : typeof providerError?.code === "number"
      ? String(providerError.code)
      : "PROVIDER_ERROR";

  switch (status) {
    case 400:
      return new NuiteeApiError(
        400,
        providerMessage || "Invalid hotel search request.",
        "BAD_REQUEST"
      );
    case 401:
      return new NuiteeApiError(
        401,
        "Hotel search service authentication failed.",
        "UNAUTHORIZED"
      );
    case 403:
      return new NuiteeApiError(
        403,
        providerMessage || "Hotel search access forbidden.",
        "FORBIDDEN"
      );
    case 404:
      return new NuiteeApiError(
        404,
        providerMessage || "Requested hotel destination or inventory was not found.",
        "NOT_FOUND"
      );
    case 422:
      return new NuiteeApiError(
        422,
        providerMessage || "Unprocessable hotel search parameters.",
        "UNPROCESSABLE_ENTITY"
      );
    case 429:
      return new NuiteeApiError(
        429,
        "Too many hotel requests. Please try again shortly.",
        "RATE_LIMITED"
      );
    case 500:
      return new NuiteeApiError(
        500,
        "Hotel service encountered a temporary error.",
        "SERVICE_ERROR"
      );
    case 503:
      return new NuiteeApiError(
        503,
        "Hotel service is temporarily unavailable.",
        "SERVICE_UNAVAILABLE"
      );
    default:
      return new NuiteeApiError(
        status >= 500 ? 502 : status,
        providerMessage || "Unable to search hotels right now.",
        providerCode
      );
  }
}

function normalizeTaxesAndFees(rawTaxes?: RawNuiteeTaxOrFee[]): HotelTaxOrFee[] | undefined {
  if (!Array.isArray(rawTaxes) || rawTaxes.length === 0) return undefined;
  return rawTaxes.map((t) => ({
    included: Boolean(t.included),
    description: t.description || "Tax or Fee",
    amount: typeof t.amount === "number" ? t.amount : 0,
    currency: t.currency || "USD",
  }));
}

function normalizeCancellationPolicy(rawPolicy?: RawNuiteeCancellationPolicies): HotelCancellationPolicy | undefined {
  if (!rawPolicy) return undefined;

  const isRfn = rawPolicy.refundableTag === "RFN";
  const cancelPolicies = Array.isArray(rawPolicy.cancelPolicyInfos)
    ? rawPolicy.cancelPolicyInfos.map((c) => ({
        cancelTime: c.cancelTime,
        amount: c.amount,
        currency: c.currency,
        type: c.type,
      }))
    : undefined;

  const firstPolicy = cancelPolicies && cancelPolicies.length > 0 ? cancelPolicies[0] : undefined;

  return {
    refundableTag: rawPolicy.refundableTag,
    refundableStatus: isRfn ? "refundable" : "non_refundable",
    deadline: firstPolicy?.cancelTime,
    penaltyAmount: firstPolicy?.amount,
    penaltyCurrency: firstPolicy?.currency,
    cancelPolicies,
    remarks: rawPolicy.hotelRemarks,
  };
}

function normalizeRate(
  rawRate: RawNuiteeRate,
  hotelId: string,
  offerId?: string,
  roomId?: string,
  roomNameFallback?: string
): HotelRate {
  const roomName = rawRate.name || roomNameFallback || "Standard Room";
  const retailRate = rawRate.retailRate;
  const totalItem = Array.isArray(retailRate?.total) && retailRate?.total[0] ? retailRate.total[0] : undefined;
  const initialItem = Array.isArray(retailRate?.initialPrice) && retailRate?.initialPrice[0] ? retailRate.initialPrice[0] : undefined;
  const sspItem = Array.isArray(retailRate?.suggestedSellingPrice) && retailRate?.suggestedSellingPrice[0] ? retailRate.suggestedSellingPrice[0] : undefined;

  const price = typeof totalItem?.amount === "number" ? totalItem.amount : 0;
  const currency = totalItem?.currency || "USD";

  const isRfn = rawRate.cancellationPolicies?.refundableTag === "RFN";

  return {
    hotelId,
    roomId,
    roomName,
    boardType: rawRate.boardType,
    boardName: rawRate.boardName,
    price,
    currency,
    initialPrice: typeof initialItem?.amount === "number" ? initialItem.amount : undefined,
    suggestedSellingPrice: typeof sspItem?.amount === "number" ? sspItem.amount : undefined,
    taxesAndFees: normalizeTaxesAndFees(retailRate?.taxesAndFees),
    cancellationPolicy: normalizeCancellationPolicy(rawRate.cancellationPolicies),
    isRefundable: isRfn,
    refundableStatus: isRfn ? "refundable" : "non_refundable",
    offerId,
    rateId: rawRate.rateId,
    maxOccupancy: rawRate.maxOccupancy,
    adultCount: rawRate.adultCount,
    childCount: rawRate.childCount,
    paymentTypes: rawRate.paymentTypes,
  };
}

/**
 * Executes a hotel search against Nuitee Connect / LiteAPI v3.0
 */
export async function searchHotels(params: HotelSearchParams): Promise<HotelSearchResult> {
  const { apiKey, baseUrl } = getNuiteeConfig();

  const currency = (params.currency || "USD").toUpperCase().trim();
  const guestNationality = (params.guestNationality || "US").toUpperCase().trim();
  const adults = Math.max(1, params.adults || 1);
  const rooms = Math.max(1, params.rooms || 1);
  const childrenAges = Array.isArray(params.childrenAges) ? params.childrenAges : [];

  // Build occupancies array
  const occupancies = [];
  for (let i = 0; i < rooms; i++) {
    occupancies.push({
      adults,
      ...(childrenAges.length > 0 ? { children: childrenAges } : {}),
    });
  }

  // Construct request payload
  const requestBody: Record<string, unknown> = {
    checkin: params.checkin.trim(),
    checkout: params.checkout.trim(),
    currency,
    guestNationality,
    occupancies,
    includeHotelData: true,
    roomMapping: true,
    timeout: 10,
    limit: Math.min(100, Math.max(1, params.limit || 20)),
  };

  if (Array.isArray(params.hotelIds) && params.hotelIds.length > 0) {
    requestBody.hotelIds = params.hotelIds.map((id) => String(id).trim()).filter(Boolean);
  } else if (params.city || params.destination) {
    const city = (params.city || params.destination || "").trim();
    requestBody.cityName = city;
    if (params.countryCode) {
      requestBody.countryCode = params.countryCode.trim().toUpperCase();
    }
  }

  const url = `${baseUrl}/hotels/rates`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
        Accept: "application/json",
      },
      body: JSON.stringify(requestBody),
      cache: "no-store",
    });
  } catch {
    throw new NuiteeApiError(503, "Failed to connect to hotel provider.", "NETWORK_ERROR");
  }

  if (!res.ok) {
    let errorData: Record<string, unknown> | undefined;
    try {
      errorData = (await res.json()) as Record<string, unknown>;
    } catch {
      // ignore json parse error
    }
    throw mapNuiteeError(res.status, errorData);
  }

  const rawJson = (await res.json()) as RawNuiteeRatesResponse;

  // Build hotel metadata map from "hotels" array
  const metadataMap = new Map<string, RawNuiteeHotelMetadata>();
  if (Array.isArray(rawJson.hotels)) {
    for (const h of rawJson.hotels) {
      if (h && h.id) {
        metadataMap.set(String(h.id), h);
      }
    }
  }

  const rawOffers: RawNuiteeHotelOffer[] = Array.isArray(rawJson.data) ? rawJson.data : [];
  const normalizedHotels: Hotel[] = [];

  // 1. Process hotels that have rates
  const processedHotelIds = new Set<string>();

  for (const offer of rawOffers) {
    const hotelId = String(offer.hotelId);
    processedHotelIds.add(hotelId);

    const meta = metadataMap.get(hotelId);
    const rates: HotelRate[] = [];

    if (Array.isArray(offer.roomTypes)) {
      for (const roomType of offer.roomTypes) {
        if (Array.isArray(roomType.rates)) {
          for (const rawRate of roomType.rates) {
            rates.push(
              normalizeRate(
                rawRate,
                hotelId,
                roomType.offerId,
                roomType.roomTypeId,
                roomType.name
              )
            );
          }
        }
      }
    }

    // Sort rates by price ascending
    rates.sort((a, b) => a.price - b.price);

    const minRate = rates.length > 0
      ? { price: rates[0].price, currency: rates[0].currency }
      : undefined;

    normalizedHotels.push({
      id: hotelId,
      name: meta?.name || `Hotel ${hotelId}`,
      description: meta?.description,
      address: meta?.address,
      city: meta?.city_name || params.city || params.destination,
      country: meta?.country_code || params.countryCode,
      latitude: meta?.latitude,
      longitude: meta?.longitude,
      starRating: meta?.stars,
      rating: meta?.rating,
      reviewCount: meta?.review_count,
      image: meta?.main_photo || meta?.thumbnail,
      thumbnail: meta?.thumbnail,
      amenities: Array.isArray(meta?.tags) ? meta.tags : undefined,
      rates,
      minRate,
    });
  }

  // 2. Include any hotels from metadata list that had no active rates (optional visibility)
  for (const [hotelId, meta] of metadataMap.entries()) {
    if (!processedHotelIds.has(hotelId)) {
      normalizedHotels.push({
        id: hotelId,
        name: meta.name || `Hotel ${hotelId}`,
        description: meta.description,
        address: meta.address,
        city: meta.city_name || params.city || params.destination,
        country: meta.country_code || params.countryCode,
        latitude: meta.latitude,
        longitude: meta.longitude,
        starRating: meta.stars,
        rating: meta.rating,
        reviewCount: meta.review_count,
        image: meta.main_photo || meta.thumbnail,
        thumbnail: meta.thumbnail,
        amenities: Array.isArray(meta.tags) ? meta.tags : undefined,
        rates: [],
      });
    }
  }

  // Sort hotels: those with rates first (sorted by lowest price), then others
  normalizedHotels.sort((a, b) => {
    if (a.minRate && b.minRate) {
      return a.minRate.price - b.minRate.price;
    }
    if (a.minRate) return -1;
    if (b.minRate) return 1;
    return 0;
  });

  const metadata: HotelSearchMetadata = {
    totalHotels: normalizedHotels.length,
    checkin: params.checkin,
    checkout: params.checkout,
    adults,
    children: childrenAges.length,
    rooms,
    destination: params.destination,
    city: params.city,
    countryCode: params.countryCode,
    sandbox: Boolean(rawJson.sandbox),
  };

  return {
    hotels: normalizedHotels,
    metadata,
    currency,
    provider: "Nuitee / LiteAPI",
  };
}
