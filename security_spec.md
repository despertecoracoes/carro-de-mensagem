# Security Specification & Payload-First TDD

## 1. Data Invariants
1. **PII Isolation**: Customer PII (`clientName`, `clientWhatsapp`, `streetAddress`, `referencePoint`) lives strictly in `/bookings/{bookingId}`, readable only by the booking's `ownerUid` or a verified Admin. Public availability reads `/slots/{slotId}`, which contains zero PII.
2. **Atomic Slot Locking**: A customer cannot create a booking without atomically creating `/slots/{slotId}` (`existsAfter` + `getAfter` validation) where `slotId` matches `YYYY-MM-DD_HH-mm` and is not already occupied.
3. **Identity Integrity**: Every booking created by a user must set `ownerUid == request.auth.uid`, `status == 'Pendente'` (unless Admin), and server timestamps `request.time`.
4. **Admin Isolation**: Only verified Admins (`taviinhobr777@gmail.com` with `email_verified == true` or registered in `/admins/{uid}`) can list all bookings, change booking statuses, manage `/templates`, or manually block/unblock `/slots`.
5. **Terminal State Locking**: Bookings marked `Concluído` or `Cancelado` cannot be modified by non-admin users.

## 2. The "Dirty Dozen" Attack Payloads
1. Unauthenticated read on `/bookings/{bookingId}` -> `PERMISSION_DENIED`.
2. Non-owner user attempting `get` or `list` on another user's `/bookings` -> `PERMISSION_DENIED`.
3. Email spoofing attack: user with `email: 'taviinhobr777@gmail.com'` and `email_verified: false` reading `/templates` -> `PERMISSION_DENIED`.
4. Shadow update on `/bookings`: adding an unallowed ghost field (`isPaid: true`) -> `PERMISSION_DENIED`.
5. Identity spoofing on `/bookings` create: `ownerUid: 'other-user-uid'` -> `PERMISSION_DENIED`.
6. Non-admin setting `status: 'Confirmado'` during booking creation -> `PERMISSION_DENIED`.
7. Client creating `/bookings/{id}` without atomically creating `/slots/{slotId}` -> `PERMISSION_DENIED`.
8. Non-admin creating a `'blocked'` slot directly in `/slots/{slotId}` -> `PERMISSION_DENIED`.
9. Non-admin attempting to update `status` or `totalPrice` on an existing booking -> `PERMISSION_DENIED`.
10. Resource poisoning: injecting a 1.5KB string into `honoreeName` or document ID -> `PERMISSION_DENIED`.
11. Temporal spoofing: passing a fake past timestamp in `createdAt` instead of `request.time` -> `PERMISSION_DENIED`.
12. Non-admin attempting to create, read, or delete `/templates/{id}` -> `PERMISSION_DENIED`.
