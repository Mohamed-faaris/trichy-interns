import express from 'express';
import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

// MongoDB Schema
const FormSubmissionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phoneNumber: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const FormSubmission = mongoose.model('FormSubmission', FormSubmissionSchema);

const app = express();
const PORT = process.env.PORT || 4004;

const ownerNumbers = (process.env.OWNER_WHATSAPP_NUMBERS || '')
  .split(',')
  .map(num => num.trim().replace(/\D/g, ''))
  .filter(num => num.length > 0);

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || '')
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => {
    console.error('❌ MongoDB error:', err);
    process.exit(1);
  });

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

    // Save to MongoDB
    const submission = await FormSubmission.create({ name, phoneNumber: number, message });
    console.log('📝 Saved to DB:', submission._id);

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

    res.json({ success: true, message: 'Submitted!', id: submission._id });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/submissions', async (_req, res) => {
  const subs = await FormSubmission.find().sort({ createdAt: -1 }).limit(50);
  res.json({ count: subs.length, data: subs });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', whatsapp: client.info ? true : false, mongo: mongoose.connection.readyState === 1 });
});

app.listen(PORT, () => {
  console.log(`🟢 Server on port ${PORT}`);
});
