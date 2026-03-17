import { Currency } from '../../../../src/common/constants/enums';

export const mockFxRateApiResponse = {
  result: 'success',
  documentation: 'https://www.exchangerate-api.com/docs',
  terms_of_use: 'https://www.exchangerate-api.com/terms',
  time_last_update_unix: 1234567890,
  time_last_update_utc: 'Fri, 13 Feb 2009 23:31:30 +0000',
  time_next_update_unix: 1234567890,
  time_next_update_utc: 'Sat, 14 Feb 2009 00:00:00 +0000',
  base_code: Currency.USD,
  target_code: Currency.EUR,
  conversion_rate: 0.85,
};

export const mockFxRateFailedResponse = {
  result: 'error',
  'error-type': 'invalid-key',
};
