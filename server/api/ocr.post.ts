export default defineEventHandler(async (event) => {
  console.log('OCR API route called');
  try {
    const body = await readBody(event);
    const { base64Image, fileType } = body;
    console.log('Received base64Image, length:', base64Image ? base64Image.length : 0);
    console.log('File type:', fileType);

    if (!base64Image) {
      throw createError({
        statusCode: 400,
        statusMessage: 'base64Image is required'
      });
    }

    // const MODEL_ID = "allenai/olmocr-2-7b-1025";
    const MODEL_ID = "qwen/qwen3-vl-8b";
    const LM_STUDIO_URL = "http://192.168.32.49:1234/v1";

    // const MODEL_ID = "Qwen/Qwen3-VL-8B-Instruct-FP8";
    // const LM_STUDIO_URL = "http://10.148.0.20:8000/v1";

    // const MODEL_ID = "deepseek-ocr";
    // const LM_STUDIO_URL = "http://192.168.32.49:1234/v1";

    const fileTypeText = fileType === 'pdf' ? 'PDF document' : 'image';
    const prompt = `
Perform OCR and extract product order information from the ${fileTypeText}. 

CRITICAL INSTRUCTIONS:
1. Clean the text and keep the original information 
2. Output: Return ONLY a valid JSON object as follow:
        {
            "title": "xxxx"   # Indicate this is document title, such as: Order, Quotation or other...
            "customer": {
                "name": "xxx",
                "phone": "xxxx",
                "addess": "xxxxx",
                "payment_method": "xxx"
            },
            "products": [
                {
                    "name": "xxxxx",
                    "quantity": xxxxx, 
                    "price": xxxxx
                }
            ]
        }
        `;

    const requestBody = {
      model: MODEL_ID,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:${fileType === 'pdf' ? 'image/png' : 'image/png'};base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      temperature: 0,
      max_tokens: 2048,
    };

    console.log('Calling LM Studio API:', `${LM_STUDIO_URL}/chat/completions`);
    console.log('Request body keys:', Object.keys(requestBody));
    console.log('Messages length:', requestBody.messages.length);

    const response = await fetch(`${LM_STUDIO_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('LM Studio response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LM Studio API error:', errorText);
      throw createError({
        statusCode: response.status,
        statusMessage: `LM Studio API error: ${errorText}`
      });
    }

    const data = await response.json();
    console.log('LM Studio response data keys:', Object.keys(data));
    console.log('Choices:', data.choices ? data.choices.length : 'none');
    
    return data;
  } catch (error: any) {
    console.error('Server API error:', error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || error.message || 'Internal server error'
    });
  }
});

