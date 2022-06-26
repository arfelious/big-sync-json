# Big Sync JSON

Overcomes 512MB String limitation of regular JSON.parse() and JSON.stringify() by not stringifying the whole buffer.

## Usage Example

```javascript
const fs = require('fs')
const BSJON = require('big-sync-json')

let jsonBuffer = fs.readFileSync('./big-json.json')

let jsonData = BSJON.parse(jsonBuffer)

let jsonBuffer2 = BSJSON.bufferize(jsonData)

fs.writeFileSync('./big.json.json', jsonBuffer2)
```


## Features

- It is a drop-in replacement for JSON.parse()

- Does not require you to make any other changes in order to parse bigger JSON files on a project

## Issues

Feel free to open [issues](https://github.com/arfelious/big-sync-json/issues) on Github if you have any problems with the package.
Although the package was tested with valid JSON files without any problems, for now, unexpected outputs may occur from non-valid JSON buffers.

## License

[MIT](https://choosealicense.com/licenses/mit/)
## Roadmap

- Log the status if it is given as an option as it might take some time to parse or bufferize big files

- Change errors to be compliant with JSON.parse() and JSON.stringify()

- Support reviver argument from JSON.parse() on <BSJSON>.parse() method

- Support replacer and space arguments from JSON.stringify() on <BSJSON>.bufferize() method

