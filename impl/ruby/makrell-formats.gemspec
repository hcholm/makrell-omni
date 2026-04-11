Gem::Specification.new do |spec|
  spec.name = "makrell-formats"
  spec.version = "0.10.0"
  spec.summary = "MRON, MRML, and MRTD support for Ruby"
  spec.authors = ["Makrell contributors"]
  spec.email = ["opensource@makrell.dev"]
  spec.required_ruby_version = ">= 3.0"
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
  spec.metadata = {
    "homepage_uri" => "https://makrell.dev",
    "source_code_uri" => "https://github.com/hcholm/makrell-omni",
    "changelog_uri" => "https://github.com/hcholm/makrell-omni/releases/tag/v0.10.0"
  }
end
