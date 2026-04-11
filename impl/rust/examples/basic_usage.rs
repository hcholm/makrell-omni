fn main() {
    let result = makrell_formats::mron::parse_string(
        "name Makrell features [comments trailing-commas typed-scalars] stable false",
    )
    .unwrap();
    println!("{result:?}");
}
