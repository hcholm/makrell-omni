module Makrell.Formats
  ( MronValue(..)
  , MrmlElement(..)
  , MrtdColumn(..)
  , MrtdCell(..)
  , MrtdDocument(..)
  , mrtdRecords
  , parseMronString
  , parseMronFile
  , writeMronString
  , parseMrmlString
  , parseMrmlFile
  , writeMrmlString
  , parseMrtdString
  , parseMrtdFile
  , writeMrtdString
  ) where

import qualified Data.Char as Char
import qualified Data.List as List
import qualified Data.Map.Strict as Map
import System.IO.Unsafe (unsafePerformIO)

data MronValue
  = MNull
  | MBool Bool
  | MInt Integer
  | MFloat Double
  | MString String
  | MArray [MronValue]
  | MObject (Map.Map String MronValue)
  deriving (Eq, Show)

data MrmlElement = MrmlElement
  { mrmlName :: String
  , mrmlAttributes :: Map.Map String String
  , mrmlChildren :: [Either String MrmlElement]
  } deriving (Eq, Show)

data MrtdColumn = MrtdColumn { columnName :: String, columnType :: String } deriving (Eq, Show)
data MrtdCell = TString String | TInt Integer | TFloat Double | TBool Bool deriving (Eq, Show)
data MrtdDocument = MrtdDocument { mrtdColumns :: [MrtdColumn], mrtdRows :: [[MrtdCell]] } deriving (Eq, Show)

mrtdRecords :: MrtdDocument -> [[(String, MrtdCell)]]
mrtdRecords doc = map (\row -> zip (map columnName (mrtdColumns doc)) row) (mrtdRows doc)

data Token = Token { tokenKind :: String, tokenText :: String, tokenQuoted :: Bool } deriving Show
data Node = Scalar String Bool | Brace [Node] | Square [Node] | Paren [Node] deriving Show

parseMronString :: String -> MronValue
parseMronString source =
  case parseNodes source of
    [] -> MNull
    [node] -> convertMron node
    nodes -> MObject (convertPairs nodes)

parseMronFile :: FilePath -> MronValue
parseMronFile = parseMronString . unsafePerformIO . readFile

writeMronString :: MronValue -> String
writeMronString MNull = "null"
writeMronString (MBool True) = "true"
writeMronString (MBool False) = "false"
writeMronString (MInt value) = show value
writeMronString (MFloat value) = show value
writeMronString (MString value) = if identifierLike value then value else quote value
writeMronString (MArray items) = "[" ++ List.intercalate " " (map writeMronString items) ++ "]"
writeMronString (MObject items) = "{ " ++ List.intercalate " " [quoteIfNeeded key ++ " " ++ writeMronString value | (key, value) <- Map.toList items] ++ " }"

parseMrmlString :: String -> MrmlElement
parseMrmlString source =
  case parseNodes source of
    [Brace children] -> parseElement children
    _ -> error "MRML expects exactly one root element"

parseMrmlFile :: FilePath -> MrmlElement
parseMrmlFile = parseMrmlString . unsafePerformIO . readFile

writeMrmlString :: MrmlElement -> String
writeMrmlString element =
  let attrs = concatMap (\(k, v) -> " " ++ k ++ "=\"" ++ escapeXml v ++ "\"") (Map.toList (mrmlAttributes element))
      children = concatMap (\child -> either escapeXml writeMrmlString child) (mrmlChildren element)
  in if null (mrmlChildren element)
        then "<" ++ mrmlName element ++ attrs ++ "/>"
        else "<" ++ mrmlName element ++ attrs ++ ">" ++ children ++ "</" ++ mrmlName element ++ ">"

parseMrtdString :: String -> MrtdDocument
parseMrtdString source =
  let lines' = filter (\line -> not (null line) && head line /= '#') $ map trim $ lines source
  in case lines' of
       [] -> MrtdDocument [] []
       header:rows ->
         let columns = map parseColumn (parseNodes header)
         in MrtdDocument columns (map (parseRow columns) rows)

parseMrtdFile :: FilePath -> MrtdDocument
parseMrtdFile = parseMrtdString . unsafePerformIO . readFile

writeMrtdString :: MrtdDocument -> String
writeMrtdString doc =
  let header = List.intercalate " " [quoteIfNeeded (columnName c) ++ ":" ++ columnType c | c <- mrtdColumns doc]
      rows = map (List.intercalate " " . map writeCell) (mrtdRows doc)
  in List.intercalate "\n" (header : rows)

