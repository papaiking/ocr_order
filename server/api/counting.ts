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
Role: You are a Professional Inventory Audit Specialist expert in retail warehouse management. Your task is to perform a visual stock-take of plastic household products from the provided image.

Task Objectives:
1. Identify: Detect every distinct plastic household product visible in the image.
2. Classify: Describe each item in Vietnamese. You must distinguish items by Product Name, Color, and Size (if size is visually estimable or labeled).
3. Count: Provide an accurate tally for each unique variation.

Strict Counting Rules:
1. Unique SKU Logic: If two items are the same type but differ in color or size, they must be listed as separate entries.
2. Visibility Filter: Only count objects that are clearly visible and can be identified with high confidence. Do not guess for blurred or heavily obscured items.
3. Vietnamese Naming: Use standard commercial Vietnamese terms (e.g., "Rổ nhựa", "Chậu thau", "Hộp thực phẩm").
4. If there is a red boundary in the image, locate the red boundary within the image and you must ONLY count and analyze objects located entirely or mostly inside this red boundary. If there is not any boundary, counting in entire image.

Output Format: Return ONLY a valid JSON object. Do not include any conversational text, markdown headers, or explanations. Use the following structure:
JSON
{
  "products": [
    {
      "name": "[Name] - [Color] - [Size/Description]",
      "quantity": 0
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

