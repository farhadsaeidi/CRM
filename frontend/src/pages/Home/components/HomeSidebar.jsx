import {NavLink} from "react-router";
import {FiMessageSquare, FiUsers} from "react-icons/fi";
import {FaHome} from "react-icons/fa";
import {HiOutlineArrowsRightLeft} from "react-icons/hi2";
import ScrollContainer from "../../../components/common/ScrollContainer.jsx";

// چهار بخشِ اصلیِ برنامه. هر کدام مسیرِ خودش را دارد، پس با NavLink ساخته می‌شوند
// نه با state: آدرس منبعِ حقیقت است و رفرش و دکمهٔ back درست کار می‌کنند.
const ITEMS = [
    {to: "/home", icon: FaHome, label: "داشبورد", end: true},
    {to: "/customers", icon: FiUsers, label: "مشتریان"},
    {to: "/all-transactions", icon: HiOutlineArrowsRightLeft, label: "تراکنش ها"},
    {to: "/chat", icon: FiMessageSquare, label: "گفتگو"},
];

// ⚠️ **هر دو حالت تهرنگِ آلفادارند، نه رنگِ تو‌پُر.** پیش‌تر فعال `۴۴` بود و هاور
// `۴۰` — دو رنگِ تو‌پُر که با تیره و خنثی شدنِ کروم، مثلِ وصله روی سایدبار
// می‌نشستند. تهرنگ با هر زمینه‌ای می‌آمیزد، پس هم ملایم‌تر است هم در تمِ روشن و
// تیره یک نسخه بیشتر نمی‌خواهد. ۸٪ برای فعال و ۵٪ برای هاور، از یک خانواده، پس
// هاور نسخهٔ ضعیف‌ترِ همان حالتِ فعال دیده می‌شود.
//
// ⚠️ تهرنگِ ۲۰٪ (`۱۳`) امتحان شد و برعکس بود: از رنگِ تو‌پُرِ قبلی **روشن‌تر**
// درمی‌آمد و بلندتر به نظر می‌رسید، نه ملایم‌تر.
const itemCls = ({isActive}) =>
    `w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] cursor-pointer text-right no-underline
     transition-colors duration-200 ${isActive
        ? "bg-var-color-17 text-var-color-19 dark:text-var-color-15 font-IRANSansXFaNumMedium"
        : "text-var-color-06 dark:text-var-color-01 hover:bg-var-color-66"}`;

// کلاس‌های چیدمان روی div داخلی‌اند نه روی ScrollContainer: کتابخانه بین آن و
// فرزندانش عنصرِ viewport می‌گذارد، پس flex/gap/padding روی میزبان به فرزندان نمی‌رسد.
const HomeSidebar = () => (
    <ScrollContainer className="flex-1 min-h-0" overflowX="hidden">
        <nav className="p-2.5 flex flex-col gap-1">
            <p className="m-0 px-2 pt-1 pb-2 text-[10.5px] tracking-wide text-var-color-04 dark:text-var-color-39">
                دفتر مشتریان
            </p>
            {ITEMS.map(({to, icon: Icon, label, end}) => (
                <NavLink key={to} to={to} end={end} className={itemCls}>
                    <Icon className="w-4.5 h-4.5 shrink-0"/> {label}
                </NavLink>
            ))}
        </nav>
    </ScrollContainer>
);

export default HomeSidebar;
