// برنامه‌های OpenUI Lang را با پارسرِ خودِ کتابخانه می‌سنجد — ابزارِ `manage.py eval_models`.
//
// ورودی: مسیرِ فایلی با یک آرایهٔ JSON از برنامه‌ها.
// خروجی: آرایهٔ JSON هم‌ترتیب، برای هر برنامه `{root, errors, unresolved}`.
//
// ⚠️ پایتون این زبان را نمی‌فهمد، و «رابط ساخته می‌شود یا نه» را فقط همان پارسری
// می‌تواند بگوید که مرورگر هم با آن رندر می‌کند — نه یک regex که شکلِ کد را حدس بزند.
import {readFileSync} from "node:fs";
import {createLibrary, createParser} from "@openuidev/react-lang";
import {buildComponents, COMPONENT_GROUPS, ROOT} from "../src/pages/Chat/openui/defs.js";

const library = createLibrary({root: ROOT, components: buildComponents(), componentGroups: COMPONENT_GROUPS});
const parser = createParser(library.toJSONSchema());

const programs = JSON.parse(readFileSync(process.argv[2], "utf8"));
console.log(JSON.stringify(programs.map((code) => {
    const {root, meta = {}} = parser.parse(code);
    return {root: root?.typeName ?? null, errors: (meta.errors ?? []).map((e) => e.code),
            unresolved: meta.unresolved ?? []};
})));
