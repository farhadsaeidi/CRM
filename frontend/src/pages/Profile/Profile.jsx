import {useEffect, useRef, useState} from "react";
import {FiCamera, FiLock, FiLogOut, FiMapPin, FiSave, FiUser, FiUsers} from "react-icons/fi";
import {HiOutlineArrowsRightLeft, HiOutlineBanknotes} from "react-icons/hi2";
import {GrPhone} from "react-icons/gr";
import {FaCrown} from "react-icons/fa6";
import Breadcrumb from "../../components/common/Breadcrumb.jsx";
import ChangePasswordModal from "../../components/common/ChangePasswordModal.jsx";
import ScrollContainer from "../../components/common/ScrollContainer.jsx";
import {authApi} from "../../api/auth.js";
import {customersApi} from "../../api/customers.js";
import {allTransactionsApi} from "../../api/transactions.js";
import {useAuth} from "../../context/AuthContext.js";
import {faCompact, faNumber, toFaDigits} from "../../lib/chart.js";
import {notify} from "../../lib/notify.jsx";
import {PROFILE_PATH} from "../../lib/paths.js";
import {profileSchema} from "../../validators/auth.js";

const ROLE_LABELS = {owner: "مالکِ دفتر", superuser: "مدیرِ سامانه"};

const faDate = (iso) =>
    iso ? new Intl.DateTimeFormat("fa-IR", {year: "numeric", month: "long", day: "numeric"})
        .format(new Date(iso)) : "—";

/**
 * صفحهٔ پروفایل.
 *
 * ⚠️ شمارهٔ همراه اینجا فقط نمایش داده می‌شود و ویرایش نمی‌شود: همان نامِ کاربریِ
 * ورود است و عوض کردنش فلوی خودش را می‌خواهد (تاییدِ شمارهٔ تازه با کد یکبارمصرف)،
 * نه یک فیلدِ ساده در همین فرم. سرور هم `phone` را در سریالایزرِ ویرایش ندارد.
 */
