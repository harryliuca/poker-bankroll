// App configuration constants

export const CURRENCIES = [
  { label: 'USD ($)', value: 'USD' },
  { label: 'EUR (€)', value: 'EUR' },
  { label: 'GBP (£)', value: 'GBP' },
  { label: 'CAD (C$)', value: 'CAD' },
  { label: 'AUD (A$)', value: 'AUD' },
  { label: 'CNY (¥)', value: 'CNY' },
] as const;

export const GAME_TYPES = [
  { label: 'Cash Game', value: 'cash' },
  { label: 'Tournament', value: 'tournament' },
  { label: 'Sit & Go', value: 'sng' },
] as const;

export const LOCATION_TYPES = [
  { label: 'Live', value: 'live' },
  { label: 'Online', value: 'online' },
] as const;

export const DEFAULT_SETTINGS = {
  currency: 'USD' as const,
  default_game_type: 'cash' as const,
  default_variant: 'nlhe',
  timezone: 'UTC',
};

// Common stakes for quick selection
export const COMMON_STAKES = {
  cash: [
    '0.25/0.50',
    '0.50/1',
    '1/2',
    '1/3',
    '2/5',
    '5/10',
    '10/20',
    '25/50',
  ],
  tournament: [
    '$50',
    '$100',
    '$200',
    '$500',
    '$1,000',
    '$2,000',
    '$5,000',
    '$10,000',
  ],
  sng: [
    '$10',
    '$20',
    '$50',
    '$100',
    '$200',
  ],
};
