import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
// Eğer Google GenAI kütüphanesini kullanıyorsan importu dursun
import { GoogleGenAI } from '@google/genai'; 

// Vercel ortamındaki değişkenleri okuyabilmesi için dotenv'i kesinlikle başlatıyoruz
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// API Key kontrolünü hem process.env hem de Vercel ortamı için kesinleştiriyoruz
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("Kritik Hata: GEMINI_API_KEY tanımlı değil!");
}

// Sen buraya kendi /api/chat route (istek) kodlarını eklemiştin, oradaki anahtar kontrolünü de şu şekle getir:
app.post('/api/chat', async (req, res) => {
  try {
    if (!apiKey) {
      return res.status(500).json({ error: "Gemini API key sunucuda bulunamadı. Lütfen Vercel ayarlarını kontrol edin." });
    }
    
    // Kendi yapay zeka cevap üretme kodların buraya gelecek...
    // Örnek: const aiResponse = await ... (apiKey kullanarak istek at)
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Vercel Serverless mimaride app.listen() işlemine gerek duymaz ama localde test için kalabilir
const PORT = process.env.PORT || 8787;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Server ${PORT} üzerinde çalışıyor`));
}

export default app;
