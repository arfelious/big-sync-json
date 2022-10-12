# 1.1.13
Fixed number parser.
Performance improvements.
Added stringify method that uses the bufferizer.
Prevented trailing commas, will be available as an option in the future.
Uses toJSON method if available in order to support custom types, might change in the future for Buffers and Dates.
# 1.1.10
Fixed parser and bufferizer to handle escaped characters better.
# 1.1.0
Added bufferize() method and now the package exports parse() and bufferize() methods instead of just parse().
# 1.0.0
Initial release.