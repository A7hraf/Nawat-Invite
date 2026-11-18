/* Stroke icons (24px grid). Decorative unless a label is given by the parent. */
const P = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;
type Props = { size?: number };
const S = ({ size = 18, children }: Props & { children: React.ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...P}>{children}</svg>
);

export const IconGrid = (p: Props) => <S {...p}><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></S>;
export const IconUsers = (p: Props) => <S {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5" /></S>;
export const IconMail = (p: Props) => <S {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></S>;
export const IconStar = (p: Props) => <S {...p}><path d="m12 3 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.8Z" /></S>;
export const IconMusic = (p: Props) => <S {...p}><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></S>;
export const IconFile = (p: Props) => <S {...p}><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" /><path d="M14 3v6h6M8 13h8M8 17h5" /></S>;
export const IconShield = (p: Props) => <S {...p}><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6Z" /></S>;
export const IconCog = (p: Props) => <S {...p}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></S>;
export const IconPalette = (p: Props) => <S {...p}><circle cx="12" cy="12" r="9" /><circle cx="8" cy="10" r="1.2" /><circle cx="12" cy="7.5" r="1.2" /><circle cx="16" cy="10" r="1.2" /><path d="M12 21a3 3 0 0 1 0-6h2" /></S>;
export const IconPlus = (p: Props) => <S {...p}><path d="M12 5v14M5 12h14" /></S>;
export const IconEye = (p: Props) => <S {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></S>;
export const IconLock = (p: Props) => <S {...p}><rect x="4" y="10" width="16" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></S>;
export const IconQr = (p: Props) => <S {...p}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3" /></S>;
export const IconLogout = (p: Props) => <S {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></S>;
export const IconWhatsapp = (p: Props) => <S {...p}><path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 20.5l1.6-5.4A8.4 8.4 0 1 1 21 11.5Z" /></S>;
export const IconCopy = (p: Props) => <S {...p}><rect x="8" y="8" width="13" height="13" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></S>;
export const IconDownload = (p: Props) => <S {...p}><path d="M12 3v12M7 10l5 5 5-5M5 21h14" /></S>;
export const IconArrow = (p: Props) => <S {...p}><path d="M5 12h14M13 6l6 6-6 6" /></S>;
export const IconBack = (p: Props) => <S {...p}><path d="m15 6-6 6 6 6" /></S>;
export const IconDoor = (p: Props) => <S {...p}><path d="M3 21h18M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17" /><circle cx="15" cy="12" r=".8" /></S>;
