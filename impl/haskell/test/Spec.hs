module Main where

import Makrell.Formats
import qualified Data.Map.Strict as Map

fixture :: FilePath -> FilePath -> FilePath
fixture group file = "..\\..\\shared\\format-fixtures\\" ++ group ++ "\\" ++ file

assert :: Bool -> String -> IO ()
assert cond msg = if cond then pure () else error msg

main :: IO ()
main = do
  let MObject mron = parseMronFile (fixture "mron" "sample.mron")
  assert (Map.lookup "name" mron == Just (MString "Makrell")) "MRON fixture failed"
  let MObject iddoc = parseMronString "title Makrell tags [alpha beta gamma] nested { kind article status draft }"
  assert (Map.lookup "title" iddoc == Just (MString "Makrell")) "MRON identifiers failed"

  let mrml = parseMrmlFile (fixture "mrml" "sample.mrml")
  assert (mrmlName mrml == "page") "MRML fixture failed"
  assert (writeMrmlString mrml == "<page lang=\"en\"><title>Makrell</title><p>A small MRML fixture.</p></page>") "MRML writer failed"

  let mrtd = parseMrtdFile (fixture "mrtd" "sample.mrtd")
  assert (length (mrtdColumns mrtd) == 3) "MRTD fixture failed"
  let idtable = parseMrtdString "name:string status note\nAda active draft\nBen inactive review"
  assert (lookup "status" (mrtdRecords idtable !! 0) == Just (TString "active")) "MRTD identifiers failed"

  let doc = MrtdDocument [MrtdColumn "name" "string", MrtdColumn "age" "int", MrtdColumn "active" "bool"] [[TString "Ada", TInt 32, TBool True]]
  assert (writeMrtdString doc == "name:string age:int active:bool\nAda 32 true") "MRTD writer failed"

  putStrLn "Haskell smoke tests passed."
