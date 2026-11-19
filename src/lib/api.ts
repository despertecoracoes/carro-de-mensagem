import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  Unsubscribe,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  AvailabilityResponse,
  Booking,
  BookingStatus,
  InstagramPost,
  QuickTemplate,
  TemplateCategory,
  TimeSlotAvailability,
  UserProfile,
} from '../types/booking';
import {
  calculatePrices,
  getBlockedDateReason,
  STANDARD_TIME_SLOTS,
} from '../constants/pricing';
import {
  auth,
  db,
  handleFirestoreError,
  isAdminUser,
  OperationType,
} from './firebase';
import { generateLocalTributeMessage } from './messageGenerator';
import { DEFAULT_TEMPLATES } from './seedTemplates';

function makeSlotId(date: string, time: string): string {
  return `${date}_${time.replace(':', '-')}`;
}

function formatTimestamp(val: unknown): string {
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (typeof val === 'string') {
    return val;
  }
  return new Date().toISOString();
}

function mapDocToBooking(id: string, data: Record<string, unknown>): Booking {
  const songsRaw = Array.isArray(data.songs) ? data.songs : ['', '', ''];
  return {
    id,
    ownerUid: String(data.ownerUid ?? ''),
    slotId: String(data.slotId ?? ''),
    protocol: String(data.protocol ?? ''),
    date: String(data.date ?? ''),
    time: String(data.time ?? ''),
    occasion: data.occasion as Booking['occasion'],
    honoreeName: String(data.honoreeName ?? ''),
    honoreeAge: String(data.honoreeAge ?? ''),
    clientName: String(data.clientName ?? ''),
    clientWhatsapp: String(data.clientWhatsapp ?? ''),
    neighborhood: String(data.neighborhood ?? ''),
    streetAddress: String(data.streetAddress ?? ''),
    propertyType: (data.propertyType as Booking['propertyType']) ?? 'Casa',
    referencePoint: String(data.referencePoint ?? ''),
    giftOption: (data.giftOption as Booking['giftOption']) ?? 'champanhe',
    includeFireworks: Boolean(data.includeFireworks),
    songs: [
      String(songsRaw[0] ?? ''),
      String(songsRaw[1] ?? ''),
      String(songsRaw[2] ?? ''),
    ],
    messageSource: (data.messageSource as Booking['messageSource']) ?? 'empresa',
    customMessage: String(data.customMessage ?? ''),
    generatedScript: String(data.generatedScript ?? ''),
    basePrice: Number(data.basePrice ?? 250),
    extrasPrice: Number(data.extrasPrice ?? 0),
    totalPrice: Number(data.totalPrice ?? 250),
    status: (data.status as BookingStatus) ?? 'Pendente',
    notes: String(data.notes ?? ''),
    lgpdConsent: Boolean(data.lgpdConsent ?? true),
    createdAt: formatTimestamp(data.createdAt),
  };
}

function buildAvailabilityFromDocs(
  date: string,
  slotDocs: Array<{ time: string; status: 'booked' | 'blocked' }>
): AvailabilityResponse {
  const blockedReason = getBlockedDateReason(date);
  if (blockedReason) {
    const slots: TimeSlotAvailability[] = STANDARD_TIME_SLOTS.map((time) => ({
      time,
      state: 'blocked',
    }));
    return {
      date,
      slots,
      standardSlots: STANDARD_TIME_SLOTS,
      blockedReason,
    };
  }

  const map = new Map<string, 'booked' | 'blocked'>();
  for (const item of slotDocs) {
    map.set(item.time, item.status);
  }
  const slots: TimeSlotAvailability[] = STANDARD_TIME_SLOTS.map((time) => {
    const st = map.get(time);
    return {
      time,
      state: st === 'booked' ? 'booked' : st === 'blocked' ? 'blocked' : 'available',
    };
  });
  return {
    date,
    slots,
    standardSlots: STANDARD_TIME_SLOTS,
    blockedReason: null,
  };
}

export async function fetchAvailability(date: string): Promise<AvailabilityResponse> {
  const path = 'slots';
  try {
    const q = query(collection(db, path), where('date', '==', date));
    const snap = await getDocs(q);
    const items = snap.docs.map((d) => ({
      time: String(d.data().time ?? ''),
      status: d.data().status as 'booked' | 'blocked',
    }));
    return buildAvailabilityFromDocs(date, items);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export function subscribeAvailability(
  date: string,
  onData: (res: AvailabilityResponse) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'slots';
  const q = query(collection(db, path), where('date', '==', date));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({
        time: String(d.data().time ?? ''),
        status: d.data().status as 'booked' | 'blocked',
      }));
      onData(buildAvailabilityFromDocs(date, items));
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) {
          onError(wrapped);
        }
      }
    }
  );
}

