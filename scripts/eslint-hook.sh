#!/usr/bin/env bash
# هوکِ PostToolUse — بعد از هر ویرایشِ فایلِ JSX/JS داخل frontend/src، ESLint را
# روی همان فایل اجرا می‌کند و اگر خطا داشت با کد ۲ برمی‌گردد تا مدل ببیندش.
#
# چرا لازم است: در این پروژه چند بار `npm run build` سبز شد ولی ESLint خطا داشت
# (قواعدِ react-hooks نسخهٔ ۷ که سازگار با کامپایلرند: set-state-in-effect و refs).
# CLAUDE.md هشدارش را داده، ولی یادداشت اجبار نمی‌آورد.
#
# نکتهٔ محیطی: Claude Code روی ویندوز اجرا می‌شود و مسیرها به شکل UNC می‌آیند
# (//wsl.localhost/ubuntu/...)، ولی node و پروژه داخل WSL‌اند. پس مسیر تبدیل
# می‌شود و eslint داخل WSL صدا زده می‌شود.

payload=$(cat)

# jq در این محیط نیست؛ python هست
file=$(printf '%s' "$payload" | python -c "
import sys, json
try:
    d = json.load(sys.stdin)
except Exception:
    print(''); raise SystemExit
print(d.get('tool_input', {}).get('file_path')
      or d.get('tool_response', {}).get('filePath') or '')
" 2>/dev/null)

[ -n "$file" ] || exit 0

norm=$(printf '%s' "$file" | tr '\\' '/')

# فقط JSX/JS داخل frontend/src — بقیهٔ ویرایش‌ها بی‌درنگ رد می‌شوند
case "$norm" in
    */frontend/src/*.jsx|*/frontend/src/*.js) ;;
    *) exit 0 ;;
esac

# مسیر UNC ویندوز → مسیر داخل WSL
wslfile=$(printf '%s' "$norm" | sed -E 's#^/*wsl\.localhost/[^/]+##')
case "$wslfile" in
    /*) ;;
    *) exit 0 ;;   # مسیر ناشناخته — بی‌سروصدا رد کن، هوک نباید کار را متوقف کند
esac

project=${wslfile%%/frontend/src/*}
target="src/${wslfile#*/frontend/src/}"

out=$(MSYS_NO_PATHCONV=1 wsl -e env -i HOME=/home/farhad /bin/bash -lc \
      "cd '$project/frontend' && npx eslint '$target' 2>&1")
status=$?

if [ "$status" -ne 0 ]; then
    printf 'ESLint روی %s خطا داد:\n%s\n' "$target" "$out" >&2
    exit 2
fi

exit 0
