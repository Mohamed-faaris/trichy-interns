import { Client, LocalAuth } from 'whatsapp-web.js';
import { existsSync } from 'fs';

let client: Client | null = null;
let isReady = false;

export async function initWhatsApp(): Promise<Client> {
  if (client && isReady) {
    return client;
  }

  const sessionPath = '.wwebjs-auth';
  const hasExistingSession = existsSync(sessionPath) && existsSync(`${sessionPath}/session`);

  client = new Client({
    authStrategy: new LocalAuth({
      dataPath: sessionPath,
    }),
    puppeteer: {
      headless: true,
      executablePath: '/usr/bin/google-chrome',
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox', 
        '--disable-dev-shm-usage',
      ],
    },
  });

  client.on('authenticated', () => {
    console.log('WhatsApp authenticated');
  });

  client.on('auth_failure', (msg) => {
    console.error('WhatsApp auth failure:', msg);
  });

  client.on('disconnected', () => {
    console.log('WhatsApp disconnected');
    isReady = false;
  });

  client.on('ready', () => {
    console.log('WhatsApp client is ready');
    isReady = true;
  });

  try {
    await client.initialize();
  } catch (err: any) {
    if (err.message?.includes('browser is already running')) {
      console.log('Using existing Chrome session');
      isReady = true;
    } else {
      throw err;
    }
  }
  
  if (hasExistingSession && !isReady) {
    console.log('Session exists, waiting for ready...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    isReady = true;
  }
  
  return client;
}

export async function sendWhatsAppMessage(to: string, message: string): Promise<void> {
  if (!client || !isReady) {
    await initWhatsApp();
  }
  
  const chatId = `${to}@c.us`;
  await client?.sendMessage(chatId, message);
}

export function getClient(): Client | null {
  return client;
}
