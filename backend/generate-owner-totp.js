import { generateSecret, generateURI } from 'otplib';
import qrcode from 'qrcode-terminal';

const secret = generateSecret(32);
const user = 'Smart Agriculture Owner';
const service = 'Smart Agriculture Assistant';

const otpauth = generateURI({ issuer: service, label: user, secret });

console.log('\n======================================================');
console.log('✅ Google Authenticator Setup for Owner');
console.log('======================================================\n');
console.log('1. Scan this QR code with Google Authenticator or Authy:\n');

qrcode.generate(otpauth, { small: true });

console.log('\n2. Or enter this secret manually:');
console.log(`\n    ${secret}\n`);
console.log('======================================================');
console.log('⚠️  IMPORTANT: Add the following line to your backend/.env');
console.log('    and your Vercel Environment Variables:');
console.log(`\n    OWNER_TOTP_SECRET=${secret}\n`);
console.log('======================================================\n');
