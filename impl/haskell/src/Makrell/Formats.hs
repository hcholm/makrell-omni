module Makrell.Formats
  ( MronValue(..)
  , MrmlElement(..)
  , MrtdColumn(..)
  , MrtdCell(..)
  , MrtdDocument(..)
  , BasicSuffixLiteralKind(..)
  , BasicSuffixValue(..)
  , applyBasicSuffixProfile
  , splitNumericLiteralSuffix
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
  | MTaggedString String String
  | MArray [MronValue]
  | MObject (Map.Map String MronValue)
  deriving (Eq, Show)

data MrmlElement = MrmlElement
  { mrmlName :: String
  , mrmlAttributes :: Map.Map String String
  , mrmlChildren :: [Either String MrmlElement]
  } deriving (Eq, Show)

data MrtdColumn = MrtdColumn { columnName :: String, columnType :: Maybe String } deriving (Eq, Show)
data MrtdCell = TString String | TTaggedString String String | TInt Integer | TFloat Double | TBool Bool deriving (Eq, Show)
data MrtdDocument = MrtdDocument { mrtdColumns :: [MrtdColumn], mrtdRows :: [[MrtdCell]] } deriving (Eq, Show)

data BasicSuffixLiteralKind = BasicSuffixString | BasicSuffixNumber deriving (Eq, Show)
data BasicSuffixValue = BSString String | BSTaggedString String String | BSInt Integer | BSFloat Double deriving (Eq, Show)

mrtdRecords :: MrtdDocument -> [[(String, MrtdCell)]]
mrtdRecords doc = map (\row -> zip (map columnName (mrtdColumns doc)) row) (mrtdRows doc)

data Token = Token { tokenKind :: String, tokenText :: String, tokenQuoted :: Bool, tokenSuffix :: String } deriving Show
data Node = Scalar String Bool String | Brace [Node] | Square [Node] | Paren [Node] deriving Show

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
writeMronString (MTaggedString value suffix) = quote value ++ suffix
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
  let lines' = filter (\line -> not (null line) && not (startsWith '#' line)) $ map trim $ lines source
  in case lines' of
       [] -> MrtdDocument [] []
       header:rows ->
         let columns = map parseColumn (parseNodes header)
         in MrtdDocument columns (map (parseRow columns) rows)

parseMrtdFile :: FilePath -> MrtdDocument
parseMrtdFile = parseMrtdString . unsafePerformIO . readFile

writeMrtdString :: MrtdDocument -> String
writeMrtdString doc =
  let renderColumn c = case columnType c of
        Just t -> quoteIfNeeded (columnName c) ++ ":" ++ t
        Nothing -> quoteIfNeeded (columnName c)
      header = List.intercalate " " [renderColumn c | c <- mrtdColumns doc]
      rows = map (List.intercalate " " . map writeCell) (mrtdRows doc)
  in List.intercalate "\n" (header : rows)

parseNodes :: String -> [Node]
parseNodes source = go (tokenise source)
  where
    go [] = []
    go tokens = let (node, rest) = parseNode tokens in node : go rest

    parseNode (Token kind text quoted suffix : rest)
      | kind == "scalar" || kind == "=" = (Scalar text quoted suffix, rest)
      | kind == "{" = let (items, tail') = parseGroup "}" rest in (Brace items, tail')
      | kind == "[" = let (items, tail') = parseGroup "]" rest in (Square items, tail')
      | kind == "(" = let (items, tail') = parseGroup ")" rest in (Paren items, tail')
      | otherwise = error ("Unexpected token: " ++ text)
    parseNode [] = error "Unexpected end of input"

    parseGroup closing tokens =
      case tokens of
        [] -> error "Unclosed group"
        Token kind _ _ _ : rest | kind == closing -> ([], rest)
        _ -> let (node, rest) = parseNode tokens
                 (next, tail') = parseGroup closing rest
             in (node : next, tail')

tokenise :: String -> [Token]
tokenise [] = []
tokenise (c:cs)
  | Char.isSpace c || c == ',' = tokenise cs
  | c == '#' = tokenise (dropWhile (/= '\n') cs)
  | c == '/' && startsWith '/' cs = tokenise (dropWhile (/= '\n') (drop 1 cs))
  | c == '/' && startsWith '*' cs = tokenise (dropBlockComment (drop 1 cs))
  | c `elem` "{}[]()=" = Token [c] [c] False "" : tokenise cs
  | c == '-' && maybe False Char.isDigit (firstChar cs) =
      let (restNum, rest) = span (\x -> Char.isDigit x || x == '.') cs
          (suffix, tail') = span isSuffixChar rest
      in Token "scalar" ('-':restNum) False suffix : tokenise tail'
  | c == '-' = Token "operator" "-" False "" : tokenise cs
  | c == '"' =
      let (text, rest) = spanQuoted cs
          (suffix, tail') = span isSuffixChar rest
      in Token "scalar" text True suffix : tokenise tail'
  | otherwise =
      let (text, rest) = span (\x -> not (Char.isSpace x) && notElem x "{}[]()=,#\"-") (c:cs)
      in case splitNumericLiteralSuffix text of
           Just (value, suffix) -> Token "scalar" value False suffix : tokenise rest
           Nothing -> Token "scalar" text False "" : tokenise rest

dropBlockComment :: String -> String
dropBlockComment [] = error "Unterminated block comment"
dropBlockComment ('*':'/':rest) = rest
dropBlockComment (_:rest) = dropBlockComment rest

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

splitNumericLiteralSuffix :: String -> Maybe (String, String)
splitNumericLiteralSuffix text =
  let boundaries = reverse [1 .. length text]
      tryBoundary boundary =
        let (value, suffix) = splitAt boundary text
        in if null value || (not (null suffix) && not (isSuffixIdentifier suffix))
              then Nothing
              else if allInt value || allFloat value then Just (value, suffix) else Nothing
  in List.find (/= Nothing) (map tryBoundary boundaries) >>= id

applyBasicSuffixProfile :: BasicSuffixLiteralKind -> String -> String -> BasicSuffixValue
applyBasicSuffixProfile BasicSuffixString value suffix
  | null suffix = BSString value
  | suffix == "dt" = BSTaggedString value suffix
  | suffix == "bin" = BSInt (parseRadix 2 value)
  | suffix == "oct" = BSInt (parseRadix 8 value)
  | suffix == "hex" = BSInt (parseRadix 16 value)
  | otherwise = error ("Unsupported basic suffix profile string suffix '" ++ suffix ++ "'.")
applyBasicSuffixProfile BasicSuffixNumber value suffix
  | null suffix && allInt value = BSInt (read value)
  | null suffix && allFloat value = BSFloat (read value)
  | allInt value =
      case suffix of
        "k" -> BSInt (read value * 1000)
        "M" -> BSInt (read value * 1000000)
        "G" -> BSFloat (fromInteger (read value) * 1e9)
        "T" -> BSFloat (fromInteger (read value) * 1e12)
        "P" -> BSFloat (fromInteger (read value) * 1e15)
        "E" -> BSFloat (fromInteger (read value) * 1e18)
        _ -> applyBasicFloatSuffix (fromInteger (read value)) suffix
  | allFloat value = applyBasicFloatSuffix (read value) suffix
  | otherwise = error ("Invalid basic suffix profile numeric literal '" ++ value ++ "'.")

applyBasicFloatSuffix :: Double -> String -> BasicSuffixValue
applyBasicFloatSuffix base suffix =
  BSFloat $
    case suffix of
      "k" -> base * 1e3
      "M" -> base * 1e6
      "G" -> base * 1e9
      "T" -> base * 1e12
      "P" -> base * 1e15
      "E" -> base * 1e18
      "pi" -> base * pi
      "tau" -> base * (2 * pi)
      "deg" -> base * (pi / 180)
      "e" -> base * exp 1
      _ -> error ("Unsupported basic suffix profile numeric suffix '" ++ suffix ++ "'.")

fromBasicSuffixValue :: BasicSuffixValue -> MronValue
fromBasicSuffixValue (BSString value) = MString value
fromBasicSuffixValue (BSTaggedString value suffix) = MTaggedString value suffix
fromBasicSuffixValue (BSInt value) = MInt value
fromBasicSuffixValue (BSFloat value) = MFloat value

convertScalar :: String -> Bool -> String -> MronValue
convertScalar text quoted suffix
  | quoted = fromBasicSuffixValue (applyBasicSuffixProfile BasicSuffixString text suffix)
  | text == "null" = MNull
  | text == "true" = MBool True
  | text == "false" = MBool False
  | allInt text || allFloat text = fromBasicSuffixValue (applyBasicSuffixProfile BasicSuffixNumber text suffix)
  | otherwise = MString text

convertMron :: Node -> MronValue
convertMron (Scalar text quoted suffix) = convertScalar text quoted suffix
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
asKey (MTaggedString value suffix) = value ++ suffix
asKey MNull = "null"
asKey _ = "[complex]"

parseElement :: [Node] -> MrmlElement
parseElement (Scalar name _ _ : rest) =
  let (attributes, children) = case rest of
        Square attrs : xs -> (parseAttributes attrs, xs)
        xs -> (Map.empty, xs)
  in MrmlElement name attributes (map parseChild children)
parseElement _ = error "Invalid MRML element"

parseAttributes :: [Node] -> Map.Map String String
parseAttributes [] = Map.empty
parseAttributes (Scalar key _ _ : Scalar "=" _ _ : Scalar value _ _ : rest) = Map.insert key value (parseAttributes rest)
parseAttributes (Scalar key _ _ : Scalar value _ _ : rest) = Map.insert key value (parseAttributes rest)
parseAttributes _ = error "Invalid MRML attribute list"

parseChild :: Node -> Either String MrmlElement
parseChild (Brace children) = Right (parseElement children)
parseChild (Scalar text _ _) = Left text
parseChild _ = error "Unsupported MRML child node"

parseColumn :: Node -> MrtdColumn
parseColumn (Scalar text _ _) =
  let (name, rest) = break (== ':') text
  in MrtdColumn name (stripColon rest)
parseColumn _ = error "Invalid MRTD header field"

parseRow :: [MrtdColumn] -> String -> [MrtdCell]
parseRow columns line =
  let stripped = unwrapRoundRow line
      cells = parseNodes stripped
  in if length cells /= length columns
        then error "MRTD row width mismatch"
        else zipWith convertCell columns cells

convertCell :: MrtdColumn -> Node -> MrtdCell
convertCell column (Scalar text quoted suffix) =
  let value = convertScalar text quoted suffix
  in case columnType column of
       Nothing -> mronValueToCell value
       Just "string" -> case value of
         MString v -> TString v
         MTaggedString v tag -> TTaggedString v tag
         _ -> TString (asKey value)
       Just "int" -> case value of MInt v -> TInt v; _ -> error "MRTD value does not match int field"
       Just "float" -> case value of MInt v -> TFloat (fromInteger v); MFloat v -> TFloat v; _ -> error "MRTD value does not match float field"
       Just "bool" -> case value of MBool v -> TBool v; _ -> error "MRTD value does not match bool field"
       Just other -> error ("Unsupported MRTD field type: " ++ other)
convertCell _ _ = error "MRTD cells must be scalar values"

writeCell :: MrtdCell -> String
writeCell (TString text) = quoteIfNeeded text
writeCell (TTaggedString text suffix) = quote text ++ suffix
writeCell (TInt value) = show value
writeCell (TFloat value) = show value
writeCell (TBool True) = "true"
writeCell (TBool False) = "false"

quoteIfNeeded :: String -> String
quoteIfNeeded text = if identifierLike text then text else quote text

quote :: String -> String
quote text = "\"" ++ concatMap (\c -> if c == '\\' || c == '"' then ['\\', c] else [c]) text ++ "\""

mronValueToCell :: MronValue -> MrtdCell
mronValueToCell (MString value) = TString value
mronValueToCell (MTaggedString value suffix) = TTaggedString value suffix
mronValueToCell (MInt value) = TInt value
mronValueToCell (MFloat value) = TFloat value
mronValueToCell (MBool value) = TBool value
mronValueToCell other = error ("Unsupported MRTD scalar value: " ++ show other)

identifierLike :: String -> Bool
identifierLike [] = False
identifierLike (x:xs) = (Char.isAlpha x || x == '_') && all (\c -> Char.isAlphaNum c || c == '_') xs

isSuffixIdentifier :: String -> Bool
isSuffixIdentifier [] = False
isSuffixIdentifier (x:xs) = (Char.isAlpha x || x == '_') && all (\c -> Char.isAlphaNum c || c == '_') xs

isSuffixChar :: Char -> Bool
isSuffixChar c = Char.isAlphaNum c || c == '_'

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

firstChar :: String -> Maybe Char
firstChar [] = Nothing
firstChar (x:_) = Just x

parseRadix :: Integer -> String -> Integer
parseRadix base = foldl (\acc ch -> acc * base + digitValue ch) 0
  where
    digitValue ch
      | ch >= '0' && ch <= '9' = toInteger (Char.ord ch - Char.ord '0')
      | ch >= 'a' && ch <= 'f' = toInteger (Char.ord ch - Char.ord 'a' + 10)
      | ch >= 'A' && ch <= 'F' = toInteger (Char.ord ch - Char.ord 'A' + 10)
      | otherwise = error ("Invalid digit '" ++ [ch] ++ "' for radix literal.")

startsWith :: Char -> String -> Bool
startsWith ch text = firstChar text == Just ch

stripColon :: String -> Maybe String
stripColon [] = Nothing
stripColon (_:rest) = Just rest

unwrapRoundRow :: String -> String
unwrapRoundRow text =
  case text of
    '(':rest ->
      case reverse rest of
        ')':middleRev -> reverse middleRev
        _ -> text
    _ -> text
