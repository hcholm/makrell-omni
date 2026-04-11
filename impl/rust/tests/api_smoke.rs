use makrell_formats::mron::{self, MronValue};
use makrell_formats::mrml::{self, MrmlChild, MrmlElement};
use makrell_formats::mrtd::{self, MrtdDocument, MrtdValue};
use std::collections::BTreeMap;
use std::path::PathBuf;

#[test]
fn mron_parses_shared_fixture() {
    let value = mron::parse_file(fixture_path("mron/sample.mron")).unwrap();
    let MronValue::Object(map) = value else {
        panic!("expected object");
    };
    assert_eq!(map.get("name"), Some(&MronValue::String("Makrell".into())));
    assert_eq!(map.get("stable"), Some(&MronValue::Bool(false)));
}

#[test]
fn mron_treats_identifiers_as_string_values_everywhere() {
    let value = mron::parse_string(
        "title Makrell tags [alpha beta gamma] nested { kind article status draft }",
    )
    .unwrap();
    let MronValue::Object(map) = value else {
        panic!("expected object");
    };
    assert_eq!(map.get("title"), Some(&MronValue::String("Makrell".into())));
}

#[test]
fn mrml_parses_and_writes_fixture_shape() {
    let root = mrml::parse_file(fixture_path("mrml/sample.mrml")).unwrap();
    assert_eq!(root.name, "page");
    assert_eq!(root.attributes.get("lang"), Some(&"en".to_string()));
    assert!(matches!(root.children[0], MrmlChild::Element(ref el) if el.name == "title"));
    assert_eq!(
        mrml::write_string(&root).unwrap(),
        "<page lang=\"en\"><title>Makrell</title><p>A small MRML fixture.</p></page>"
    );
}

#[test]
fn mrtd_parses_shared_fixture_and_identifier_strings() {
    let doc = mrtd::parse_file(fixture_path("mrtd/sample.mrtd")).unwrap();
    assert_eq!(doc.columns.len(), 3);
    assert_eq!(doc.rows[0][0], MrtdValue::String("Ada".into()));

    let doc = mrtd::parse_string("name:string status note\nAda active draft\nBen inactive review").unwrap();
    assert_eq!(doc.rows[0][1], MrtdValue::String("active".into()));
    assert_eq!(doc.rows[1][2], MrtdValue::String("review".into()));
}

#[test]
fn mrtd_writes_document() {
    let doc = MrtdDocument {
        columns: vec![
            makrell_formats::mrtd::MrtdColumn {
                name: "name".into(),
                r#type: "string".into(),
            },
            makrell_formats::mrtd::MrtdColumn {
                name: "age".into(),
                r#type: "int".into(),
            },
            makrell_formats::mrtd::MrtdColumn {
                name: "active".into(),
                r#type: "bool".into(),
            },
        ],
        rows: vec![
            vec![
                MrtdValue::String("Ada".into()),
                MrtdValue::Int(32),
                MrtdValue::Bool(true),
            ],
            vec![
                MrtdValue::String("Ben".into()),
                MrtdValue::Int(41),
                MrtdValue::Bool(false),
            ],
        ],
    };
    assert_eq!(
        mrtd::write_string(&doc).unwrap(),
        "name:string age:int active:bool\nAda 32 true\nBen 41 false"
    );
}

#[test]
fn mrml_writes_escaped_text() {
    let root = MrmlElement {
        name: "a".into(),
        attributes: BTreeMap::from([("title".into(), "x & \"y\"".into())]),
        children: vec![MrmlChild::Text("1 < 2 & 3".into())],
    };
    assert_eq!(
        mrml::write_string(&root).unwrap(),
        "<a title=\"x &amp; &quot;y&quot;\">1 &lt; 2 &amp; 3</a>"
    );
}

fn fixture_path(relative: &str) -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join("..")
        .join("shared")
        .join("format-fixtures")
        .join(relative)
}
