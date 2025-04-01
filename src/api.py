import os
from fastapi.responses import JSONResponse, HTMLResponse, StreamingResponse
import requests
import httpx

from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM

app = FastAPI()

# model_name = "deepseek-ai/deepseek-coder-6.7b-instruct"
model_name = "deepseek-ai/deepseek-coder-1.3b-instruct"
tokenizer = AutoTokenizer.from_pretrained(model_name, trust_remote_code=True)
model = AutoModelForCausalLM.from_pretrained(
    model_name, trust_remote_code=True, torch_dtype=torch.bfloat16
)


class PromptRequest(BaseModel):
    prompt: str


def convert_to_unicode(text: str) -> str:
    """
    Converts the special character '｜' to its Unicode representation.
    """
    return text.replace("｜", "\\u{:04x}".format(ord("｜")))


# @app.post("/api/generate")
# async def generate_endpoint(data: PromptRequest):
#     prompt = data.prompt

#     response = requests.post(
#         "http://localhost:11434/api/generate",
#         json={
#             "model": "deepseek-coder:1.3b-instruct",
#             "prompt": prompt,
#             "stream": False,
#             "options": {"temperature": 0, "num_predict": 128},
#         },
#     )
#     if response.status_code != 200:
#         raise Exception("Error: {response.status_code}")
#     resp = response.json()
#     return JSONResponse(
#         content=resp,
#         headers={"Content-Type": "application/json; charset=utf-8"},
#     )


@app.post("/api/generate")
async def generate_endpoint(data: PromptRequest):
    messages = [{"role": "user", "content": data.prompt}]
    inputs = tokenizer.apply_chat_template(
        messages, add_generation_prompt=True, return_tensors="pt"
    ).to(model.device)
    # sampling_params = {"temperature": 0.0}
    outputs = model.generate(
        inputs,
        max_new_tokens=256,
        do_sample=True,
        top_k=50,
        temperature=0.3,
        num_return_sequences=1,
        eos_token_id=tokenizer.eos_token_id,
        # use_cache=False,
        # sampling_params=sampling_params,
    )
    generated = tokenizer.decode(outputs[0][len(inputs[0]) :], skip_special_tokens=True)
    content = {"response": generated, "done": True, "done_reason": "stop"}
    return JSONResponse(
        content=content,
        headers={"Content-Type": "application/json; charset=utf-8"},
    )


@app.get("/")
def read_root():
    html_content = f"""
    <html>
        <head>
            <title>Welcome</title>
            <style>
                body {{
                    font-family: sans-serif;
                }}
            </style>
        </head>
        <body>
            <h1>Welcome to the API!</h1>
        </body>
    </html>
    """
    return HTMLResponse(content=html_content, status_code=200)


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
