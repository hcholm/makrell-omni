package main

import (
	"fmt"

	"github.com/makrell/makrell-go/formats"
)

func main() {
	doc, err := formats.ParseMronString(`name Makrell features [comments trailing-commas typed-scalars] stable false`)
	if err != nil {
		panic(err)
	}
	fmt.Printf("%#v\n", doc)
}
