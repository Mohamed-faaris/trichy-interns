import express from 'express';
import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4004;

const ownerNumbers = (process.env.OWNER_WHATSAPP_NUMBERS || '')
  .split(',')
  .map(num => num.trim().replace(/\D/g, ''))
  .filter(num => num.length > 0);

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// WhatsApp Client
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
  puppeteer: {
    headless: true,
    executablePath: '/usr/bin/google-chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  },
});

client.on('qr', (qr) => {
  console.log('\n📱 Scan QR code:\n');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('\n✅ WhatsApp ready!');
  console.log(`🚀 Server: http://localhost:${PORT}`);
});

client.initialize();

// POST endpoint
app.post('/send-message', async (req, res) => {
  try {
    const { name, number, message } = req.body;

    if (!name || !number || !message) {
      return res.status(400).json({ error: 'All fields required' });
    }

    // Send WhatsApp
    const formattedMessage = `*New Contact Form Submission*\n\n─────────────────\n*Name:* ${name}\n*Phone:* ${number}\n*Message:* ${message}\n─────────────────\nSubmitted via Web Form`;
    
    for (const phone of ownerNumbers) {
      try {
        await client.sendMessage(`${phone}@c.us`, formattedMessage);
        console.log(`✅ Sent to +${phone}`);
      } catch (err) {
        console.error(`❌ Failed to +${phone}:`, err);
      }
    }

    res.json({ success: true, message: 'Submitted!' });

  } catch (error: any) {
    console.error('Error:', error);
    res.status(500).json({ error: error?.message || 'Server error' });
  }
});

// Health endpoint (no mongo)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', whatsapp: client.info ? true : false });
});

app.listen(PORT, () => {
  console.log(`🟢 Server on port ${PORT}`);
});
