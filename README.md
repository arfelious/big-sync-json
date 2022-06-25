# Big Sync JSON

Overcomes 512MB String limitation of regular JSON.parse by not stringifying the whole buffer.
## Usage Example

```javascript
const fs = require('fs')
const parser = require('big-sync-json')

let jsonBuffer = fs.readFileSync('./big-json.json')
let jsonData = parser(jsonBuffer)
```


## Features

- It is a drop-in replacement for JSON.parse()
- Does not require you to make any other changes in order to support bigger JSON files on a project

## License

[MIT](https://choosealicense.com/licenses/mit/)


## Roadmap

- Log the status if it is given as an option, it can take some time to parse big files

- Change errors to be compliant with JSON.parse()

