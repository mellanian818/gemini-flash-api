const express = require("express")
const dotenv = require("dotenv")
const multer = require("multer")
const fs = require("fs")
const path = require("path")
const {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
} = require("@google/generative-ai")

// Muat variabel lingkungan dari file .env
dotenv.config()

const app = express()
app.use(express.json()) // Izinkan Express untuk mengurai body JSON

// Inisialisasi GoogleGenerativeAI dengan Kunci API Anda
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

// Pilih model Gemini yang akan digunakan
// Model 1.5 Flash direkomendasikan untuk kecepatan dan biaya efisien
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  // Anda bisa mengonfigurasi parameter di sini jika diperlukan, contoh:
  // generationConfig: {
  //   temperature: 0.7,
  //   topP: 0.95,
  //   topK: 40,
  // },
  // safetySettings: [
  //   {
  //     category: HarmCategory.HARM_CATEGORY_HARASSMENT,
  //     threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  //   },
  //   // Tambahkan pengaturan keamanan lainnya sesuai kebutuhan
  // ],
})

// Konfigurasi Multer untuk menangani unggahan file
const upload = multer({ dest: "uploads/" }) // File yang diunggah akan disimpan sementara di folder 'uploads/'

// Fungsi pembantu untuk mengonversi file gambar ke format yang dapat digunakan Gemini
function fileToGenerativePart(filePath, mimeType) {
  return {
    inlineData: {
      data: fs.readFileSync(filePath).toString("base64"),
      mimeType,
    },
  }
}

const PORT = 3000

// Mulai server Express
app.listen(PORT, () => {
  console.log(`Gemini API server is running at http://localhost:${PORT}`)
})

// --- Endpoint API ---

// Endpoint 1: Menghasilkan Teks dari Teks Biasa
app.post("/generate-text", async (req, res) => {
  const { prompt } = req.body

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required." })
  }

  try {
    const result = await model.generateContent(prompt)
    const response = await result.response
    res.json({ output: response.text() })
  } catch (error) {
    console.error("Error generating text:", error)
    res.status(500).json({ error: error.message || "Failed to generate text." })
  }
})

// Endpoint 2: Menghasilkan Teks dari Gambar
app.post("/generate-from-image", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Image file is required." })
  }

  const prompt = req.body.prompt || "Describe the image."
  const imagePart = fileToGenerativePart(req.file.path, req.file.mimetype)

  try {
    const result = await model.generateContent([prompt, imagePart])
    const response = await result.response
    res.json({ output: response.text() })
  } catch (error) {
    console.error("Error generating from image:", error)
    res
      .status(500)
      .json({ error: error.message || "Failed to generate from image." })
  } finally {
    // Hapus file yang diunggah sementara setelah pemrosesan
    fs.unlinkSync(req.file.path)
  }
})

// Endpoint 3: Menghasilkan Teks dari Dokumen
app.post(
  "/generate-from-document",
  upload.single("document"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "Document file is required." })
    }

    const prompt = req.body.prompt || "Analyze this document."
    const documentPart = fileToGenerativePart(req.file.path, req.file.mimetype)

    try {
      const result = await model.generateContent([prompt, documentPart])
      const response = await result.response
      res.json({ output: response.text() })
    } catch (error) {
      console.error("Error generating from document:", error)
      res
        .status(500)
        .json({ error: error.message || "Failed to generate from document." })
    } finally {
      fs.unlinkSync(req.file.path)
    }
  }
)

// Endpoint 4: Menghasilkan Teks dari Audio
app.post("/generate-from-audio", upload.single("audio"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Audio file is required." })
  }

  const prompt = req.body.prompt || "Transcribe or analyze the following audio."
  const audioPart = fileToGenerativePart(req.file.path, req.file.mimetype)

  try {
    const result = await model.generateContent([prompt, audioPart])
    const response = await result.response
    res.json({ output: response.text() })
  } catch (error) {
    console.error("Error generating from audio:", error)
    res
      .status(500)
      .json({ error: error.message || "Failed to generate from audio." })
  } finally {
    fs.unlinkSync(req.file.path)
  }
})
