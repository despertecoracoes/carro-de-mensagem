import { initializeApp } from 'firebase/app';
import {
  applyActionCode,
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  User,
} from 'firebase/auth';
import {
  doc,
  getDocFromServer,
  getFirestore,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
auth.languageCode = 'pt-BR';

const ADMIN_EMAIL = 'taviinhobr777@gmail.com';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      console.error('Verifique sua configuração do Firebase.');
    }
  }
}
testConnection();

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export function translateAuthError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  if (raw.includes('auth/invalid-credential') || raw.includes('auth/wrong-password') || raw.includes('auth/user-not-found')) {
    return 'E-mail ou senha incorretos. Confira os dados e tente novamente.';
  }
  if (raw.includes('auth/email-already-in-use')) {
    return 'Este e-mail já possui cadastro. Clique em "Entrar" ou recupere sua senha.';
  }
  if (raw.includes('auth/weak-password')) {
    return 'A senha precisa ter pelo menos 6 caracteres.';
  }
  if (raw.includes('auth/invalid-email')) {
    return 'Digite um endereço de e-mail válido.';
  }
  if (raw.includes('auth/too-many-requests')) {
    return 'Muitas tentativas seguidas. Aguarde alguns instantes antes de tentar novamente.';
  }
  if (raw.includes('auth/operation-not-allowed')) {
    return 'O cadastro por e-mail/senha precisa estar ativado no console do Firebase Authentication.';
  }
  if (raw.includes('auth/popup-closed-by-user')) {
    return 'A janela de login do Google foi fechada antes da conclusão.';
  }
  if (raw.includes('auth/invalid-action-code') || raw.includes('auth/expired-action-code')) {
    return 'Código ou link de verificação inválido ou expirado. Solicite um novo e-mail.';
  }
  return 'Não foi possível concluir a autenticação. Tente novamente.';
}

export async function signInWithGoogle(): Promise<User> {
  const credential = await signInWithPopup(auth, googleProvider);
  return credential.user;
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<User> {
  const credential = await signInWithEmailAndPassword(
    auth,
    email.trim(),
    password
  );
  return credential.user;
}

export async function registerWithEmail(
  name: string,
  email: string,
  password: string
): Promise<User> {
  const credential = await createUserWithEmailAndPassword(
    auth,
    email.trim(),
    password
  );
  if (name.trim()) {
    await updateProfile(credential.user, {
      displayName: name.trim().slice(0, 120),
    });
  }
  await sendEmailVerification(credential.user);
  return credential.user;
}

export async function resendVerificationEmail(): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Nenhuma conta conectada.');
  }
  await sendEmailVerification(user);
}

export async function refreshVerifiedUser(): Promise<User | null> {
  const user = auth.currentUser;
  if (!user) return null;
  await reload(user);
  await user.getIdToken(true);
  return auth.currentUser;
}

export async function applyEmailVerificationCode(
  inputCodeOrUrl: string
): Promise<User | null> {
  const raw = inputCodeOrUrl.trim();
  let code = raw;
  try {
    if (raw.startsWith('http')) {
      const parsed = new URL(raw);
      code = parsed.searchParams.get('oobCode') || raw;
    }
  } catch {
    // Use raw code if not a URL
  }
  if (!code) {
    throw new Error('Informe o código de verificação recebido no e-mail.');
  }
  await applyActionCode(auth, code);
  if (auth.currentUser) {
    await reload(auth.currentUser);
    await auth.currentUser.getIdToken(true);
  }
  return auth.currentUser;
}

export async function sendResetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export function isAdminUser(user: User | null): boolean {
  return Boolean(user && user.emailVerified && user.email === ADMIN_EMAIL);
}
