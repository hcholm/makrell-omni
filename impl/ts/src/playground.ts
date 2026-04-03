import {
  makrellPlaygroundExamples,
  type MakrellPlaygroundExample,
} from "./generated/playground_examples";

export { makrellPlaygroundExamples };
export type { MakrellPlaygroundExample };

export function getMakrellPlaygroundExample(id: string): MakrellPlaygroundExample | undefined {
  return makrellPlaygroundExamples.find((example) => example.id === id);
}
