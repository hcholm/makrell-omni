package formats

import (
	"os"
	"path/filepath"
	"reflect"
	"testing"
	"time"
)

func TestParseMronFixture(t *testing.T) {
	value, err := ParseMronFile(fixturePath("mron", "sample.mron"))
	if err != nil {
		t.Fatalf("ParseMronFile failed: %v", err)
	}

	expected := map[string]any{
		"name":     "Makrell",
		"features": []any{"comments", "trailing commas", "typed scalars"},
		"stable":   false,
	}
	if !reflect.DeepEqual(expected, value) {
		t.Fatalf("unexpected MRON fixture value: %#v", value)
	}
}

func TestMronIdentifiersAreStringsEverywhere(t *testing.T) {
	value, err := ParseMronString("title Makrell tags [alpha beta gamma] nested { kind article status draft }")
	if err != nil {
		t.Fatalf("ParseMronString failed: %v", err)
	}
	expected := map[string]any{
		"title":  "Makrell",
		"tags":   []any{"alpha", "beta", "gamma"},
		"nested": map[string]any{"kind": "article", "status": "draft"},
	}
	if !reflect.DeepEqual(expected, value) {
		t.Fatalf("unexpected MRON identifier parsing: %#v", value)
	}
}

func TestParseMrmlFixtureAndWrite(t *testing.T) {
	root, err := ParseMrmlFile(fixturePath("mrml", "sample.mrml"))
	if err != nil {
		t.Fatalf("ParseMrmlFile failed: %v", err)
	}
	if root.Name != "page" {
		t.Fatalf("unexpected MRML root name: %s", root.Name)
	}
	if root.Attributes["lang"] != "en" {
		t.Fatalf("unexpected MRML lang attribute: %#v", root.Attributes)
	}
	xml, err := WriteMrmlString(root)
	if err != nil {
		t.Fatalf("WriteMrmlString failed: %v", err)
	}
	expected := `<page lang="en"><title>Makrell</title><p>A small MRML fixture.</p></page>`
	if xml != expected {
		t.Fatalf("unexpected MRML xml: %s", xml)
	}
}

func TestParseMrtdFixtureAndIdentifiers(t *testing.T) {
	document, err := ParseMrtdFile(fixturePath("mrtd", "sample.mrtd"))
	if err != nil {
		t.Fatalf("ParseMrtdFile failed: %v", err)
	}
	if len(document.Columns) != 3 {
		t.Fatalf("unexpected MRTD column count: %d", len(document.Columns))
	}
	expectedRecords := []map[string]any{
		{"name": "Ada", "age": int64(32), "active": true},
		{"name": "Ben", "age": int64(41), "active": false},
	}
	if !reflect.DeepEqual(expectedRecords, document.Records) {
		t.Fatalf("unexpected MRTD records: %#v", document.Records)
	}

	conformanceMron, err := ParseMronString(readFixture(t, "conformance/mron", "comments-and-identifiers.mron"))
	if err != nil {
		t.Fatalf("ParseMronString failed: %v", err)
	}
	expectedConformanceMron := map[string]any{
		"name":     "Makrell",
		"features": []any{"comments", "typed_scalars"},
		"stable":   false,
	}
	if !reflect.DeepEqual(expectedConformanceMron, conformanceMron) {
		t.Fatalf("unexpected MRON conformance value: %#v", conformanceMron)
	}

	blockCommentMron, err := ParseMronString(readFixture(t, "conformance/mron", "block-comments.mron"))
	if err != nil {
		t.Fatalf("ParseMronString block comment fixture failed: %v", err)
	}
	if !reflect.DeepEqual(expectedConformanceMron, blockCommentMron) {
		t.Fatalf("unexpected block-comment MRON value: %#v", blockCommentMron)
	}

	negativeMron, err := ParseMronString(readFixture(t, "conformance/mron", "negative-numbers.mron"))
	if err != nil {
		t.Fatalf("ParseMronString negative fixture failed: %v", err)
	}
	expectedNegativeMron := map[string]any{
		"temps":  []any{int64(-1), int64(0), -3.5},
		"offset": int64(-2),
	}
	if !reflect.DeepEqual(expectedNegativeMron, negativeMron) {
		t.Fatalf("unexpected negative MRON value: %#v", negativeMron)
	}

	identifiers, err := ParseMrtdString(readFixture(t, "conformance/mrtd", "untyped-headers.mrtd"))
	if err != nil {
		t.Fatalf("ParseMrtdString failed: %v", err)
	}
	if identifiers.Records[0]["status"] != "active" || identifiers.Records[1]["note"] != "review" {
		t.Fatalf("identifier strings were not preserved: %#v", identifiers.Records)
	}
	if identifiers.Columns[1].Type != nil || identifiers.Columns[2].Type != nil {
		t.Fatalf("expected untyped headers to remain untyped: %#v", identifiers.Columns)
	}

	negativeTable, err := ParseMrtdString(readFixture(t, "conformance/mrtd", "negative-numbers.mrtd"))
	if err != nil {
		t.Fatalf("ParseMrtdString negative fixture failed: %v", err)
	}
	expectedNegativeRecords := []map[string]any{
		{"delta": int64(-2), "ratio": -3.5},
		{"delta": int64(4), "ratio": 0.25},
	}
	if !reflect.DeepEqual(expectedNegativeRecords, negativeTable.Records) {
		t.Fatalf("unexpected negative MRTD records: %#v", negativeTable.Records)
	}

	blockCommentTable, err := ParseMrtdString(readFixture(t, "conformance/mrtd", "block-comments.mrtd"))
	if err != nil {
		t.Fatalf("ParseMrtdString block comment fixture failed: %v", err)
	}
	expectedBlockCommentRecords := []map[string]any{
		{"name": "Ada", "status": "active", "note": "draft"},
		{"name": "Ben", "status": "inactive", "note": "review"},
	}
	if !reflect.DeepEqual(expectedBlockCommentRecords, blockCommentTable.Records) {
		t.Fatalf("unexpected block-comment MRTD records: %#v", blockCommentTable.Records)
	}

	baseSuffixMron, err := ParseMronString(readFixture(t, "conformance/mron", "base-suffixes.mron"))
	if err != nil {
		t.Fatalf("ParseMronString base-suffix fixture failed: %v", err)
	}
	expectedSuffixMron := map[string]any{
		"when":  time.Date(2026, 4, 11, 0, 0, 0, 0, time.UTC),
		"bits":  int64(10),
		"octal": int64(15),
		"mask":  int64(255),
		"bonus": int64(3000),
		"scale": int64(2000000),
		"turn":  3.141592653589793,
		"angle": 3.141592653589793,
		"half":  1.5707963267948966,
	}
	if !reflect.DeepEqual(expectedSuffixMron, baseSuffixMron) {
		t.Fatalf("unexpected suffix MRON value: %#v", baseSuffixMron)
	}

	baseSuffixMrtd, err := ParseMrtdString(readFixture(t, "conformance/mrtd", "base-suffixes.mrtd"))
	if err != nil {
		t.Fatalf("ParseMrtdString base-suffix fixture failed: %v", err)
	}
	expectedSuffixMrtd := []map[string]any{
		{
			"when":  time.Date(2026, 4, 11, 0, 0, 0, 0, time.UTC),
			"bits":  int64(10),
			"octal": int64(15),
			"mask":  int64(255),
			"bonus": int64(3000),
			"scale": int64(2000000),
			"turn":  3.141592653589793,
			"angle": 3.141592653589793,
			"half":  1.5707963267948966,
		},
	}
	if !reflect.DeepEqual(expectedSuffixMrtd, baseSuffixMrtd.Records) {
		t.Fatalf("unexpected suffix MRTD records: %#v", baseSuffixMrtd.Records)
	}
}

