import {Link} from "react-router";

const NotFound = () => {
    return (
        <section className="flex min-h-full flex-col items-center justify-center gap-4 p-4 text-center">
            <h1 className="font-IRANSansXFaNumBlack text-7xl text-var-color-15 animate-fade-up">۴۰۴</h1>
            <p className="text-var-color-06 dark:text-var-color-03 animate-fade-up" style={{animationDelay: "80ms"}}>
                صفحه‌ای که دنبالش بودید پیدا نشد.
            </p>
            <Link
                to="/"
                className="btn btn-bluish rounded-lg px-5 py-2 text-sm animate-fade-up"
                style={{animationDelay: "160ms"}}
            >
                بازگشت به خانه
            </Link>
        </section>
    );
};

export default NotFound;
