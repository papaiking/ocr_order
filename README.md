# OCR Order Recognition

A Nuxt 3 web application for extracting structured order information from receipt/invoice images using OCR (Optical Character Recognition) with vision language models.

## Description

OCR Order Recognition is a web-based tool that allows users to upload images of receipts, invoices, or order documents and extract structured customer and product information. The application uses a vision language model (OLM OCR 2-7B) via LM Studio API to perform OCR and format the extracted data as JSON.

### Features

- **Image Upload**: Simple file selection interface for uploading receipt/invoice images
- **Image Preview**: Visual preview of the uploaded image
- **OCR Processing**: Automated text extraction and structure recognition using vision AI
- **Structured Output**: Extracts and formats data into JSON structure with:
  - Customer information (name, phone, address, payment method)
  - Product list (name, quantity, price)
- **Editable Results**: View and edit recognized content in a textarea
- **Responsive Design**: Works on desktop and mobile devices

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16 or higher recommended)
- **npm** or **yarn** package manager
- **LM Studio** (or compatible OpenAI-compatible API server) running with a vision model

### LM Studio Setup

1. Download and install [LM Studio](https://lmstudio.ai/)
2. Download a vision language model (e.g., `allenai/olmocr-2-7b-1025`)
3. Start the local server in LM Studio (usually runs on port 1234 by default)

## Installation

1. Clone or navigate to the project directory:
   ```bash
   cd btransformer/utils/ocr_order
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## Configuration

The application requires configuration of the LM Studio API endpoint. Currently, the configuration is hardcoded in the server API file. You may need to modify the following settings:

### LM Studio API Configuration

Edit `server/api/ocr.post.ts` and update these values if needed:

```typescript
const MODEL_ID = "allenai/olmocr-2-7b-1025";  // Change if using a different model
const LM_STUDIO_URL = "http://192.168.32.151:1234/v1";  // Update with your LM Studio server URL
```

**Note**: Update the `LM_STUDIO_URL` to match your LM Studio server address and port. If running LM Studio locally, it's typically:
- `http://localhost:1234/v1` (default)
- `http://127.0.0.1:1234/v1`

### Environment Variables (Optional)

For better configuration management, you could create a `.env` file in the project root:

```env
LM_STUDIO_URL=http://localhost:1234/v1
MODEL_ID=allenai/olmocr-2-7b-1025
```

Then modify `server/api/ocr.post.ts` to use environment variables:
```typescript
const MODEL_ID = process.env.MODEL_ID || "allenai/olmocr-2-7b-1025";
const LM_STUDIO_URL = process.env.LM_STUDIO_URL || "http://localhost:1234/v1";
```

## Running the Application

### Development Mode

To run the application in development mode with hot-reload:

```bash
npm run dev
```

The application will start and be available at `http://localhost:3000` (or another port if 3000 is occupied).

### Production Build

To build the application for production:

```bash
npm run build
```

To preview the production build:

```bash
npm run preview
```

### Generate Static Site

To generate a static site:

```bash
npm run generate
```

## Usage

1. **Start the Application**: Run `npm run dev` in the terminal
2. **Ensure LM Studio is Running**: Make sure your LM Studio server is running with the vision model loaded
3. **Open the Browser**: Navigate to `http://localhost:3000`
4. **Upload an Image**: Click "Select Image File" and choose a receipt/invoice image
5. **Recognize**: Click the "Recognize" button to process the image
6. **Review Results**: The extracted information will appear in the "Recognized Content" section as JSON
7. **Edit if Needed**: You can edit the JSON content directly in the textarea
8. **Import**: Use the "Import" button (currently a placeholder for future functionality)

## Project Structure

```
ocr_order/
├── app.vue                 # Main Vue component with UI and logic
├── server/
│   └── api/
│       └── ocr.post.ts     # Server API endpoint for OCR processing
├── dev/                    # Development files and sample images
├── nuxt.config.ts          # Nuxt configuration
├── package.json            # Project dependencies and scripts
└── README.md               # This file
```

## API Endpoint

The application provides a POST API endpoint:

- **URL**: `/api/ocr`
- **Method**: POST
- **Body**: 
  ```json
  {
    "base64Image": "base64-encoded-image-string"
  }
  ```
- **Response**: OpenAI-compatible chat completion response with structured JSON data

## Output Format

The OCR recognition extracts information in the following JSON structure:

```json
{
  "customer": {
    "name": "Customer Name",
    "phone": "Phone Number",
    "address": "Customer Address",
    "payment_method": "Payment Method"
  },
  "products": [
    {
      "name": "Product Name",
      "quantity": 1,
      "price": 10000
    }
  ]
}
```

## Troubleshooting

### LM Studio Connection Issues

- **Error**: Connection refused or timeout
  - **Solution**: Ensure LM Studio is running and the server is started
  - Verify the URL and port in `server/api/ocr.post.ts`
  - Check if your firewall is blocking the connection

### Model Not Found

- **Error**: Model not available
  - **Solution**: Ensure the model is downloaded and loaded in LM Studio
  - Verify the model ID matches the one you have installed

### CORS Issues

- The application uses Nuxt server API routes to avoid CORS issues when calling LM Studio
- If you encounter CORS errors, ensure you're using the server API route (`/api/ocr`) and not calling LM Studio directly from the client

### Image Upload Issues

- Supported formats: All standard image formats (JPEG, PNG, GIF, etc.)
- Large images may take longer to process
- Base64 encoding happens client-side to reduce server load

## Development

### Tech Stack

- **Framework**: Nuxt 3
- **Frontend**: Vue 3 (Composition API)
- **Backend**: Nuxt Server API
- **OCR Model**: OLM OCR 2-7B (via LM Studio)

### Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run generate` - Generate static site

## License

[Add your license information here]

## Contributing

[Add contribution guidelines if applicable]