func TestWriteMrtdString(t *testing.T) {
	document := MrtdDocument{
		Columns: []MrtdColumn{
			{Name: "name", Type: stringPtr("string")},
			{Name: "age", Type: stringPtr("int")},
			{Name: "active", Type: stringPtr("bool")},
		},
		Rows: [][]any{
			{"Ada", 32, true},
			{"Ben", 41, false},
		},
	}
	text, err := WriteMrtdString(document)
	if err != nil {
		t.Fatalf("WriteMrtdString failed: %v", err)
	}
	expected := "name:string age:int active:bool\nAda 32 true\nBen 41 false"
	if text != expected {
		t.Fatalf("unexpected MRTD output: %s", text)
	}
}

func TestBasicSuffixProfileIsExposedAsDirectPostL1ConversionLayer(t *testing.T) {
	dateValue, err := ApplyBasicSuffixProfile(BasicSuffixLiteral{
		Kind:   BasicSuffixString,
		Value:  "2026-04-11",
		Suffix: "dt",
	})
	if err != nil {
		t.Fatalf("ApplyBasicSuffixProfile string failed: %v", err)
	}
	numberValue, err := ApplyBasicSuffixProfile(BasicSuffixLiteral{
		Kind:   BasicSuffixNumber,
		Value:  "3",
		Suffix: "k",
	})
	if err != nil {
		t.Fatalf("ApplyBasicSuffixProfile number failed: %v", err)
	}

	if !reflect.DeepEqual(dateValue, time.Date(2026, 4, 11, 0, 0, 0, 0, time.UTC)) {
		t.Fatalf("unexpected date value: %#v", dateValue)
	}
	if numberValue != int64(3000) {
		t.Fatalf("unexpected scaled value: %#v", numberValue)
	}

	raw, suffix, ok := SplitNumericLiteralSuffix("0.5tau")
	if !ok || raw != "0.5" || suffix != "tau" {
		t.Fatalf("unexpected numeric split: raw=%q suffix=%q ok=%v", raw, suffix, ok)
	}
}

func TestParseMrtdRejectsUnsupportedTypes(t *testing.T) {
	if _, err := ParseMrtdString("name:date\nAda"); err == nil {
		t.Fatalf("expected unsupported type error")
	}
}

func fixturePath(group string, file string) string {
	return filepath.Join("..", "..", "shared", "format-fixtures", group, file)
}

func readFixture(t *testing.T, group string, file string) string {
	t.Helper()
	data, err := os.ReadFile(fixturePath(group, file))
	if err != nil {
		t.Fatalf("ReadFile failed: %v", err)
	}
	return string(data)
}

func stringPtr(value string) *string {
	return &value
}

func TestHyphenatedBarewordsAreRejected(t *testing.T) {
	if _, err := ParseMronString(readFixture(t, "conformance/mron", "hyphenated-bareword.invalid.mron")); err == nil {
		t.Fatalf("expected MRON hyphenated bareword to fail")
	}
	if _, err := ParseMronString(readFixture(t, "conformance/mron", "unclosed-array.invalid.mron")); err == nil {
		t.Fatalf("expected MRON unclosed array to fail")
	}
	if _, err := ParseMrtdString(readFixture(t, "conformance/mrtd", "hyphenated-bareword.invalid.mrtd")); err == nil {
		t.Fatalf("expected MRTD hyphenated bareword to fail")
	}
}
