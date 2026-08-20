#!/bin/bash
# نقشهٔ کد را از روی خودِ سورس تولید می‌کند تا هرگز کهنه نشود.
# اجرا:  bash scripts/gen_code_map.sh   →  .claude/code-map.md
set -e
cd "$(dirname "$0")/.."
OUT=".claude/code-map.md"

# node_modules هم کنار گذاشته می‌شود؛ بعضی پکیج‌های npm فایل .py دارند
# (مثلاً flatted) و بدون این فیلتر در آمار و فهرست ماژول‌ها ظاهر می‌شوند
py()  { find . -name "*.py" -not -path "./venv/*" -not -path "./.venv/*" -not -path "*/node_modules/*" -not -path "*/migrations/*" -not -path "*/__pycache__/*" -not -path "./scripts/*" | sort; }
jsx() { find frontend/src \( -name "*.jsx" -o -name "*.js" \) | sort; }
# اپ‌های جنگو را از روی وجود apps.py پیدا کن تا با اضافه شدن account/home خودکار پیدا شوند
apps() { find . -maxdepth 2 -name "apps.py" -not -path "./venv/*" -not -path "./.venv/*" | xargs -r -n1 dirname | sed 's|^\./||' | sort; }

{
cat <<'HEADER'
# نقشهٔ کد CRM

> **تولیدشدهٔ خودکار — دستی ویرایش نکنید.** با `bash scripts/gen_code_map.sh` بازتولید می‌شود.
> هدف: به‌جای گشتن در فایل‌ها، مستقیم رفتن سراغ نقطهٔ درست.
> برای «چرا»ها به `.claude/architecture.md` و برای قراردادها به `CLAUDE.md` مراجعه کنید.

HEADER

echo "آخرین تولید: $(date '+%Y-%m-%d %H:%M') · کامیت \`$(git rev-parse --short HEAD 2>/dev/null || echo '—')\`"
echo
echo "| بخش | فایل | خط |"
echo "|---|---|---|"
printf "| بک‌اند | %s | %s |\n" "$(py | wc -l)" "$(py | xargs cat | wc -l)"
printf "| فرانت‌اند | %s | %s |\n" "$(jsx | wc -l)" "$(jsx | xargs cat | wc -l)"
echo
printf "اپ‌های جنگو: %s\n" "$(apps | paste -sd' ' -)"
echo

# ── endpointها ──────────────────────────────────────────────
echo "## endpointها"
echo
echo "| مسیر | ویو | فایل:خط | مجوز |"
echo "|---|---|---|---|"
APPDIRS=$(apps | paste -sd' ' -)
grep -oE 'path\("[^"]+", *[a-z_]+\.[A-Za-z]+' api/urls.py | while read -r line; do
    route=$(echo "$line" | sed -E 's/path\("([^"]+)".*/\1/')
    view=$(echo "$line" | sed -E 's/.*\.([A-Za-z]+)$/\1/')
    loc=$(grep -rn "^class $view" --include="*.py" $APPDIRS 2>/dev/null | head -1)
    file=$(echo "$loc" | cut -d: -f1); ln=$(echo "$loc" | cut -d: -f2)
    # پنجره تا کلاسِ بعدی باز است؛ پنجرهٔ کوتاه باعث می‌شد ویوهایی با داک‌استرینگ بلند
    # «بدون مجوز» گزارش شوند، که دربارهٔ endpointهای حساس اطلاعاتِ گمراه‌کننده است
    perm=""
    if [ -n "$file" ]; then
        perm=$(awk -v s="$ln" 'NR>s && /^class /{exit} NR>=s' "$file" 2>/dev/null \
            | grep -oE 'permission_classes = \[[^]]*\]' | sed 's/permission_classes = //' | head -1)
    fi
    # نبودِ صریح یعنی پیش‌فرضِ DRF (IsAuthenticated)، نه بی‌مجوز بودن
    printf "| \`/api/%s\` | %s | %s | %s |\n" "$route" "$view" "${file:-—}:${ln:-—}" \
        "${perm:-_(پیش‌فرض DRF)_}"
done
echo

# ── مدل‌ها ──────────────────────────────────────────────────
echo "## مدل‌ها"
echo
# اول همه را جمع کن، بعد چاپ — وگرنه وقتی فایل models.py هست ولی کلاسی ندارد
# (حالتِ فعلیِ اپ api) بخش کاملاً خالی می‌ماند و معلوم نیست تولید درست کار کرده یا نه
MODEL_ROWS=""
for f in $(py | grep "/models.py$" || true); do
    app=$(echo "$f" | cut -d/ -f2)
    while IFS=: read -r ln decl; do
        [ -z "$ln" ] && continue
        name=$(echo "$decl" | sed -E 's/^class ([A-Za-z]+).*/\1/')
        nf=$(awk -v s="$ln" 'NR>s && /^class /{exit} NR>s && /= models\./{c++} END{print c+0}' "$f")
        MODEL_ROWS="${MODEL_ROWS}- \`${app}.${name}\` — ${nf} فیلد — ${f}:${ln}"$'\n'
    done < <(grep -nE "^class [A-Z]" "$f" || true)
done
if [ -z "$MODEL_ROWS" ]; then
    echo "_هنوز مدلی تعریف نشده است._"
else
    printf '%s' "$MODEL_ROWS"
fi
echo

# ── ماژول‌های بک‌اند ────────────────────────────────────────
echo "## ماژول‌های بک‌اند"
echo
for f in $(py); do
    n=$(grep -cE "^[[:space:]]*(class|def) " "$f" || true)
    [ "$n" -eq 0 ] && continue
    printf -- "- **%s** (%s خط، %s نماد)\n" "$f" "$(wc -l < "$f")" "$n"
    grep -nE "^(class|def) " "$f" | sed -E 's/^([0-9]+):(class|def) ([A-Za-z_]+).*/    - `\3` :\1/' | head -14
done
echo

# ── فرانت‌اند ───────────────────────────────────────────────
echo "## فرانت‌اند"
echo
echo "### صفحه‌ها"
for f in $(jsx | grep -E "pages/[A-Za-z]+/[A-Za-z]+\.jsx$"); do
    printf -- "- **%s** (%s خط)\n" "$f" "$(wc -l < "$f")"
    grep -oE 'from "[./][^"]*\.jsx"' "$f" | sed -E 's|.*/([A-Za-z]+)\.jsx"|    - \1|' | sort -u
done
echo
echo "### کامپوننت‌های مشترک"
for f in $(jsx | grep "components/common/"); do
    printf -- "- \`%s\` — %s خط\n" "$(basename "$f" .jsx)" "$(wc -l < "$f")"
done
echo
echo "### لایهٔ API"
for f in frontend/src/api/*.js; do
    [ -f "$f" ] || continue
    printf -- "- **%s**: " "$(basename "$f")"
    grep -oE "^\s{4}[a-zA-Z]+:" "$f" | tr -d ' :' | paste -sd' ' -
    echo
done
} > "$OUT"

echo "نوشته شد: $OUT ($(wc -l < "$OUT") خط)"
