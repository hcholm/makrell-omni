package formats

import (
	"fmt"
	"strconv"
	"strings"
	"time"
)

type BasicSuffixLiteralKind string

const (
	BasicSuffixString BasicSuffixLiteralKind = "string"
	BasicSuffixNumber BasicSuffixLiteralKind = "number"
)

type BasicSuffixLiteral struct {
	Kind   BasicSuffixLiteralKind
	Value  string
	Suffix string
}

func ApplyBasicSuffixProfile(literal BasicSuffixLiteral) (any, error) {
	switch literal.Kind {
	case BasicSuffixString:
		if literal.Suffix == "" {
			return literal.Value, nil
		}
		switch literal.Suffix {
		case "dt":
			return parseDateTimeLiteral(literal.Value)
		case "bin":
			return strconv.ParseInt(literal.Value, 2, 64)
		case "oct":
			return strconv.ParseInt(literal.Value, 8, 64)
		case "hex":
			return strconv.ParseInt(literal.Value, 16, 64)
		default:
			return nil, fmt.Errorf("unsupported basic suffix profile string suffix '%s'", literal.Suffix)
		}
	case BasicSuffixNumber:
		return applyBasicNumberSuffix(literal.Value, literal.Suffix)
	default:
		return nil, fmt.Errorf("unsupported basic suffix profile literal kind '%s'", literal.Kind)
	}
}

func SplitNumericLiteralSuffix(text string) (value string, suffix string, ok bool) {
	for boundary := len(text); boundary > 0; boundary-- {
		value = text[:boundary]
		suffix = text[boundary:]
		if suffix != "" && !isSuffixIdentifier(suffix) {
			continue
		}
		if _, err := strconv.ParseInt(value, 10, 64); err == nil {
			return value, suffix, true
		}
		if _, err := strconv.ParseFloat(value, 64); err == nil {
			return value, suffix, true
		}
	}
	return "", "", false
}

func parseDateTimeLiteral(value string) (time.Time, error) {
	layouts := []string{
		time.RFC3339Nano,
		"2006-01-02 15:04:05.999999999",
		"2006-01-02 15:04:05",
		"2006-01-02 15:04",
		"2006-01-02",
	}
	for _, layout := range layouts {
		if parsed, err := time.Parse(layout, value); err == nil {
			return parsed, nil
		}
	}
	return time.Time{}, fmt.Errorf("unsupported basic suffix profile datetime literal '%s'", value)
}

func applyBasicNumberSuffix(raw string, suffix string) (any, error) {
	if suffix == "" {
		if strings.Contains(raw, ".") || strings.Contains(raw, "e") || strings.Contains(raw, "E") {
			return strconv.ParseFloat(raw, 64)
		}
		return strconv.ParseInt(raw, 10, 64)
	}

	if strings.Contains(raw, ".") || strings.Contains(raw, "e") || strings.Contains(raw, "E") {
		baseValue, err := strconv.ParseFloat(raw, 64)
		if err != nil {
			return nil, err
		}
		return applyBasicFloatSuffix(baseValue, suffix)
	}

	baseValue, err := strconv.ParseInt(raw, 10, 64)
	if err != nil {
		return nil, err
	}
	switch suffix {
	case "k":
		return baseValue * 1_000, nil
	case "M":
		return baseValue * 1_000_000, nil
	case "G":
		return baseValue * 1_000_000_000, nil
	case "T":
		return baseValue * 1_000_000_000_000, nil
	case "P":
		return baseValue * 1_000_000_000_000_000, nil
	case "E":
		return baseValue * 1_000_000_000_000_000_000, nil
	default:
		return applyBasicFloatSuffix(float64(baseValue), suffix)
	}
}

func applyBasicFloatSuffix(baseValue float64, suffix string) (float64, error) {
	switch suffix {
	case "k":
		return baseValue * 1e3, nil
	case "M":
		return baseValue * 1e6, nil
	case "G":
		return baseValue * 1e9, nil
	case "T":
		return baseValue * 1e12, nil
	case "P":
		return baseValue * 1e15, nil
	case "E":
		return baseValue * 1e18, nil
	case "pi":
		return baseValue * 3.141592653589793, nil
	case "tau":
		return baseValue * 6.283185307179586, nil
	case "deg":
		return baseValue * 0.017453292519943295, nil
	case "e":
		return baseValue * 2.718281828459045, nil
	default:
		return 0, fmt.Errorf("unsupported basic suffix profile numeric suffix '%s'", suffix)
	}
}

func isSuffixIdentifier(value string) bool {
	if value == "" {
		return false
	}
	first := value[0]
	if !((first >= 'A' && first <= 'Z') || (first >= 'a' && first <= 'z') || first == '_') {
		return false
	}
	for i := 1; i < len(value); i++ {
		ch := value[i]
		if !((ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9') || ch == '_') {
			return false
		}
	}
	return true
}
