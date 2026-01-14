<template>
  <div class="container">
    <h1>OCR Order Recognition</h1>
    
    <!-- Upload Form Section (Above) -->
    <div class="upload-section">
      <form @submit.prevent>
        <div class="upload-controls">
          <label for="image-file" class="file-label">
            <span class="file-label-text">Select Image or PDF File</span>
            <input
              id="image-file"
              type="file"
              @change="handleFileSelect"
              accept="image/*,.pdf"
              class="file-input"
            />
          </label>
          <button 
            type="button" 
            @click="handleRecognize" 
            :disabled="!selectedFile || loading"
            class="recognize-button"
          >
            Recognize
          </button>
          <button 
            type="button" 
            @click="handleCounting" 
            :disabled="!selectedFile || loading"
            class="counting-button"
          >
            Counting
          </button>
        </div>
        <div v-if="selectedFileName" class="file-name">
          Selected: {{ selectedFileName }}
        </div>
      </form>
    </div>

    <!-- Content Section (Below) - Image Left, Result Right -->
    <div class="content-section">
      <!-- Left: Image/PDF Preview -->
      <div class="image-preview">
        <h2>{{ isPdf ? 'PDF Preview' : 'Image Preview' }}</h2>
        <div class="image-container">
          <img v-if="imageUrl && !isPdf" :src="imageUrl" alt="Selected Image" />
          <div v-else-if="pdfPreviewUrl && isPdf" class="pdf-preview-container">
            <img :src="pdfPreviewUrl" alt="PDF Preview" class="pdf-preview-image" />
            <div v-if="pdfPageCount > 1" class="pdf-pagination">
              <button 
                @click="changePdfPage(-1)" 
                :disabled="currentPdfPage <= 1"
                class="pdf-nav-button"
              >
                Previous
              </button>
              <span class="pdf-page-info">Page {{ currentPdfPage }} of {{ pdfPageCount }}</span>
              <button 
                @click="changePdfPage(1)" 
                :disabled="currentPdfPage >= pdfPageCount"
                class="pdf-nav-button"
              >
                Next
              </button>
            </div>
          </div>
          <div v-else class="placeholder">No file selected</div>
        </div>
      </div>

      <!-- Right: OCR Result -->
      <div class="ocr-result">
        <h2>Recognized Content</h2>
        <div v-if="loading" class="loading">
          Recognizing...
        </div>
        <div v-else-if="ocrResult" class="result-content">
          <textarea 
            v-model="ocrResult" 
            class="editable-content"
            placeholder="Recognized content will appear here..."
          ></textarea>
          <button class="import-button" @click="handleImport">
            Import
          </button>
        </div>
        <div v-else class="placeholder">
          No result yet. Please select an image or PDF file and click "Recognize".
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

let pdfjsLib = null;

// Lazy load PDF.js only on client side
if (process.client) {
  import('pdfjs-dist').then((module) => {
    pdfjsLib = module;
    // Configure PDF.js worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
  });
}

const imageUrl = ref(null);
const ocrResult = ref('');
const loading = ref(false);
const selectedFileName = ref('');
const selectedFile = ref(null);
const base64Image = ref(null);
const isPdf = ref(false);
const fileType = ref(null);
const pdfPreviewUrl = ref(null);
const pdfDocument = ref(null);
const currentPdfPage = ref(1);
const pdfPageCount = ref(0);

const encodeFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

const loadPdfJs = async () => {
  if (!process.client) return;
  
  if (!pdfjsLib) {
    const module = await import('pdfjs-dist');
    pdfjsLib = module;
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
    }
  }
  return pdfjsLib;
};

const renderPdfPage = async (pdf, pageNumber, scale = 2.0) => {
  if (!process.client) return null;
  
  await loadPdfJs();
  
  try {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    
    // Create canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    // Render PDF page to canvas
    await page.render({
      canvasContext: context,
      viewport: viewport
    }).promise;
    
    // Convert canvas to data URL
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Error rendering PDF page:', error);
    throw error;
  }
};

const convertPdfToImage = async (file) => {
  await loadPdfJs();
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    // Render first page and convert to base64 (without data URL prefix)
    const dataUrl = await renderPdfPage(pdf, 1, 2.0);
    return dataUrl.split(',')[1];
  } catch (error) {
    console.error('Error converting PDF to image:', error);
    throw error;
  }
};

