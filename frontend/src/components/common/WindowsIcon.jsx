import {useId} from "react";

const WindowsIcon = ({className = "w-7 h-7"}) => {
    const id = useId();
    const gradTL = `win-grad-tl-${id}`;
    const gradTR = `win-grad-tr-${id}`;
    const gradBL = `win-grad-bl-${id}`;
    const gradBR = `win-grad-br-${id}`;

    return (
        <svg className={className} width="27" height="27" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Windows" role="img">
            <defs>
                <linearGradient id={gradTL} x1="100%" y1="0%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="#95D6F5"/>
                    <stop offset="100%" stopColor="#00bcff"/>
                </linearGradient>
                <linearGradient id={gradTR} x1="100%" y1="0%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="#5AC5F5"/>
                    <stop offset="100%" stopColor="#0099cc"/>
                </linearGradient>
                <linearGradient id={gradBL} x1="100%" y1="0%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="#5AC5F5"/>
                    <stop offset="100%" stopColor="#0099cc"/>
                </linearGradient>
                <linearGradient id={gradBR} x1="100%" y1="0%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="#2EA9F5"/>
                    <stop offset="100%" stopColor="#007197"/>
                </linearGradient>
            </defs>
            <path d="M17 0 L30.5 0 A1.5 1.5 0 0 1 32 1.5 L32 15 L17 15 Z" fill={`url(#${gradTL})`}/>
            <path d="M0 1.5 A1.5 1.5 0 0 1 1.5 0 L15 0 L15 15 L0 15 Z" fill={`url(#${gradTR})`}/>
            <path d="M17 17 L32 17 L32 30.5 A1.5 1.5 0 0 1 30.5 32 L17 32 Z" fill={`url(#${gradBL})`}/>
            <path d="M0 17 L15 17 L15 32 L1.5 32 A1.5 1.5 0 0 1 0 30.5 Z" fill={`url(#${gradBR})`}/>
        </svg>
    );
};

export default WindowsIcon;