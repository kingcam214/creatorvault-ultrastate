from pathlib import Path

pipeline = Path("/opt/Wan-Animate-2/pipelines/wan_animate_2_pipeline.py")
source = pipeline.read_text()
old = "with torch.device('meta'):\n                model = build_object_from_dict(cfg.model.transformer)\n                torch.set_default_dtype(torch.bfloat16)"
new = "with torch.device('meta'):\n                torch.set_default_dtype(torch.bfloat16)\n                model = build_object_from_dict(cfg.model.transformer)"
if old not in source:
    raise SystemExit("Official Wan BF16 initialization sequence did not match the audited source.")
pipeline.write_text(source.replace(old, new, 1))
