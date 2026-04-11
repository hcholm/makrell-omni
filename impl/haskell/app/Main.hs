module Main where

import Makrell.Formats

main :: IO ()
main = putStrLn $ writeMronString $ parseMronString "name Makrell features [comments \"trailing-commas\" \"typed-scalars\"] stable false"