parseNodes :: String -> [Node]
parseNodes source = go (tokenise source)
  where
    go [] = []
    go tokens = let (node, rest) = parseNode tokens in node : go rest

    parseNode (Token kind text quoted : rest)
      | kind == "scalar" || kind == "=" = (Scalar text quoted, rest)
      | kind == "{" = let (items, tail') = parseGroup "}" rest in (Brace items, tail')
      | kind == "[" = let (items, tail') = parseGroup "]" rest in (Square items, tail')
      | otherwise = let (items, tail') = parseGroup ")" rest in (Paren items, tail')
    parseNode [] = error "Unexpected end of input"

    parseGroup closing tokens =
      case tokens of
        [] -> error "Unclosed group"
        Token kind _ _ : rest | kind == closing -> ([], rest)
        _ -> let (node, rest) = parseNode tokens
                 (next, tail') = parseGroup closing rest
             in (node : next, tail')

tokenise :: String -> [Token]
tokenise [] = []
tokenise (c:cs)
  | Char.isSpace c || c == ',' = tokenise cs
  | c == '#' = tokenise (dropWhile (/= '\n') cs)
  | c == '/' && not (null cs) && head cs == '/' = tokenise (dropWhile (/= '\n') (tail cs))
  | c `elem` "{}[]()=" = Token [c] [c] False : tokenise cs
  | c == '"' = let (text, rest) = spanQuoted cs in Token "scalar" text True : tokenise rest
  | otherwise = let (text, rest) = span (\x -> not (Char.isSpace x) && notElem x "{}[]()=,#\"-") (c:cs)
                in Token "scalar" text False : tokenise rest

spanQuoted :: String -> (String, String)
spanQuoted = go []
  where
    go acc [] = (reverse acc, [])
    go acc ('\\':'n':rest) = go ('\n':acc) rest
    go acc ('\\':'r':rest) = go ('\r':acc) rest
    go acc ('\\':'t':rest) = go ('\t':acc) rest
    go acc ('\\':x:rest) = go (x:acc) rest
    go acc ('"':rest) = (reverse acc, rest)
    go acc (x:rest) = go (x:acc) rest

convertScalar :: String -> Bool -> MronValue
convertScalar text quoted
  | quoted = MString text
  | text == "null" = MNull
  | text == "true" = MBool True
  | text == "false" = MBool False
  | allInt text = MInt (read text)
  | allFloat text = MFloat (read text)
  | otherwise = MString text

convertMron :: Node -> MronValue
convertMron (Scalar text quoted) = convertScalar text quoted
convertMron (Square children) = MArray (map convertMron children)
convertMron (Brace children) = MObject (convertPairs children)
convertMron (Paren _) = error "Parenthesised nodes are not valid MRON values"

convertPairs :: [Node] -> Map.Map String MronValue
convertPairs [] = Map.empty
convertPairs (key:value:rest) = Map.insert (asKey (convertMron key)) (convertMron value) (convertPairs rest)
convertPairs _ = error "Odd pair count in MRON object"

asKey :: MronValue -> String
asKey (MString text) = text
asKey (MBool True) = "true"
asKey (MBool False) = "false"
asKey (MInt value) = show value
asKey (MFloat value) = show value
asKey MNull = "null"
asKey _ = "[complex]"

parseElement :: [Node] -> MrmlElement
parseElement (Scalar name _ : rest) =
  let (attributes, children) = case rest of
        Square attrs : xs -> (parseAttributes attrs, xs)
        xs -> (Map.empty, xs)
  in MrmlElement name attributes (map parseChild children)
parseElement _ = error "Invalid MRML element"

parseAttributes :: [Node] -> Map.Map String String
parseAttributes [] = Map.empty
parseAttributes (Scalar key _ : Scalar "=" _ : Scalar value _ : rest) = Map.insert key value (parseAttributes rest)
parseAttributes (Scalar key _ : Scalar value _ : rest) = Map.insert key value (parseAttributes rest)
parseAttributes _ = error "Invalid MRML attribute list"

parseChild :: Node -> Either String MrmlElement
parseChild (Brace children) = Right (parseElement children)
parseChild (Scalar text _) = Left text
parseChild _ = error "Unsupported MRML child node"

parseColumn :: Node -> MrtdColumn
parseColumn (Scalar text _) =
  let (name, rest) = break (== ':') text
  in MrtdColumn name (if null rest then "string" else tail rest)
parseColumn _ = error "Invalid MRTD header field"

parseRow :: [MrtdColumn] -> String -> [MrtdCell]
parseRow columns line =
  let stripped = if not (null line) && head line == '(' && last line == ')' then init (tail line) else line
      cells = parseNodes stripped
  in zipWith convertCell columns cells

convertCell :: MrtdColumn -> Node -> MrtdCell
convertCell column (Scalar text quoted) =
  let value = convertScalar text quoted
  in case columnType column of
       "string" -> TString (asKey value)
       "int" -> case value of MInt v -> TInt v; _ -> error "MRTD value does not match int field"
       "float" -> case value of MInt v -> TFloat (fromInteger v); MFloat v -> TFloat v; _ -> error "MRTD value does not match float field"
       "bool" -> case value of MBool v -> TBool v; _ -> error "MRTD value does not match bool field"
       other -> error ("Unsupported MRTD field type: " ++ other)
convertCell _ _ = error "MRTD cells must be scalar values"

writeCell :: MrtdCell -> String
writeCell (TString text) = quoteIfNeeded text
writeCell (TInt value) = show value
writeCell (TFloat value) = show value
writeCell (TBool True) = "true"
writeCell (TBool False) = "false"

quoteIfNeeded :: String -> String
quoteIfNeeded text = if identifierLike text then text else quote text

quote :: String -> String
quote text = "\"" ++ concatMap (\c -> if c == '\\' || c == '"' then ['\\', c] else [c]) text ++ "\""

identifierLike :: String -> Bool
identifierLike [] = False
identifierLike (x:xs) = (Char.isAlpha x || x == '_') && all (\c -> Char.isAlphaNum c || c == '_') xs

allInt :: String -> Bool
allInt [] = False
allInt ('-':xs) = all (Char.isDigit) xs
allInt xs = all Char.isDigit xs

allFloat :: String -> Bool
allFloat text = case break (== '.') text of
  (lhs, '.':rhs) -> allInt lhs && all Char.isDigit rhs && not (null rhs)
  _ -> False

escapeXml :: String -> String
escapeXml = concatMap escape
  where
    escape '&' = "&amp;"
    escape '<' = "&lt;"
    escape '>' = "&gt;"
    escape '"' = "&quot;"
    escape c = [c]

trim :: String -> String
trim = reverse . dropWhile Char.isSpace . reverse . dropWhile Char.isSpace