const loadPdfForPreview = async (file) => {
  await loadPdfJs();
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    pdfDocument.value = pdf;
    pdfPageCount.value = pdf.numPages;
    currentPdfPage.value = 1;
    
    // Render first page for preview
    const previewUrl = await renderPdfPage(pdf, 1, 1.5);
    pdfPreviewUrl.value = previewUrl;
  } catch (error) {
    console.error('Error loading PDF for preview:', error);
    throw error;
  }
};

const changePdfPage = async (direction) => {
  if (!pdfDocument.value) return;
  
  const newPage = currentPdfPage.value + direction;
  if (newPage < 1 || newPage > pdfPageCount.value) return;
  
  currentPdfPage.value = newPage;
  const previewUrl = await renderPdfPage(pdfDocument.value, newPage, 1.5);
  pdfPreviewUrl.value = previewUrl;
};

const performCounting = async (fileBase64, fileType) => {
  loading.value = true;
  ocrResult.value = '';

  try {
    // Call our Nuxt server API route for counting
    const response = await $fetch('/api/counting', {
      method: 'POST',
      body: {
        base64Image: fileBase64,
        fileType: fileType
      }
    });

    console.log('API Response:', response);

    if (response && response.choices && response.choices.length > 0) {
      const content = response.choices[0].message.content;
      try {
        const jsonMatch = content.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
        const jsonString = jsonMatch ? jsonMatch[1] : content;
        const parsed = JSON.parse(jsonString);
        ocrResult.value = JSON.stringify(parsed, null, 2);
      } catch (parseError) {
        ocrResult.value = content;
      }
    } else {
      console.warn('Unexpected response structure:', response);
      ocrResult.value = `No content received from API. Response: ${JSON.stringify(response)}`;
    }
  } catch (error) {
    console.error('Error performing counting:', error);
    ocrResult.value = `Error: ${error.data?.message || error.message || 'Unknown error'}`;
  } finally {
    loading.value = false;
  }
};

const performOcr = async (fileBase64, fileType) => {
  loading.value = true;
  ocrResult.value = '';

  try {
    // Call our Nuxt server API route instead of LM Studio directly (avoids CORS)
    const response = await $fetch('/api/ocr', {
      method: 'POST',
      body: {
        base64Image: fileBase64,
        fileType: fileType
      }
    });

    console.log('API Response:', response);
    console.log('Has choices?', response.choices);
    console.log('Choices length:', response.choices?.length);

    if (response && response.choices && response.choices.length > 0) {
      const content = response.choices[0].message.content;
      // Try to extract JSON from code blocks or parse directly
      try {
        // Try to find JSON in code blocks
        const jsonMatch = content.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
        const jsonString = jsonMatch ? jsonMatch[1] : content;
        
        // Try to parse as JSON to format it nicely
        const parsed = JSON.parse(jsonString);
        ocrResult.value = JSON.stringify(parsed, null, 2);
      } catch (parseError) {
        // If parsing fails, display raw content
        ocrResult.value = content;
      }
    } else {
      console.warn('Unexpected response structure:', response);
      ocrResult.value = `No content received from API. Response: ${JSON.stringify(response)}`;
    }
  } catch (error) {
    console.error('Error performing OCR:', error);
    ocrResult.value = `Error: ${error.data?.message || error.message || 'Unknown error'}`;
  } finally {
    loading.value = false;
  }
};

const handleRecognize = async () => {
  if (!base64Image.value) {
    return;
  }
  await performOcr(base64Image.value, fileType.value);
};

const handleCounting = async () => {
  if (!base64Image.value) {
    return;
  }
  await performCounting(base64Image.value, fileType.value);
};

const handleImport = async () => {
  if (!ocrResult.value) {
    alert('No content to import.');
    return;
  }

  let jsonData;
  try {
    jsonData = JSON.parse(ocrResult.value);
  } catch (error) {
    alert('The recognized content is not valid JSON.');
    console.error('Error parsing JSON:', error);
    return;
  }

  const url = 'https://wf.gnixy.com/webhook/3d4ac05a-05b7-44c7-9253-14301f1956f7';
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IlRodWMgVnUiLCJhZG1pbiI6dHJ1ZSwiaWF0IjoxNTE2MjM5MDIyfQ.CoUOrOtmunXGMG8u59CK6pIN1UurOrVsapGhaPaJrJ4';

  try {
    // loading.value = true;
    await $fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: jsonData
    });
    alert('Import successful!');
  } catch (error) {
    console.error('Error importing data:', error);
    alert(`Error importing data: ${error.data?.message || error.message || 'Unknown error'}`);
  } finally {
    loading.value = false;
  }
};

