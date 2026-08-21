export default function MenuItem({ id, icon: Icon, text, active, toggle, onClick }) {
    return (
        <button type="button" id={id} onClick={onClick}
                className={`w-full flex flex-row justify-start items-center gap-2.5 py-1.5 px-2.5 rounded-[10px] ${toggle === "transactionsFilter" ? "my-0.75" : "my-px"} transition-all duration-200 ease-in-out ${active ? "cursor-default" : "cursor-pointer"} bg-transparent border border-transparent font-IRANSansXFaNumRegular text-[15px] 
      ${toggle === "customersFilter"
                    ? active ? "bg-var-color-15 dark:bg-var-color-35 text-var-color-00 dark:text-var-color-15 border-var-color-15 dark:border-var-color-37" : "text-var-color-08 dark:text-var-color-46 hover:bg-var-color-17 dark:hover:bg-var-color-35 hover:text-var-color-00 dark:hover:text-var-color-46 hover:border-var-color-46 dark:hover:border-var-color-37"
                    : toggle === "transactionsFilter"
                        ? active ? "bg-var-color-29 text-var-color-31 border-var-color-47" : "text-var-color-08 dark:text-var-color-46 hover:bg-var-color-08 hover:text-var-color-31 hover:border-var-color-47"
                        : active ? "bg-var-color-17 dark:bg-var-color-40 text-var-color-19 dark:text-var-color-46 border-var-color-13 dark:border-var-color-41" : "text-var-color-06 dark:text-var-color-46 hover:bg-var-color-17 dark:hover:bg-var-color-40 hover:text-var-color-19 dark:hover:text-var-color-46 hover:border-var-color-13 dark:hover:border-var-color-41"
                }
            `}
        >
            {Icon && <Icon />}
            <span>{text}</span>
        </button>
    );
}
