import "package:makrell_formats/makrell_formats.dart";

void main() {
  final mron = Mron.parseString('name "Makrell" stable false');
  print(mron);

  final mrml = Mrml.parseString('{page [lang="en"] {title "Makrell"} {p "Hello from Dart"}}');
  print(Mrml.writeString(mrml));

  final mrtd = Mrtd.parseString('''
    name:string age:int active:bool
    Ada 32 true
    Ben 41 false
  ''');
  print(mrtd.records);
}