const Profile = () => {
    const {user, setUser} = useAuth();
    const fileRef = useRef(null);

    const [fullname, setFullname] = useState(user?.fullname ?? "");
    const [address, setAddress] = useState(user?.address ?? "");
    const [imageFile, setImageFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [passwordOpen, setPasswordOpen] = useState(false);
    const [stats, setStats] = useState(null);

    // خلاصهٔ دفتر کنارِ پروفایل — همان دو endpointِ شاخص که صفحه‌های دیگر هم
    // می‌خوانند؛ نه کوئریِ تازه‌ای لازم است نه endpointِ تازه‌ای
    useEffect(() => {
        let ignore = false;
        Promise.all([customersApi.stats(), allTransactionsApi.stats()])
            .then(([customers, transactions]) => {
                if (!ignore) setStats({customers, transactions});
            })
            .catch(() => undefined);
        return () => {
            ignore = true;
        };
    }, []);

    // نشانیِ موقتِ پیش‌نمایش باید آزاد شود، وگرنه تا پایانِ عمرِ صفحه در حافظه می‌ماند
    useEffect(() => () => {
        if (preview) URL.revokeObjectURL(preview);
    }, [preview]);

    const pickImage = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            notify("فقط فایلِ تصویری قابل انتخاب است.", "error");
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            notify("حجمِ تصویر باید کمتر از ۲ مگابایت باشد.", "error");
            return;
        }
        if (preview) URL.revokeObjectURL(preview);
        setImageFile(file);
        setPreview(URL.createObjectURL(file));
    };

    const dirty = fullname !== (user?.fullname ?? "") ||
        address !== (user?.address ?? "") ||
        imageFile !== null;

    const onSubmit = async (event) => {
        event.preventDefault();
        const parsed = profileSchema.safeParse({fullname, address});
        if (!parsed.success) {
            const fieldErrors = {};
            for (const issue of parsed.error.issues) fieldErrors[issue.path[0]] = issue.message;
            setErrors(fieldErrors);
            notify(Object.values(fieldErrors)[0], "error");
            return;
        }

        setErrors({});
        setSaving(true);
        try {
            // با تصویر باید FormData برود؛ بدونش JSON کافی است و سبک‌تر
            let payload = parsed.data;
            if (imageFile) {
                payload = new FormData();
                payload.append("fullname", parsed.data.fullname);
                payload.append("address", parsed.data.address);
                payload.append("image", imageFile);
            }
            const res = await authApi.updateProfile(payload);
            setUser(res.userData);
            setImageFile(null);
            if (preview) URL.revokeObjectURL(preview);
            setPreview(null);
            notify(res.message || "پروفایل به‌روزرسانی شد.", "success");
        } catch (err) {
            const data = err?.data || {};
            const field = data.fieldErrors && Object.keys(data.fieldErrors)[0];
            if (field) {
                setErrors({[field]: data.fieldErrors[field]});
                notify(data.fieldErrors[field], "error");
            } else {
                notify(data.detail || data.message || "به‌روزرسانی پروفایل ناموفق بود.", "error");
            }
        } finally {
            setSaving(false);
        }
    };

    const avatar = preview || user?.image || "/images/person2.png";
    const inputClass = (name) =>
        `w-full h-11 text-[14px] pr-9.5 pl-3 rounded-xl input input-bluish input-placeholder ${
            errors[name] ? "input-error" : ""
        }`;

    return (
        <section className="h-full min-h-0 flex flex-col">
            <div className="w-[90%] mx-auto min-w-0 min-h-0 flex flex-col max-h-full">
                <Breadcrumb items={[{label: "پروفایل", to: PROFILE_PATH, icon: FiUser}]}/>

                <ScrollContainer className="flex-1 min-h-0" overflowX="hidden" position="right" trackPadding={18}>
                    <div className="pl-2 pb-2 grid grid-cols-1 xl:grid-cols-3 gap-3">

                        {/* ── کارتِ هویت ────────────────────────────────── */}
                        <section className="animate-fade-up relative overflow-hidden xl:col-span-1
                                            rounded-[18px] p-5 flex flex-col items-center gap-3
                                            bg-var-color-00 dark:bg-var-color-36
                                            border border-var-color-02 dark:border-var-color-38">
                            {/* هالهٔ بنفشِ بالای کارت — همان لهجهٔ کارت‌های داشبورد */}
                            <span aria-hidden="true"
                                  className="pointer-events-none absolute -top-16 inset-x-0 h-32
                                             bg-var-color-25 opacity-[0.08] blur-3xl"/>

                            <div className="relative">
                                <div className="w-26 h-26 rounded-full bg-center bg-cover bg-no-repeat
                                                ring-4 ring-var-color-12 dark:ring-var-color-44"
                                     style={{backgroundImage: `url(${avatar})`}}
                                     role="img" aria-label="تصویر پروفایل"/>
                                <button type="button" onClick={() => fileRef.current?.click()}
                                        aria-label="تغییر تصویر پروفایل"
                                        className="absolute bottom-0 left-0 w-9 h-9 rounded-full cursor-pointer
                                                   flex items-center justify-center transition-all duration-200
                                                   bg-var-color-15 text-var-color-11
                                                   ring-4 ring-var-color-00 dark:ring-var-color-36
                                                   hover:brightness-110 active:scale-90">
                                    <FiCamera className="w-4 h-4"/>
                                </button>
                                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                                       onChange={pickImage}/>
                            </div>

                            <div className="relative text-center min-w-0 w-full">
                                <h2 className="m-0 text-[18px] font-IRANSansXFaNumDemiBold truncate
                                               text-var-color-08 dark:text-var-color-01">
                                    {user?.fullname ?? "—"}
                                </h2>
                                <p className="m-0 mt-1 text-[13px] font-IRANSansXFaNumUltraLight
                                              text-var-color-04 dark:text-var-color-39">
                                    {toFaDigits(user?.phone ?? "—")}
                                </p>
                            </div>

                            <span className="relative flex flex-row items-center gap-1.5 px-3 py-1 rounded-full text-[12px]
                                             bg-var-color-21 text-var-color-25 border border-var-color-22">
                                <FaCrown className="w-3.5 h-3.5"/>
                                {ROLE_LABELS[user?.role] ?? "کاربر"}
                            </span>

                            <p className="relative m-0 pt-3 w-full text-center text-[11.5px] border-t
                                          border-var-color-02 dark:border-var-color-38
                                          text-var-color-04 dark:text-var-color-39">
                                عضو از {faDate(user?.created)}
                            </p>
                        </section>

                        {/* ── فرمِ ویرایش ──────────────────────────────── */}
                        <form onSubmit={onSubmit} autoComplete="off"
                              style={{animationDelay: "60ms"}}
                              className="animate-fade-up xl:col-span-2 rounded-[18px] p-5 flex flex-col gap-4
                                         bg-var-color-00 dark:bg-var-color-36
                                         border border-var-color-02 dark:border-var-color-38">
                            <header className="flex flex-row items-center gap-2">
                                <span className="w-7 h-7 shrink-0 rounded-[10px] flex items-center justify-center
                                                 bg-var-color-12 dark:bg-var-color-44 text-var-color-15">
                                    <FiUser className="w-4 h-4"/>
                                </span>
                                <h3 className="m-0 text-[14px] font-IRANSansXFaNumMedium
                                               text-var-color-06 dark:text-var-color-01">اطلاعات حساب</h3>
                            </header>

                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="profile-fullname"
                                       className="text-[13px] text-var-color-05 dark:text-var-color-39">
                                    نام و نام خانوادگی
                                </label>
                                <div className="relative w-full">
                                    <FiUser className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4
                                                       text-var-color-15 pointer-events-none"/>
                                    <input id="profile-fullname" type="text" value={fullname}
                                           placeholder="نام و نام خانوادگی خود را وارد کنید..."
                                           onChange={(e) => {
                                               setFullname(e.target.value);
                                               setErrors((prev) => ({...prev, fullname: ""}));
                                           }}
                                           className={inputClass("fullname")}/>
                                </div>
                                {errors.fullname && (
                                    <p className="m-0 text-[11.5px] text-var-color-28">{errors.fullname}</p>
                                )}
                            </div>

                            {/* شمارهٔ همراه فقط خواندنی است — نامِ کاربریِ ورود است */}
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="profile-phone"
                                       className="text-[13px] text-var-color-05 dark:text-var-color-39">
                                    شماره همراه
                                </label>
                                <div className="relative w-full">
                                    <GrPhone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4
                                                        text-var-color-04 pointer-events-none"/>
                                    <input id="profile-phone" type="text" readOnly
                                           value={toFaDigits(user?.phone ?? "")}
                                           className="w-full h-11 text-[14px] pr-9.5 pl-3 rounded-xl cursor-not-allowed
                                                      bg-var-color-01 dark:bg-var-color-40
                                                      border border-var-color-02 dark:border-var-color-38
                                                      text-var-color-04 dark:text-var-color-39"/>
                                </div>
                                <p className="m-0 text-[11.5px] text-var-color-04 dark:text-var-color-39">
                                    شماره همراه نامِ کاربریِ شماست و از این صفحه عوض نمی‌شود.
                                </p>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="profile-address"
                                       className="text-[13px] text-var-color-05 dark:text-var-color-39">
                                    آدرس <span className="text-var-color-04">(اختیاری)</span>
                                </label>
                                <div className="relative w-full">
                                    <FiMapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4
                                                         text-var-color-15 pointer-events-none"/>
                                    <input id="profile-address" type="text" value={address}
                                           placeholder="آدرس کسب‌وکار یا محلِ سکونت..."
                                           onChange={(e) => {
                                               setAddress(e.target.value);
                                               setErrors((prev) => ({...prev, address: ""}));
                                           }}
                                           className={inputClass("address")}/>
                                </div>
                                {errors.address && (
                                    <p className="m-0 text-[11.5px] text-var-color-28">{errors.address}</p>
                                )}
                            </div>

                            {/* enabled: لازم است چون هاور روی دکمهٔ disabled هم اعمال می‌شود */}
                            <div className="flex flex-row items-center justify-end gap-2 mt-1">
                                <button type="button" onClick={() => setPasswordOpen(true)}
                                        className="h-10 px-4 rounded-xl btn btn-bluish text-[13px]">
                                    <FiLock className="w-4 h-4 ml-1.5"/>
                                    تغییر رمز عبور
                                </button>
                                <button type="submit" disabled={saving || !dirty}
                                        className="h-10 px-5 rounded-xl text-[13px] cursor-pointer
                                                   flex items-center gap-1.5 transition-all duration-200
                                                   bg-var-color-15 text-var-color-11
                                                   enabled:hover:brightness-110 enabled:active:scale-[0.98]
                                                   disabled:opacity-40 disabled:cursor-not-allowed">
                                    <FiSave className="w-4 h-4"/>
                                    {saving ? "در حال ذخیره ..." : "ذخیرهٔ تغییرات"}
                                </button>
                            </div>
                        </form>

                        {/* ── خلاصهٔ دفتر ──────────────────────────────── */}
                        <section style={{animationDelay: "120ms"}}
                                 className="animate-fade-up xl:col-span-3 rounded-[18px] p-5 flex flex-col gap-4
                                            bg-var-color-00 dark:bg-var-color-36
                                            border border-var-color-02 dark:border-var-color-38">
                            <header className="flex flex-row items-center gap-2">
                                <span className="w-7 h-7 shrink-0 rounded-[10px] flex items-center justify-center
                                                 bg-var-color-12 dark:bg-var-color-44 text-var-color-15">
                                    <HiOutlineBanknotes className="w-4 h-4"/>
                                </span>
                                <h3 className="m-0 text-[14px] font-IRANSansXFaNumMedium
                                               text-var-color-06 dark:text-var-color-01">دفترِ شما در یک نگاه</h3>
                            </header>

                            {stats ? (
                                <div className="grid grid-cols-1 2xs:grid-cols-2 xl:grid-cols-4 gap-3">
                                    <Figure icon={FiUsers} label="مشتریان"
                                            value={toFaDigits(stats.customers.total)} unit="نفر"
                                            tone="text-var-color-25"/>
                                    <Figure icon={HiOutlineArrowsRightLeft} label="تراکنش‌ها"
                                            value={toFaDigits(stats.transactions.total)} unit="ردیف"
                                            tone="text-var-color-15"/>
                                    <Figure icon={HiOutlineBanknotes} label="طلبِ شما"
                                            value={faCompact(stats.customers.debtors.amount)} unit="تومان"
                                            tone="text-var-color-55"/>
                                    <Figure icon={FiLogOut} label="گردشِ کل"
                                            value={faNumber(stats.transactions.turnover)} unit="تومان"
                                            tone="text-var-color-31"/>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 2xs:grid-cols-2 xl:grid-cols-4 gap-3">
                                    {[0, 1, 2, 3].map((index) => (
                                        <div key={index} className="animate-pulse h-20 rounded-2xl
                                                                    bg-var-color-01 dark:bg-var-color-40"/>
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>
                </ScrollContainer>
            </div>

            <ChangePasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)}/>
        </section>
    );
};

const Figure = ({icon: Icon, label, value, unit, tone}) => (
    <div className="rounded-2xl px-4 py-3 flex flex-row items-center gap-3
                    bg-var-color-01 dark:bg-var-color-40
                    border border-var-color-02 dark:border-var-color-38">
        <span className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center
                          bg-var-color-00 dark:bg-var-color-36 ${tone}`}>
            <Icon className="w-4.5 h-4.5"/>
        </span>
        <span className="min-w-0">
            <span className="block text-[11.5px] text-var-color-04 dark:text-var-color-39">{label}</span>
            <span className="block mt-0.5 flex flex-row items-baseline gap-1 min-w-0">
                <strong className="text-[17px] font-IRANSansXFaNumDemiBold truncate
                                   text-var-color-08 dark:text-var-color-01">{value}</strong>
                <span className="text-[10.5px] shrink-0 text-var-color-04 dark:text-var-color-39">{unit}</span>
            </span>
        </span>
    </div>
);

export default Profile;
