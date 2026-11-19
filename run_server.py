"""Universal Production Server Launcher for NeuroBehavior-ASD.
Handles port binding across Railway, Render, Hugging Face Spaces, and local containers.
Safely expands unexpanded environment variable literals like '$PORT' or '${PORT}'.
"""
import os
import sys
import subprocess


def main():
    # 1. Read PORT from environment with fallback
    raw_port = os.environ.get("PORT", "5000").strip()
    try:
        port = int(raw_port)
    except ValueError:
        port = 5000

    # 2. Inspect command-line arguments (e.g. from Railway or Procfile)
    # Filter and fix any literal '$PORT' or '${PORT}'
    cleaned_args = []
    skip_next = False
    has_bind = False

    args_list = list(sys.argv[1:])
    for i, arg in enumerate(args_list):
        if skip_next:
            skip_next = False
            continue

        if arg == "--bind" or arg == "-b":
            if i + 1 < len(args_list):
                next_arg = args_list[i + 1]
                if "$PORT" in next_arg or "${PORT}" in next_arg:
                    cleaned_args.extend(["--bind", f"0.0.0.0:{port}"])
                else:
                    cleaned_args.extend(["--bind", next_arg])
                skip_next = True
                has_bind = True
                continue

        if arg.startswith("--bind=") or arg.startswith("-b="):
            val = arg.split("=", 1)[1]
            if "$PORT" in val or "${PORT}" in val:
                cleaned_args.append(f"--bind=0.0.0.0:{port}")
            else:
                cleaned_args.append(arg)
            has_bind = True
            continue

        cleaned_args.append(arg)

    if not has_bind:
        cleaned_args = ["--bind", f"0.0.0.0:{port}"] + cleaned_args

    # Default performance flags for low memory footprint (<220MB RAM)
    if not any("--workers" in a or a == "-w" for a in cleaned_args):
        cleaned_args.extend(["--workers", "1"])
    if not any("--threads" in a for a in cleaned_args):
        cleaned_args.extend(["--threads", "4"])
    if not any("--worker-class" in a or a == "-k" for a in cleaned_args):
        cleaned_args.extend(["--worker-class", "gthread"])
    if not any("--timeout" in a or a == "-t" for a in cleaned_args):
        cleaned_args.extend(["--timeout", "180"])

    # Ensure target app is specified
    if not any("wsgi:app" in a for a in cleaned_args):
        cleaned_args.append("wsgi:app")

    cmd = [sys.executable, "-m", "gunicorn"] + cleaned_args
    print(f"[*] Starting production server on port {port}: {' '.join(cmd)}")
    sys.stdout.flush()

    res = subprocess.run(cmd)
    sys.exit(res.returncode)


if __name__ == "__main__":
    main()
