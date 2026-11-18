# Security Specification & Payload-First TDD

## 1. Data Invariants
1. **PII Isolation**: Customer PII (`clientName`, `clientWhatsapp`, `streetAddress`, `referencePoint`, `email`, `phone`) lives strictly in `/bookings/{bookingId}` and `/users/{userId}`, readable only by the document owner (`request.auth.uid`) or a verified Admin. Public availability reads `/slots/{slotId}` and `/instagram_posts/{postId}`, which contain zero PII.
2. **Email Verification Enforcement**: Every protected read/write on `/bookings`, `/users`, and `/slots` requires `request.auth.token.email_verified == true`. Unverified email/password signups cannot access or create records.
3. **LGPD Consent & Ownership Integrity**: Every `/bookings` and `/users` document created by a customer requires `lgpdConsent == true`, `ownerUid == request.auth.uid`, and server timestamps `request.time`.
4. **Atomic Slot Locking**: A customer cannot create a booking without atomically creating `/slots/{slotId}` (`existsAfter` + `getAfter` validation) where `slotId` matches `YYYY-MM-DD_HH-mm` and is not already occupied.
5. **Admin Isolation**: Admin role checks rely exclusively on verified Firebase Auth identity (`taviinhobr777@gmail.com` with `email_verified == true` or `/admins/{uid}`) and are never exposed in public UI hints.
6. **Strict URL Allowlisting for Embeds**: `/instagram_posts/{postId}` only accepts HTTPS URLs matching `^https://(www\.)?instagram\.com/(reel|p|tv)/[a-zA-Z0-9_\-]+/?.*$` written by Admin.

## 2. The "Dirty Dozen" Attack Payloads
1. Unauthenticated read on `/bookings/{bookingId}` or `/users/{userId}` -> `PERMISSION_DENIED`.
2. Non-owner user attempting `get` or `list` on another user's `/bookings` or `/users` -> `PERMISSION_DENIED`.
3. Unverified email/password user (`email_verified: false`) creating a booking or profile -> `PERMISSION_DENIED`.
4. Shadow update on `/bookings`: adding an unallowed ghost field (`isPaid: true`) -> `PERMISSION_DENIED`.
5. Identity spoofing on `/bookings` create: `ownerUid: 'other-user-uid'` -> `PERMISSION_DENIED`.
6. Non-admin setting `status: 'Confirmado'` or `lgpdConsent: false` during booking creation -> `PERMISSION_DENIED`.
7. Client creating `/bookings/{id}` without atomically creating `/slots/{slotId}` -> `PERMISSION_DENIED`.
8. Non-admin creating a `'blocked'` slot directly in `/slots/{slotId}` -> `PERMISSION_DENIED`.
9. Non-admin attempting to update `status` or `totalPrice` on an existing booking -> `PERMISSION_DENIED`.
10. XSS/malicious link injection (`javascript:alert(1)`) into `/instagram_posts/{id}` -> `PERMISSION_DENIED`.
11. Temporal spoofing: passing a fake past timestamp in `createdAt` instead of `request.time` -> `PERMISSION_DENIED`.
12. Non-admin attempting to create, read, or delete `/templates/{id}` or write `/instagram_posts/{id}` -> `PERMISSION_DENIED`.
