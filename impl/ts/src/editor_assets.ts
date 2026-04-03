import languagesJson from "./editor-assets/languages.json";
import languageConfigurationJson from "./editor-assets/language-configuration.json";
import snippetsJson from "./editor-assets/snippets/makrell.code-snippets.json";
import grammarJson from "./editor-assets/syntaxes/makrell.tmLanguage.json";

export interface MakrellEditorLanguage {
  id: string;
  aliases: string[];
  extensions: string[];
  family: string;
}

export interface MakrellEditorLanguagesJson {
  languages: MakrellEditorLanguage[];
}

export interface MakrellEditorAssets {
  languages: MakrellEditorLanguage[];
  languageConfiguration: Record<string, unknown>;
  snippets: Record<string, unknown>;
  grammar: Record<string, unknown>;
}

const languagePayload = languagesJson as MakrellEditorLanguagesJson;

export const makrellEditorLanguages = languagePayload.languages;
export const makrellLanguageConfiguration = languageConfigurationJson as Record<string, unknown>;
export const makrellEditorSnippets = snippetsJson as Record<string, unknown>;
export const makrellTextMateGrammar = grammarJson as Record<string, unknown>;

export function getMakrellEditorAssets(): MakrellEditorAssets {
  return {
    languages: makrellEditorLanguages,
    languageConfiguration: makrellLanguageConfiguration,
    snippets: makrellEditorSnippets,
    grammar: makrellTextMateGrammar,
  };
}
