Gem::Specification.new do |spec|
  spec.name = "makrell-formats"
  spec.version = "0.1.0"
  spec.summary = "MRON, MRML, and MRTD support for Ruby"
  spec.authors = ["Makrell contributors"]
  spec.email = ["opensource@makrell.dev"]
  spec.files = Dir[
    "lib/**/*.rb",
    "test/**/*.rb",
    "examples/**/*.rb",
    "README.md",
    "LICENSE"
  ]
  spec.require_paths = ["lib"]
  spec.license = "MIT"
  spec.homepage = "https://makrell.dev"
end
