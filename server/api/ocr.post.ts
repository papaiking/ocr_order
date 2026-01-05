export default defineEventHandler(async (event) => {
  console.log('OCR API route called');
  try {
    const body = await readBody(event);
    const { base64Image } = body;
    console.log('Received base64Image, length:', base64Image ? base64Image.length : 0);

    if (!base64Image) {
      throw createError({
        statusCode: 400,
        statusMessage: 'base64Image is required'
      });
    }

    const MODEL_ID = "allenai/olmocr-2-7b-1025";
    const LM_STUDIO_URL = "http://192.168.32.151:1234/v1";

    const prompt = `
Perform OCR and extract product order information from the image. 

CRITICAL INSTRUCTIONS:
1. Clean the text and keep the original information 
2. Output: Return ONLY a valid JSON object as follow:
        {
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
                url: `data:image/png;base64,${base64Image}`,
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

