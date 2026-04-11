module Main where

import Control.Exception (SomeException, evaluate, try)
import Makrell.Formats
import qualified Data.Map.Strict as Map

fixture :: FilePath -> FilePath -> FilePath
fixture group file = "..\\..\\shared\\format-fixtures\\" ++ group ++ "\\" ++ file

readFixture :: FilePath -> FilePath -> IO String
readFixture group file = readFile (fixture group file)

assert :: Bool -> String -> IO ()
assert cond msg = if cond then pure () else error msg

main :: IO ()
main = do
  let MObject mron = parseMronFile (fixture "mron" "sample.mron")
  assert (Map.lookup "name" mron == Just (MString "Makrell")) "MRON fixture failed"
  let MObject iddoc = parseMronString "title Makrell tags [alpha beta gamma] nested { kind article status draft }"
  assert (Map.lookup "title" iddoc == Just (MString "Makrell")) "MRON identifiers failed"
  conformanceText <- readFixture "conformance\\mron" "comments-and-identifiers.mron"
  let MObject conformanceMron = parseMronString conformanceText
  assert (Map.lookup "name" conformanceMron == Just (MString "Makrell")) "Conformance MRON failed"
  blockCommentText <- readFixture "conformance\\mron" "block-comments.mron"
  let MObject blockCommentMron = parseMronString blockCommentText
  assert (Map.lookup "name" blockCommentMron == Just (MString "Makrell")) "Block-comment MRON failed"

  let mrml = parseMrmlFile (fixture "mrml" "sample.mrml")
  assert (mrmlName mrml == "page") "MRML fixture failed"
  assert (writeMrmlString mrml == "<page lang=\"en\"><title>Makrell</title><p>A small MRML fixture.</p></page>") "MRML writer failed"

  let mrtd = parseMrtdFile (fixture "mrtd" "sample.mrtd")
  assert (length (mrtdColumns mrtd) == 3) "MRTD fixture failed"
  untypedText <- readFixture "conformance\\mrtd" "untyped-headers.mrtd"
  let idtable = parseMrtdString untypedText
  assert (lookup "status" (mrtdRecords idtable !! 0) == Just (TString "active")) "MRTD identifiers failed"
  assert (columnType (mrtdColumns idtable !! 1) == Nothing) "MRTD untyped header failed"
  blockCommentMrtdText <- readFixture "conformance\\mrtd" "block-comments.mrtd"
  let blockCommentTable = parseMrtdString blockCommentMrtdText
  assert (lookup "status" (mrtdRecords blockCommentTable !! 0) == Just (TString "active")) "Block-comment MRTD failed"

  let doc = MrtdDocument [MrtdColumn "name" (Just "string"), MrtdColumn "age" (Just "int"), MrtdColumn "active" (Just "bool")] [[TString "Ada", TInt 32, TBool True]]
  assert (writeMrtdString doc == "name:string age:int active:bool\nAda 32 true") "MRTD writer failed"
  let untypedDoc = MrtdDocument [MrtdColumn "name" Nothing, MrtdColumn "status" Nothing] [[TString "Ada", TString "active"]]
  assert (writeMrtdString untypedDoc == "name status\nAda active") "MRTD untyped writer failed"

  invalidMronText <- readFixture "conformance\\mron" "hyphenated-bareword.invalid.mron"
  invalidMrtdText <- readFixture "conformance\\mrtd" "hyphenated-bareword.invalid.mrtd"
  invalidMron <- try (evaluate (length (show (parseMronString invalidMronText)))) :: IO (Either SomeException Int)
  invalidMrtd <- try (evaluate (length (show (parseMrtdString invalidMrtdText)))) :: IO (Either SomeException Int)
  assert (either (const True) (const False) invalidMron) "MRON hyphen rejection failed"
  assert (either (const True) (const False) invalidMrtd) "MRTD hyphen rejection failed"

  putStrLn "Haskell smoke tests passed."
