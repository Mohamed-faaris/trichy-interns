import 'dotenv/config';
import express from 'express';
import { join } from 'path';
import { connectDB } from './config/db.js';
import formRoutes from './routes/form.js';
import adminRoutes from './routes/admin.js';
console.log('Admin routes imported');
import { initWhatsApp } from './services/whatsapp.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(join(__dirname, '../public')));

app.use('/api', formRoutes);
app.use('/api', adminRoutes);

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, '../public/index.html'));
});

async function start() {
  await connectDB();
  
  initWhatsApp().catch(err => {
    console.error('WhatsApp initialization failed:', err.message);
  });

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start();
