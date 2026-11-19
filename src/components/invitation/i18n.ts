export type Locale = "ar" | "en";

const en = {
  forKicker: "An invitation for", ourGuests: "our dear guests", tap: "Tap to open", skip: "Skip opening",
  together: "Together with their families", scroll: "SCROLL", saveDate: "Save the date", days: "days", hours: "hours", mins: "minutes", secs: "seconds",
  gcal: "Google Calendar", ocal: "Outlook", ical: "Apple Calendar", evening: "The evening", venue: "The venue", directions: "Get directions",
  kindly: "Kindly note", gallery: "Moments", kindlyReply: "Kindly reply", join: "Will you join us?", replyBy: "Please reply by",
  fName: "Your name", fPhone: "Phone number", optional: "(optional)", fComp: "Coming with you", fNote: "A note for the hosts",
  attend: "Joyfully attending", attendOnly: "I will attend", decline: "Regretfully declining", privacy: "Your details are shared only with the hosts.",
  cantWait: "We can’t wait to see you", reached: "Your reply has reached the hosts", entryPass: "Entry pass", people: "PEOPLE", person: "PERSON",
  date: "Date", venue2: "Venue", addCal: "Add to calendar", savePass: "Save pass", showAtDoor: "Show this code at the entrance. Open your invitation link any time to see it again.",
  change: "Change my reply", miss: "You will be missed", missMsg: "Thank you for letting us know.", thanks: "Thank you!", thanksMsg: "Your reply has been received.",
  crafted: "Invitation crafted by", replay: "Replay the opening", onlyYou: "Just you",
  plus: (n: number) => (n === 1 ? "1 person" : `${n} people`),
  greetMany: "Dear {name}, we have reserved {seats} seats for you.", greetOne: "Dear {name}, we have reserved a seat for you.",
  greetOpen: "You may bring up to {n} companion(s).", greetSolo: "This invitation is for you personally.",
  closed: "Replies are closed. Thank you.", previewNote: "Preview: replies are disabled here.", required: "is required", errPhone: "Please enter a valid phone number", errAck: "Please confirm to continue",
  sending: "Sending…", error: "Something went wrong. Please try again.", musicOn: "Music on", musicOff: "Music off", lang: "العربية",
  holdSeal: "Press and hold the seal", tapSeal: "Tap the seal to open", timeLabel: "Time", keepHolding: "Keep holding…", untie: "Untie the ribbon", partCurtain: "Part the curtain", openGate: "Open the invitation",
  letterKicker: "A letter for you", dear: "Dear", scrollOpen: "SCROLL TO OPEN", revealDate: "Reveal the date", holdDate: "Press and hold the seal to reveal the date",
  lightRoom: "Move your finger to light the room", swipe: "Swipe the card", next: "Next", readAgain: "Read again", noticesDone: "Thank you for keeping these in mind.",
  dressCode: "Dress code", her: "For her", him: "For him", faq: "Good to know", withLove: "With love,", closingLine: "We can’t wait to celebrate with you.",
};

const ar: typeof en = {
  forKicker: "دعوة خاصة إلى", ourGuests: "ضيوفنا الكرام", tap: "المس لفتح الدعوة", skip: "تخطي الافتتاحية",
  together: "بكل الحب والسرور", scroll: "مرّر", saveDate: "احفظوا التاريخ", days: "يوم", hours: "ساعة", mins: "دقيقة", secs: "ثانية",
  gcal: "تقويم جوجل", ocal: "تقويم أوتلوك", ical: "تقويم آبل", evening: "برنامج الحفل", venue: "مكان الحفل", directions: "الاتجاهات",
  kindly: "يرجى الملاحظة", gallery: "لحظات", kindlyReply: "تأكيد الحضور", join: "هل ستشاركوننا فرحتنا؟", replyBy: "يرجى الرد قبل",
  fName: "الاسم", fPhone: "رقم الهاتف", optional: "(اختياري)", fComp: "عدد المرافقين", fNote: "كلمة لأصحاب الدعوة",
  attend: "سأحضر بكل سرور", attendOnly: "سأحضر", decline: "أعتذر عن الحضور", privacy: "بياناتك تصل إلى أصحاب الدعوة فقط.",
  cantWait: "بانتظاركم بكل شوق", reached: "وصل ردّكم إلى أصحاب الدعوة", entryPass: "بطاقة الدخول", people: "أشخاص", person: "شخص",
  date: "التاريخ", venue2: "المكان", addCal: "أضف إلى التقويم", savePass: "حفظ البطاقة", showAtDoor: "اعرض هذا الرمز عند المدخل، ويمكنك فتح رابط دعوتك في أي وقت لرؤيته.",
  change: "تعديل الرد", miss: "سنفتقدكم", missMsg: "شكراً لإبلاغنا.", thanks: "شكراً لكم!", thanksMsg: "وصلنا ردّكم.",
  crafted: "صُممت هذه الدعوة بواسطة", replay: "إعادة الافتتاحية", onlyYou: "أنت فقط",
  plus: (n: number) => (n === 1 ? "شخص واحد" : n === 2 ? "شخصان" : `${n} أشخاص`),
  greetMany: "أهلاً {name}، حجزنا لكم {seats} مقاعد.", greetOne: "أهلاً {name}، حجزنا لك مقعداً.",
  greetOpen: "يمكنك اصطحاب حتى {n} مرافقين.", greetSolo: "هذه الدعوة خاصة بك.",
  closed: "انتهى وقت الرد. شكراً لكم.", previewNote: "معاينة: الرد غير مفعّل هنا.", required: "مطلوب", errPhone: "يرجى إدخال رقم هاتف صحيح", errAck: "يرجى التأكيد للمتابعة",
  sending: "جارٍ الإرسال…", error: "حدث خطأ. حاول مرة أخرى.", musicOn: "الموسيقى تعمل", musicOff: "الموسيقى متوقفة", lang: "English",
  holdSeal: "اضغط مطوّلاً على الختم", tapSeal: "المس الختم لفتح الدعوة", timeLabel: "الوقت", keepHolding: "استمر بالضغط…", untie: "فُكّ الشريطة", partCurtain: "أزح الستارة", openGate: "افتح الدعوة",
  letterKicker: "رسالة إليك", dear: "عزيزنا", scrollOpen: "مرّر للفتح", revealDate: "اكشف التاريخ", holdDate: "اضغط مطوّلاً على الختم لكشف التاريخ",
  lightRoom: "حرّك إصبعك لإضاءة القاعة", swipe: "اسحب البطاقة", next: "التالي", readAgain: "اقرأ مجدداً", noticesDone: "شكراً لمراعاتكم.",
  dressCode: "قواعد اللباس", her: "لها", him: "له", faq: "معلومات تهمّك", withLove: "مع خالص الحب،", closingLine: "بانتظاركم لنحتفل معاً.",
};

export const STRINGS = { en, ar };
export type Strings = typeof en;

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
export const digits = (s: string | number, l: Locale) => (l === "ar" ? String(s).replace(/\d/g, (d) => AR_DIGITS[Number(d)]!) : String(s));

/** Splits "Dear {name}" into text and the values to emphasise; rendered as React nodes, never as HTML. */
export function fillParts(template: string, vars: Record<string, string>): { text: string; bold: boolean }[] {
  return template.split(/(\{\w+\})/).filter(Boolean).map((part) => {
    const m = part.match(/^\{(\w+)\}$/);
    return m && m[1] && m[1] in vars ? { text: vars[m[1]]!, bold: true } : { text: part, bold: false };
  });
}
