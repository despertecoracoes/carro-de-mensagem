/**
 * Security Rules Verification Suite (Dirty Dozen Payloads)
 * Designed for @firebase/rules-unit-testing against Firestore Emulator.
 */
export const DIRTY_DOZEN_CASES = [
  {
    id: 'DD-01',
    description: 'Unauthenticated user cannot read bookings or users PII',
    collection: 'bookings',
    operation: 'get',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-02',
    description: 'Authenticated non-owner cannot read another user booking or profile',
    collection: 'users',
    operation: 'get',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-03',
    description: 'Unverified email user (email_verified: false) cannot create booking',
    collection: 'bookings',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-04',
    description: 'Shadow field injection (ghost field isVerified) rejected on create',
    collection: 'bookings',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-05',
    description: 'Owner UID spoofing rejected on booking create',
    collection: 'bookings',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-06',
    description: 'Booking create with lgpdConsent: false or status: Confirmado rejected',
    collection: 'bookings',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-07',
    description: 'Booking create without atomic slot lock fails existsAfter check',
    collection: 'bookings',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-08',
    description: 'Non-admin cannot block slots arbitrarily',
    collection: 'slots',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-09',
    description: 'Non-admin cannot alter booking status or totalPrice on update',
    collection: 'bookings',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-10',
    description: 'Non-Instagram or javascript: URL rejected in instagram_posts',
    collection: 'instagram_posts',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-11',
    description: 'Fake client createdAt timestamp rejected by request.time check',
    collection: 'bookings',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-12',
    description: 'Non-admin cannot write to templates, instagram_posts, or admins collections',
    collection: 'templates',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
  },
] as const;
