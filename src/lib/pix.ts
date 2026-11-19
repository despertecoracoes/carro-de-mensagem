import QRCode from 'qrcode';

function normalizeAscii(value: string, maxLen: number): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 .\-]/g, '')
    .trim()
    .toUpperCase()
    .slice(0, maxLen);
}

function tlv(id: string, value: string): string {
  const len = String(value.length).padStart(2, '0');
  return `${id}${len}${value}`;
}

function crc16Ccitt(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i += 1) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j += 1) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export function buildPixPayload(params: {
  pixKey: string;
  merchantName: string;
  merchantCity: string;
  amount: number;
  txid?: string;
}): string {
  const cleanKey = params.pixKey.trim();
  const cleanName = normalizeAscii(params.merchantName || 'DESPERTE CORACOES', 25) || 'DESPERTE CORACOES';
  const cleanCity = normalizeAscii(params.merchantCity || 'RECIFE', 15) || 'RECIFE';
  const cleanTxid =
    (params.txid || 'DESPERTE50')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .slice(0, 25) || '***';

  const merchantAccount = tlv('00', 'BR.GOV.BCB.PIX') + tlv('01', cleanKey);
  const additionalData = tlv('05', cleanTxid);
  const amountStr = Number(Math.max(0, params.amount)).toFixed(2);

  const withoutCrc =
    tlv('00', '01') +
    tlv('26', merchantAccount) +
    tlv('52', '0000') +
    tlv('53', '986') +
    (params.amount > 0 ? tlv('54', amountStr) : '') +
    tlv('58', 'BR') +
    tlv('59', cleanName) +
    tlv('60', cleanCity) +
    tlv('62', additionalData) +
    '6304';

  return `${withoutCrc}${crc16Ccitt(withoutCrc)}`;
}

export async function generatePixQrDataUrl(pixPayload: string): Promise<string> {
  return QRCode.toDataURL(pixPayload, {
    width: 240,
    margin: 1,
    color: {
      dark: '#171412',
      light: '#FFFFFF',
    },
  });
}
