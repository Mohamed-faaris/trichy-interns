import { Router } from 'express';
import { Form } from '../models/Form.js';
import { sendWhatsAppMessage } from '../services/whatsapp.js';
import type { FormData } from '../types/index.js';

const router = Router();

function formatTimestamp(date: Date): string {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

router.post('/forms', async (req, res) => {
  try {
    const { name, number, email }: FormData = req.body;

    if (!name || !number || !email) {
      res.status(400).json({ success: false, message: 'All fields are required' });
      return;
    }

    const form = new Form({ name, number, email });
    await form.save();

    const ownerNumbers = (process.env.OWNER_WHATSAPP_NUMBERS || '').split(',').map(n => n.trim()).filter(Boolean);

    const ownerMessage = `New Form Submission

Name: ${name}
Email: ${email}
Phone: ${number}

Submitted at: ${formatTimestamp(new Date())}`;

    for (const ownerNumber of ownerNumbers) {
      try {
        await sendWhatsAppMessage(ownerNumber, ownerMessage);
      } catch (err) {
        console.error(`Failed to send to owner ${ownerNumber}:`, err);
      }
    }

    const fillerMessage = `Hi ${name}! Your form has been submitted successfully. We'll get back to you soon!`;
    try {
      await sendWhatsAppMessage(number, fillerMessage);
    } catch (err) {
      console.error(`Failed to send to filler ${number}:`, err);
    }

    res.status(201).json({ success: true, message: 'Form submitted successfully' });
  } catch (error) {
    console.error('Form submission error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
