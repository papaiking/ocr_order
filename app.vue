<template>
  <div class="container">
    <h1>OCR Order Recognition</h1>
    
    <!-- Upload Form Section (Above) -->
    <div class="upload-section">
      <form @submit.prevent>
        <div class="upload-controls">
          <label for="image-file" class="file-label">
            <span class="file-label-text">Select Image File</span>
            <input
              id="image-file"
              type="file"
              @change="handleFileSelect"
              accept="image/*"
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
        </div>
        <div v-if="selectedFileName" class="file-name">
          Selected: {{ selectedFileName }}
        </div>
      </form>
    </div>

    <!-- Content Section (Below) - Image Left, Result Right -->
    <div class="content-section">
      <!-- Left: Image Preview -->
      <div class="image-preview">
        <h2>Image Preview</h2>
        <div class="image-container">
          <img v-if="imageUrl" :src="imageUrl" alt="Selected Image" />
          <div v-else class="placeholder">No image selected</div>
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
          No result yet. Please select an image file and click "Recognize".
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const imageUrl = ref(null);
const ocrResult = ref('');
const loading = ref(false);
const selectedFileName = ref('');
const selectedFile = ref(null);
const base64Image = ref(null);

const encodeImage = (file) => {
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

const performOcr = async (imageBase64) => {
  loading.value = true;
  ocrResult.value = '';

  try {
    // Call our Nuxt server API route instead of LM Studio directly (avoids CORS)
    const response = await $fetch('/api/ocr', {
      method: 'POST',
      body: {
        base64Image: imageBase64
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
  await performOcr(base64Image.value);
};

const handleImport = () => {
  // Do nothing for now
  console.log('Import button clicked');
};

const handleFileSelect = async (event) => {
  const file = event.target.files[0];
  if (!file) {
    return;
  }

  selectedFile.value = file;
  selectedFileName.value = file.name;
  
  // Create object URL for preview
  if (imageUrl.value) {
    URL.revokeObjectURL(imageUrl.value);
  }
  imageUrl.value = URL.createObjectURL(file);

  // Reset OCR result when new file is selected
  ocrResult.value = '';

  try {
    // Encode image to base64 but don't perform OCR yet
    base64Image.value = await encodeImage(file);
  } catch (error) {
    console.error('Error encoding image:', error);
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