const handleFileSelect = async (event) => {
  const file = event.target.files[0];
  if (!file) {
    return;
  }

  selectedFile.value = file;
  selectedFileName.value = file.name;
  
  // Determine file type
  isPdf.value = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  fileType.value = isPdf.value ? 'pdf' : file.type.split('/')[0]; // 'pdf' or 'image'
  
  // Clean up previous previews
  if (imageUrl.value) {
    URL.revokeObjectURL(imageUrl.value);
    imageUrl.value = null;
  }
  pdfPreviewUrl.value = null;
  pdfDocument.value = null;
  
  // Reset OCR result when new file is selected
  ocrResult.value = '';

  try {
    if (isPdf.value) {
      // Load PDF for preview and convert first page to image for OCR
      await Promise.all([
        loadPdfForPreview(file),
        convertPdfToImage(file).then(base64 => {
          base64Image.value = base64;
        })
      ]);
    } else {
      // For images, create object URL for img tag and encode to base64
      imageUrl.value = URL.createObjectURL(file);
      base64Image.value = await encodeFile(file);
    }
  } catch (error) {
    console.error('Error processing file:', error);
    ocrResult.value = `Error: ${error.message}`;
  }
};
</script>

<style scoped>
.container {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

h1 {
  margin-bottom: 30px;
  color: #333;
  font-size: 2rem;
}

/* Upload Section */
.upload-section {
  margin-bottom: 30px;
  padding: 20px;
  background-color: #f5f5f5;
  border-radius: 8px;
  border: 2px dashed #ccc;
}

.file-label {
  display: inline-block;
  cursor: pointer;
  padding: 12px 24px;
  background-color: #007bff;
  color: white;
  border-radius: 6px;
  font-weight: 500;
  transition: background-color 0.2s;
}

.file-label:hover {
  background-color: #0056b3;
}

.file-input {
  display: none;
}

.file-name {
  margin-top: 12px;
  color: #555;
  font-size: 0.9rem;
}

.upload-controls {
  display: flex;
  gap: 12px;
  align-items: center;
}

.recognize-button {
  padding: 12px 24px;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.recognize-button:hover:not(:disabled) {
  background-color: #218838;
}

.recognize-button:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
  opacity: 0.6;
}

.counting-button {
  padding: 12px 24px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.counting-button:hover:not(:disabled) {
  background-color: #0056b3;
}

.counting-button:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
  opacity: 0.6;
}

/* Content Section */
.content-section {
  display: flex;
  gap: 20px;
  min-height: 500px;
}

.image-preview,
.ocr-result {
  flex: 1;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  background-color: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.image-preview h2,
.ocr-result h2 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #333;
  font-size: 1.5rem;
  border-bottom: 2px solid #eee;
  padding-bottom: 10px;
}

.image-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  background-color: #fafafa;
  border-radius: 4px;
  overflow: hidden;
}

.image-container img {
  max-width: 100%;
  max-height: 600px;
  object-fit: contain;
  display: block;
}

.pdf-preview-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.pdf-preview-image {
  max-width: 100%;
  max-height: 550px;
  object-fit: contain;
  display: block;
  background-color: #fafafa;
  border-radius: 4px;
}

.pdf-pagination {
  margin-top: 15px;
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 10px;
}

.pdf-page-info {
  color: #555;
  font-size: 0.9rem;
  min-width: 120px;
  text-align: center;
}

.pdf-nav-button {
  padding: 8px 16px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.pdf-nav-button:hover:not(:disabled) {
  background-color: #0056b3;
}

.pdf-nav-button:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
  opacity: 0.6;
}

.placeholder {
  color: #999;
  text-align: center;
  padding: 40px;
  font-style: italic;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #007bff;
  font-weight: 500;
}

.result-content {
  min-height: 400px;
  position: relative;
  display: flex;
  flex-direction: column;
}

.editable-content {
  flex: 1;
  margin: 0;
  margin-bottom: 50px;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 4px;
  border: 1px solid #e9ecef;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', 'source-code-pro', monospace;
  font-size: 0.9rem;
  line-height: 1.5;
  color: #333;
  resize: vertical;
  min-height: 400px;
  max-height: 600px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.import-button {
  position: absolute;
  bottom: 10px;
  right: 10px;
  padding: 8px 16px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.import-button:hover {
  background-color: #0056b3;
}

/* Responsive design */
@media (max-width: 768px) {
  .content-section {
    flex-direction: column;
  }
  
  .container {
    padding: 10px;
  }
}
</style>