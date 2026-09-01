// Tests for the Alert.city -> Alert.cities (Json array) matching change.
//
// Critical invariant under test: an alert with multiple cities matches a
// property request in ANY of those cities, not just the first one.
import { describe, it, expect } from 'vitest';
import { matchesAlert, type AlertForMatching, type RequestForMatching } from './matching';

function makeAlert(overrides: Partial<AlertForMatching> = {}): AlertForMatching {
  return {
    id: 'alert-1',
    userId: 'user-1',
    name: 'Villas à Cotonou',
    transactionType: 'VENTE',
    propertyTypes: ['VILLA'],
    country: 'Bénin',
    cities: ['Cotonou', 'Porto-Novo'],
    priceMin: null,
    priceMax: null,
    notifEmail: true,
    notifSms: false,
    notifWhatsapp: false,
    ...overrides,
  };
}

function makeRequest(overrides: Partial<RequestForMatching> = {}): RequestForMatching {
  return {
    id: 'req-1',
    userId: 'user-2',
    transactionType: 'VENTE',
    propertyType: 'VILLA',
    country: 'Bénin',
    city: 'Cotonou',
    budgetMin: null,
    budgetMax: null,
    clientName: 'Awa',
    ...overrides,
  };
}

describe('matchesAlert — multi-city', () => {
  it('matches when the request city is the FIRST city in the alert', () => {
    expect(
      matchesAlert(
        makeAlert({ cities: ['Cotonou', 'Porto-Novo'] }),
        makeRequest({ city: 'Cotonou' }),
      ),
    ).toBe(true);
  });

  it('matches when the request city is a LATER city in the alert (not just the first)', () => {
    expect(
      matchesAlert(
        makeAlert({ cities: ['Cotonou', 'Porto-Novo'] }),
        makeRequest({ city: 'Porto-Novo' }),
      ),
    ).toBe(true);
  });

  it('does not match a city absent from the alert cities', () => {
    expect(
      matchesAlert(
        makeAlert({ cities: ['Cotonou', 'Porto-Novo'] }),
        makeRequest({ city: 'Parakou' }),
      ),
    ).toBe(false);
  });

  it('single-city alert (list of 1) keeps prior behaviour', () => {
    expect(matchesAlert(makeAlert({ cities: ['Cotonou'] }), makeRequest({ city: 'Cotonou' }))).toBe(
      true,
    );
    expect(matchesAlert(makeAlert({ cities: ['Cotonou'] }), makeRequest({ city: 'Parakou' }))).toBe(
      false,
    );
  });

  it('malformed cities (not an array) is treated as no cities, never matches', () => {
    expect(
      matchesAlert(
        makeAlert({ cities: null as unknown as string[] }),
        makeRequest({ city: 'Cotonou' }),
      ),
    ).toBe(false);
  });

  it('still requires country to match regardless of cities', () => {
    expect(
      matchesAlert(
        makeAlert({ country: 'Togo', cities: ['Cotonou'] }),
        makeRequest({ country: 'Bénin', city: 'Cotonou' }),
      ),
    ).toBe(false);
  });
});
