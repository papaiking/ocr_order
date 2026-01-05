- Let make a new Nuxtjs project in foler: `utils/ocr_order` with one page to select image file, then this page will read image file, call API as in python. After getting result from API, display its content in the lower area of this page.
- This page has following layout: above is a form to select image file. Bowlow is two parts: the left is image file, the right is content recognized from the image.

Python script:
    # This is the script in Python to read local image file, and submit data to API to regconize order information in the image.

    import base64
    # import requests
    from openai import OpenAI

    # 1. Configuration
    IMAGE_PATH = "/Users/papaiking/Downloads/order2.png" # Change this to your image file
    MODEL_ID = "allenai/olmocr-2-7b-1025" # Ensure this matches your loaded model name
    LM_STUDIO_URL = "http://localhost:1234/v1"

    client = OpenAI(base_url=LM_STUDIO_URL, api_key="lm-studio")

    def encode_image(image_path):
        """Encodes a local image to a base64 string."""
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode('utf-8')

    def perform_ocr(image_path):
        base64_image = encode_image(image_path)
        
        # olmOCR works best with a specific system-like prompt
        prompt = (
            """
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
                        "quantity": "xxxxx",
                        "price": "xxxx"
                    }
                ]
            }
            """
        )

        try:
            response = client.chat.completions.create(
                model=MODEL_ID,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/png;base64,{base64_image}"
                                }
                            },
                        ],
                    }
                ],
                temperature=0,  # Low temperature for accuracy
                max_tokens=2048   # Enough room for full page extraction
            )
            return response.choices[0].message.content
        except Exception as e:
            return f"Error: {e}"