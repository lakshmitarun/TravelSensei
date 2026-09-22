/**
 * TravelSensei Currency Conversion Types
 * Normalized provider-agnostic representations for currency rates and conversions.
 */

export interface CurrencyConversionParams {
  amount: number;
  from: string;
  to: string;
}

export interface CurrencyConversionResult {
  amount: number;
  from: string;
  to: string;
  rate: number;
  convertedAmount: number;
  date: string;
  provider: "frankfurter";
}

export interface CurrencyInfo {
  code: string;
  name: string;
}

export interface CurrenciesResult {
  currencies: CurrencyInfo[];
  provider: "frankfurter";
}

export interface CurrencyApiResponse<T = CurrencyConversionResult> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
}
