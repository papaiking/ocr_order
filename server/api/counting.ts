export default defineEventHandler(async (event) => {
  console.log('Counting things API route called');
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
    // const MODEL_ID = "qwen/qwen3-vl-8b";
    // const LM_STUDIO_URL = "http://192.168.32.151:1234/v1";
    const MODEL_ID = "Qwen/Qwen3-VL-8B-Instruct-FP8";
    const LM_STUDIO_URL = "http://10.148.0.20:8000/v1";

    const fileTypeText = fileType === 'pdf' ? 'PDF document' : 'image';
    const prompt = `
Your are expert in store inventory, let help me analyse and couting things from the file image. 

CRITICAL INSTRUCTIONS:
1. Specyfy objects (Plastic kitchenware) in Vietnamese language with object name, color and size, the counting number of each object in image
2. Just counting for objects that are clear, visible and countantable
3. If same kind of objects but different size and color, they are considered different objects
4. Output: Return ONLY a valid JSON object as follow:
        {
            "products": [
                {
                    "name": "xxxxx",
                    "quantity": xxxxx, 
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

