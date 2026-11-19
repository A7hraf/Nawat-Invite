import { themeFontHrefs, type ThemeDef } from "@/themes/catalog";

/** Self-hosted font stylesheets for one theme. Browsers only download the faces the page uses. */
export function ThemeFonts({ theme }: { theme: ThemeDef }) {
  return <>{themeFontHrefs(theme).map((h) => <link key={h} rel="stylesheet" href={h} precedence="default" />)}</>;
}
