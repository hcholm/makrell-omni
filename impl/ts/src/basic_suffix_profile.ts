export type BasicSuffixLiteral =
  | { kind: "string"; value: string; suffix?: string }
  | { kind: "number"; value: string; suffix?: string };

const numericSuffixFactors: Record<string, number> = {
  k: 1_000,
  M: 1_000_000,
  G: 1_000_000_000,
  T: 1_000_000_000_000,
  P: 1_000_000_000_000_000,
  E: 1_000_000_000_000_000_000,
};

export function applyBasicSuffixProfile(literal: BasicSuffixLiteral): unknown {
  const suffix = literal.suffix ?? "";
  if (literal.kind === "string") {
    if (!suffix) {
      return literal.value;
    }
    if (suffix === "dt") {
      return new Date(literal.value);
    }
    if (suffix === "bin") {
      return parseInt(literal.value, 2);
    }
    if (suffix === "oct") {
      return parseInt(literal.value, 8);
    }
    if (suffix === "hex") {
      return parseInt(literal.value, 16);
    }
    throw new Error(`Unsupported basic suffix profile string suffix '${suffix}'.`);
  }

  const parsed = Number(literal.value);
  if (!suffix) {
    return parsed;
  }
  const factor = numericSuffixFactors[suffix];
  if (factor !== undefined) {
    return parsed * factor;
  }
  if (suffix === "e") {
    return parsed * Math.E;
  }
  if (suffix === "tau") {
    return parsed * Math.PI * 2;
  }
  if (suffix === "deg") {
    return parsed * Math.PI / 180;
  }
  if (suffix === "pi") {
    return parsed * Math.PI;
  }
  throw new Error(`Unsupported basic suffix profile numeric suffix '${suffix}'.`);
}
