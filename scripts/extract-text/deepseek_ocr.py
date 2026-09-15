"""
Runs DeepSeek-OCR over one or more page images and writes one .mmd (markdown)
file per image into the given output directory, named after the input file's
own basename.

Why this shape: loading the model takes ~10-15s, so a single process handles
every page of one issue rather than being re-invoked per page.

Config is fixed, not exposed as flags: base_size=1024, image_size=640,
crop_mode=True ("Gundam" mode) is the only combination that ran cleanly on
this GPU (RTX 4070) during evaluation -- image_size=768 and base_size=1024,
image_size=1024 both crashed with a CUBLAS error specific to this attention
backend. flash-attn would not build on Windows (multiple unresolved upstream
issues), so this loads with eager attention -- slower (~10-55s/page depending
on page density) but the only attention implementation this architecture
accepts without it.

Usage: python deepseek_ocr.py <output_dir> <image1> [image2 ...]
"""

import os
import sys
import time
import traceback

from transformers import AutoModel, AutoTokenizer
import torch

MODEL_NAME = "deepseek-ai/DeepSeek-OCR"
PROMPT = "<image>\n<|grounding|>Convert the document to markdown."

# One retry per page, not zero, not more. MEASURED: a 20-issue run silently
# lost pages to occasional CUDA errors (unclear cause -- possibly a transient
# fault from the long-running eager-attention process, never reproduced in
# isolation). A single retry costs one page's worth of time on the rare page
# that hits it; more than one just delays reporting a page as genuinely dead.
MAX_ATTEMPTS = 2


def main() -> int:
    if len(sys.argv) < 3:
        print("usage: deepseek_ocr.py <output_dir> <image1> [image2 ...]", file=sys.stderr)
        return 2

    out_dir = sys.argv[1]
    images = sys.argv[2:]
    os.makedirs(out_dir, exist_ok=True)

    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, trust_remote_code=True)
    model = AutoModel.from_pretrained(
        MODEL_NAME,
        _attn_implementation="eager",
        trust_remote_code=True,
        use_safetensors=True,
        torch_dtype=torch.bfloat16,
    )
    model = model.eval().cuda().to(torch.bfloat16)

    for image_path in images:
        name = os.path.splitext(os.path.basename(image_path))[0]
        page_out_dir = os.path.join(out_dir, name)
        os.makedirs(page_out_dir, exist_ok=True)
        t0 = time.time()
        for attempt in range(1, MAX_ATTEMPTS + 1):
            try:
                model.infer(
                    tokenizer,
                    prompt=PROMPT,
                    image_file=image_path,
                    output_path=page_out_dir,
                    base_size=1024,
                    image_size=640,
                    crop_mode=True,
                    save_results=True,
                    test_compress=False,
                )
                print(f"OK {name}: {time.time() - t0:.1f}s (attempt {attempt})", file=sys.stderr, flush=True)
                break
            except Exception:  # noqa: BLE001 -- one bad page must not kill the batch
                print(f"FAIL {name} (attempt {attempt}/{MAX_ATTEMPTS}):", file=sys.stderr, flush=True)
                traceback.print_exc(file=sys.stderr)
                sys.stderr.flush()
                if torch.cuda.is_available():
                    torch.cuda.synchronize()
                    torch.cuda.empty_cache()

    return 0


if __name__ == "__main__":
    sys.exit(main())