export async function toggleSlotBlock(
  date: string,
  time: string
): Promise<AvailabilityResponse> {
  const user = auth.currentUser;
  if (!user || !isAdminUser(user)) {
    throw new Error('Acesso restrito.');
  }

  const blockedReason = getBlockedDateReason(date);
  if (blockedReason) {
    throw new Error(`Data bloqueada automaticamente: ${blockedReason}`);
  }

  const slotId = makeSlotId(date, time);
  const path = `slots/${slotId}`;
  const slotRef = doc(db, 'slots', slotId);

  try {
    const snap = await getDoc(slotRef);
    if (snap.exists()) {
      const status = snap.data().status;
      if (status === 'booked') {
        throw new Error('Este horário possui um agendamento ativo. Cancele o evento na agenda para liberar.');
      }
      await deleteDoc(slotRef);
    } else {
      await setDoc(slotRef, {
        date,
        time,
        status: 'blocked',
        createdByUid: user.uid,
        updatedAt: serverTimestamp(),
      });
    }
    return await fetchAvailability(date);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('possui um agendamento ativo')
    ) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchBookings(): Promise<Booking[]> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) {
    return [];
  }

  const path = 'bookings';
  try {
    const q = isAdminUser(user)
      ? collection(db, path)
      : query(collection(db, path), where('ownerUid', '==', user.uid));

    const snap = await getDocs(q);
    const list = snap.docs.map((d) =>
      mapDocToBooking(d.id, d.data() as Record<string, unknown>)
    );
    return list.sort((a, b) =>
      `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function createBookingApi(payload: {
  date: string;
  time: string;
  occasion: Booking['occasion'];
  honoreeName: string;
  honoreeAge: string;
  clientName: string;
  clientWhatsapp: string;
  neighborhood: string;
  streetAddress: string;
  propertyType: Booking['propertyType'];
  referencePoint: string;
  giftOption: Booking['giftOption'];
  includeFireworks: boolean;
  songs: [string, string, string];
  messageSource: Booking['messageSource'];
  customMessage: string;
  generatedScript?: string;
  basePrice?: number;
  status?: BookingStatus;
  notes?: string;
  lgpdConsent?: boolean;
}): Promise<Booking> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Entre ou crie sua conta para confirmar o agendamento.');
  }
  if (!user.emailVerified) {
    throw new Error('Confirme seu e-mail pelo link enviado antes de concluir a reserva.');
  }

  const blockedReason = getBlockedDateReason(payload.date);
  if (blockedReason) {
    throw new Error(`Data indisponível: ${blockedReason}`);
  }

  const slotId = makeSlotId(payload.date, payload.time);
  const bookingId = `bkg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const slotRef = doc(db, 'slots', slotId);
  const bookingRef = doc(db, 'bookings', bookingId);

  try {
    const existingSlot = await getDoc(slotRef);
    if (existingSlot.exists()) {
      throw new Error(
        `O horário ${payload.time} do dia ${payload.date} acabou de ser reservado ou bloqueado.`
      );
    }

    const prices = calculatePrices(
      payload.basePrice ?? payload.neighborhood,
      payload.giftOption,
      payload.includeFireworks
    );
    const dateCompact = payload.date.replaceAll('-', '').slice(2);
    const protocol = `DC-${dateCompact}-${Math.floor(10 + Math.random() * 89)}`;
    const status: BookingStatus = isAdminUser(user)
      ? payload.status ?? 'Confirmado'
      : 'Pendente';

    const bookingDoc = {
      ownerUid: user.uid,
      slotId,
      protocol: protocol.slice(0, 32),
      date: payload.date.slice(0, 10),
      time: payload.time.slice(0, 5),
      occasion: payload.occasion,
      honoreeName: payload.honoreeName.trim().slice(0, 120),
      honoreeAge: payload.honoreeAge.trim().slice(0, 40),
      clientName: payload.clientName.trim().slice(0, 120),
      clientWhatsapp: payload.clientWhatsapp.trim().slice(0, 30),
      neighborhood: payload.neighborhood.trim().slice(0, 140),
      streetAddress: payload.streetAddress.trim().slice(0, 200),
      propertyType: payload.propertyType,
      referencePoint: payload.referencePoint.trim().slice(0, 200),
      giftOption: payload.giftOption,
      includeFireworks: Boolean(payload.includeFireworks),
      songs: [
        payload.songs[0].trim().slice(0, 160),
        payload.songs[1].trim().slice(0, 160),
        payload.songs[2].trim().slice(0, 160),
      ],
      messageSource: payload.messageSource,
      customMessage: payload.customMessage.trim().slice(0, 2000),
      generatedScript: (payload.generatedScript ?? '').trim().slice(0, 3000),
      basePrice: prices.basePrice,
      extrasPrice: prices.extrasPrice,
      totalPrice: prices.totalPrice,
      status,
      notes: (payload.notes ?? '').trim().slice(0, 1000),
      lgpdConsent: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const batch = writeBatch(db);
    batch.set(bookingRef, bookingDoc);
    batch.set(slotRef, {
      date: bookingDoc.date,
      time: bookingDoc.time,
      status: 'booked',
      bookingId,
      createdByUid: user.uid,
      updatedAt: serverTimestamp(),
    });
    await batch.commit();

    return {
      id: bookingId,
      ownerUid: user.uid,
      slotId,
      protocol: bookingDoc.protocol,
      date: bookingDoc.date,
      time: bookingDoc.time,
      occasion: bookingDoc.occasion,
      honoreeName: bookingDoc.honoreeName,
      honoreeAge: bookingDoc.honoreeAge,
      clientName: bookingDoc.clientName,
      clientWhatsapp: bookingDoc.clientWhatsapp,
      neighborhood: bookingDoc.neighborhood,
      streetAddress: bookingDoc.streetAddress,
      propertyType: bookingDoc.propertyType,
      referencePoint: bookingDoc.referencePoint,
      giftOption: bookingDoc.giftOption,
      includeFireworks: bookingDoc.includeFireworks,
      songs: bookingDoc.songs as [string, string, string],
      messageSource: bookingDoc.messageSource,
      customMessage: bookingDoc.customMessage,
      generatedScript: bookingDoc.generatedScript,
      basePrice: bookingDoc.basePrice,
      extrasPrice: bookingDoc.extrasPrice,
      totalPrice: bookingDoc.totalPrice,
      status: bookingDoc.status,
      notes: bookingDoc.notes,
      lgpdConsent: true,
      createdAt: new Date().toISOString(),
    };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('acabou de ser reservado')
    ) {
      throw error;
    }
    handleFirestoreError(error, OperationType.CREATE, `bookings/${bookingId}`);
  }
}

export async function updateBookingApi(
  id: string,
  patch: Partial<
    Pick<Booking, 'status' | 'generatedScript' | 'notes' | 'customMessage'>
  >
): Promise<Booking> {
  const path = `bookings/${id}`;
  const bookingRef = doc(db, 'bookings', id);
  try {
    const snap = await getDoc(bookingRef);
    if (!snap.exists()) {
      throw new Error('Agendamento não encontrado.');
    }
    const current = snap.data() as Record<string, unknown>;
    const slotId = String(current.slotId ?? '');

    const cleanPatch: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };
    if (patch.status !== undefined) cleanPatch.status = patch.status;
    if (patch.generatedScript !== undefined) {
      cleanPatch.generatedScript = patch.generatedScript.slice(0, 3000);
    }
    if (patch.notes !== undefined) cleanPatch.notes = patch.notes.slice(0, 1000);
    if (patch.customMessage !== undefined) {
      cleanPatch.customMessage = patch.customMessage.slice(0, 2000);
    }

    const batch = writeBatch(db);
    batch.update(bookingRef, cleanPatch);
    if (patch.status === 'Cancelado' && slotId) {
      batch.delete(doc(db, 'slots', slotId));
    }
    await batch.commit();

    return mapDocToBooking(id, { ...current, ...cleanPatch });
  } catch (error) {
    if (error instanceof Error && error.message === 'Agendamento não encontrado.') {
      throw error;
    }
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteBookingApi(id: string): Promise<void> {
  const path = `bookings/${id}`;
  const bookingRef = doc(db, 'bookings', id);
  try {
    const snap = await getDoc(bookingRef);
    const slotId = snap.exists() ? String(snap.data().slotId ?? '') : '';

    const batch = writeBatch(db);
    batch.delete(bookingRef);
    if (slotId) {
      batch.delete(doc(db, 'slots', slotId));
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    const d = snap.data();
    return {
      uid,
      displayName: String(d.displayName ?? ''),
      email: String(d.email ?? ''),
      phone: String(d.phone ?? ''),
      lgpdConsent: Boolean(d.lgpdConsent ?? true),
      createdAt: formatTimestamp(d.createdAt),
      updatedAt: formatTimestamp(d.updatedAt),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function upsertUserProfile(payload: {
  displayName: string;
  phone: string;
}): Promise<UserProfile> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified || !user.email) {
    throw new Error('Conta verificada necessária para salvar o perfil.');
  }
  const path = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);
  try {
    const existing = await getDoc(ref);
    const displayName = payload.displayName.trim().slice(0, 120) || 'Cliente';
    const phone = payload.phone.trim().slice(0, 30);

    if (existing.exists()) {
      await setDoc(
        ref,
        {
          displayName,
          phone,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } else {
      await setDoc(ref, {
        displayName,
        email: user.email.slice(0, 160),
        phone,
        lgpdConsent: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    return {
      uid: user.uid,
      displayName,
      email: user.email,
      phone,
      lgpdConsent: true,
      createdAt: existing.exists()
        ? formatTimestamp(existing.data().createdAt)
        : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchInstagramPosts(): Promise<InstagramPost[]> {
  const path = 'instagram_posts';
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs
      .map((d) => ({
        id: d.id,
        title: String(d.data().title ?? ''),
        instagramUrl: String(d.data().instagramUrl ?? ''),
        viewsLabel: String(d.data().viewsLabel ?? ''),
        occasion: String(d.data().occasion ?? ''),
        order: Number(d.data().order ?? 0),
        updatedAt: formatTimestamp(d.data().updatedAt),
      }))
      .sort((a, b) => a.order - b.order);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function createInstagramPostApi(payload: {
  title: string;
  instagramUrl: string;
  viewsLabel: string;
  occasion: string;
  order: number;
}): Promise<InstagramPost> {
  const id = `ig-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const path = `instagram_posts/${id}`;
  try {
    const data = {
      title: payload.title.trim().slice(0, 140),
      instagramUrl: payload.instagramUrl.trim().slice(0, 300),
      viewsLabel: payload.viewsLabel.trim().slice(0, 60),
      occasion: payload.occasion.trim().slice(0, 60),
      order: Math.max(0, Math.min(1000, Number(payload.order) || 0)),
      updatedAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'instagram_posts', id), data);
    return {
      id,
      title: data.title,
      instagramUrl: data.instagramUrl,
      viewsLabel: data.viewsLabel,
      occasion: data.occasion,
      order: data.order,
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteInstagramPostApi(id: string): Promise<void> {
  const path = `instagram_posts/${id}`;
  try {
    await deleteDoc(doc(db, 'instagram_posts', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function fetchTemplates(): Promise<QuickTemplate[]> {
  const user = auth.currentUser;
  if (!user || !isAdminUser(user)) {
    return [];
  }

  const path = 'templates';
  try {
    const snap = await getDocs(collection(db, path));
    if (snap.empty) {
      const batch = writeBatch(db);
      for (const tpl of DEFAULT_TEMPLATES) {
        batch.set(doc(db, path, tpl.id), {
          title: tpl.title.slice(0, 140),
          category: tpl.category,
          content: tpl.content.slice(0, 3000),
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
      return DEFAULT_TEMPLATES.map((t) => ({
        ...t,
        updatedAt: new Date().toISOString(),
      }));
    }

    return snap.docs
      .map((d) => ({
        id: d.id,
        title: String(d.data().title ?? ''),
        category: d.data().category as TemplateCategory,
        content: String(d.data().content ?? ''),
        updatedAt: formatTimestamp(d.data().updatedAt),
      }))
      .sort((a, b) => a.title.localeCompare(b.title));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function createTemplateApi(payload: {
  title: string;
  category: TemplateCategory;
  content: string;
}): Promise<QuickTemplate> {
  const id = `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const path = `templates/${id}`;
  try {
    const data = {
      title: payload.title.trim().slice(0, 140),
      category: payload.category,
      content: payload.content.trim().slice(0, 3000),
      updatedAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'templates', id), data);
    return {
      id,
      title: data.title,
      category: data.category,
      content: data.content,
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateTemplateApi(
  id: string,
  patch: Partial<{ title: string; category: TemplateCategory; content: string }>
): Promise<QuickTemplate> {
  const path = `templates/${id}`;
  const ref = doc(db, 'templates', id);
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      throw new Error('Mensagem pronta não encontrada.');
    }
    const existing = snap.data();
    const nextData = {
      title: (patch.title ?? String(existing.title ?? '')).trim().slice(0, 140),
      category: (patch.category ?? existing.category) as TemplateCategory,
      content: (patch.content ?? String(existing.content ?? ''))
        .trim()
        .slice(0, 3000),
      updatedAt: serverTimestamp(),
    };
    await setDoc(ref, nextData, { merge: true });
    return {
      id,
      title: nextData.title,
      category: nextData.category,
      content: nextData.content,
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteTemplateApi(id: string): Promise<void> {
  const path = `templates/${id}`;
  try {
    await deleteDoc(doc(db, 'templates', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function generateAiMessageApi(payload: {
  occasion: string;
  honoreeName: string;
  honoreeAge?: string;
  senderName: string;
  songs: string[];
  tone?: string;
  extraDetails?: string;
}): Promise<{ script: string }> {
  const script = generateLocalTributeMessage(payload);
  return { script };
}
