package formats

import (
	"path/filepath"
	"reflect"
	"testing"
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
		{"name": "Ada", "age": 32, "active": true},
		{"name": "Ben", "age": 41, "active": false},
	}
	if !reflect.DeepEqual(expectedRecords, document.Records) {
		t.Fatalf("unexpected MRTD records: %#v", document.Records)
	}

	identifiers, err := ParseMrtdString("name:string status note\nAda active draft\nBen inactive review")
	if err != nil {
		t.Fatalf("ParseMrtdString failed: %v", err)
	}
	if identifiers.Records[0]["status"] != "active" || identifiers.Records[1]["note"] != "review" {
		t.Fatalf("identifier strings were not preserved: %#v", identifiers.Records)
	}
}

func TestWriteMrtdString(t *testing.T) {
	document := MrtdDocument{
		Columns: []MrtdColumn{
			{Name: "name", Type: "string"},
			{Name: "age", Type: "int"},
			{Name: "active", Type: "bool"},
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

func TestParseMrtdRejectsUnsupportedTypes(t *testing.T) {
	if _, err := ParseMrtdString("name:date\nAda"); err == nil {
		t.Fatalf("expected unsupported type error")
	}
}

func fixturePath(group string, file string) string {
	return filepath.Join("..", "..", "shared", "format-fixtures", group, file)
}

func TestHyphenatedBarewordsAreRejected(t *testing.T) {
	if _, err := ParseMronString("name trailing-commas"); err == nil {
		t.Fatalf("expected MRON hyphenated bareword to fail")
	}
	if _, err := ParseMrtdString("name:string\ntrailing-commas"); err == nil {
		t.Fatalf("expected MRTD hyphenated bareword to fail")
	}
}
