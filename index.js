let escapeReady = { "\\": "\\", "\"": "\"", "/": "/", "b": "\b", "f": "\f", "n": "\n", "r": "\r", "t": "\t", 98: "\b", 102: "\f", 110: "\n", 114: "\r", 116: "\t" }
let alsoValid = [null, false, true]
let alsoValid2 = Object.fromEntries(alsoValid.map(e => e + "").map((e, i) => [e[0].charCodeAt(), [Buffer.from(e), alsoValid[i]]]))
class FastBuffer extends Uint8Array {
    constructor(bufferOrLength, byteOffset, length) {
        super(bufferOrLength, byteOffset, length);
    }
}
FastBuffer.prototype.constructor = Buffer;
FastBuffer.prototype.toString = function (encoding, start, end) {
    start = start || 0
    end = end || this.length
    return this.slice(start, end).toString(encoding)

}
let adjustOffset = (offset, length) => {
    offset = offset | 0
    if (offset === 0) {
        return 0;
    }
    if (offset < 0) {
        offset += length;
        return offset > 0 ? offset : 0;
    }
    if (offset < length) {
        return offset;
    }
    return isNaN(offset) ? 0 : length;
}
let customSlice = (buffer, start, end) => {
    const srcLength = buffer.length;
    start = adjustOffset(start, srcLength);
    end = end !== undefined ? adjustOffset(end, srcLength) : srcLength;
    const newLength = end > start ? end - start : 0;
    return new FastBuffer(buffer.buffer, buffer.byteOffset + start, newLength);
}
let _throw = (err, from) => {
    if (from) console.error("From:", from)
    throw err ? err : "Invalid JSON"
}
let matchWhileValid = (bufferToParse, index = 0, increaser, decreaser = null) => {
    let amount = 0
    let countStartingSpace = firstAfterWhitespace(bufferToParse, index)
    let spacesAtStart = countStartingSpace - index
    let firstChar = bufferToParse[countStartingSpace]
    if (!increaser) {
        //number
        if ((firstChar > 47 && firstChar < 58) || firstChar == 45 || firstChar == 43) {
            let nextNumber = getNextNumber(bufferToParse, countStartingSpace)
            return [nextNumber[0], spacesAtStart + nextNumber[1]]
        }
        //boolean
        if (firstChar == 102 || firstChar == 110 || firstChar == 116) {
            let find = alsoValid2[firstChar]
            if (find) {
                let hold = true
                for (let i = 0; i < find[0].length; i++) {
                    if (find[0][i] != bufferToParse[countStartingSpace + i]) {
                        hold = false
                        break
                    }
                }
                for (let i = find[0].length; i < bufferToParse.length; i++) {
                    let e = bufferToParse[countStartingSpace + i]
                    if ((e < 9 || e > 13) && e != 32 && e != 44 && e != 125) hold = false
                    else if (e == 44) break;
                }
                if (hold) return [find[0], spacesAtStart]
                else _throw("", "matchWhileValid1")
            } else {
                _throw("", "matchWhileValid2")
            }
        }
        increaser = firstChar
    }
    if (!decreaser) decreaser = { "{": "}", "[": "]", '"': null, 91: 93, 123: 125, 34: null }[increaser]
    if (typeof increaser == "string") increaser = increaser.charCodeAt();
    if (typeof decreaser == "string") decreaser = decreaser.charCodeAt();
    if (firstChar != increaser) return false
    let isString = increaser == 34 && !decreaser
    let isInString = false
    let countEscapes = 0
    let noDecreaser = !decreaser
    for (let i = countStartingSpace; i < bufferToParse.length; i++) {
        let curr = bufferToParse[i]
        let isNotEscaped = countEscapes % 2 == 0
        curr == 92 ? (countEscapes++) : (countEscapes = 0)
        if (!isString && curr == 34 && isNotEscaped) isInString = !isInString
        let checkStr = isString || !isInString
        let isCheck = isNotEscaped && checkStr
        let isIncreaser = curr == increaser && isCheck
        if (isIncreaser && (decreaser || (noDecreaser && !amount))) amount++
        else if ((curr == decreaser && isCheck) || (amount && noDecreaser && isIncreaser)) {
            let cond0 = amount && noDecreaser && isIncreaser
            if (!cond0) amount--
            if (cond0 || amount === 0) {
                return [customSlice(bufferToParse, countStartingSpace, i + 1), spacesAtStart]
            }
        }
    }
}
let untilNextKey = (bufferToParse, index = 0) => {
    let countStartingSpace = 0
    let countTrailingSpace = 0
    for (let i = index; bufferToParse[i] == 32 || (bufferToParse[i] > 8 && bufferToParse[i] < 14); i++)countStartingSpace++
    if (bufferToParse[index + countStartingSpace] != 44) {
        if (bufferToParse[index + countStartingSpace] === undefined) return false
        _throw("", "untilNextKey")
    }
    for (let i = index + countStartingSpace + 1; bufferToParse[i] == 32 || (bufferToParse[i] > 8 && bufferToParse[i] < 14); i++)countTrailingSpace++
    return countStartingSpace + 1 + countTrailingSpace
}
let getNextKey = (bufferToParse, index = 0) => {
    let whenToStart = firstAfterWhitespace(bufferToParse, index)
    let countSpaces = whenToStart - index
    let validNext = matchWhileValid(bufferToParse, whenToStart, '"', null)
    for (let i = whenToStart + validNext[0].length; bufferToParse[i] == 32 || (bufferToParse[i] > 8 && bufferToParse[i] < 14); i++)countSpaces++
    return [validNext && unescapeString(customSlice(validNext[0], 1, validNext[0].length - 1).toString()), countSpaces, validNext[0].length - 1]
}
let getNextValue = (bufferToParse, index = 0) => {
    let countStartingSpace = firstAfterWhitespace(bufferToParse, index)
    if (bufferToParse[countStartingSpace] == 58) countStartingSpace++
    else {
        _throw("", "getNextValue")
    }
    return matchWhileValid(bufferToParse, countStartingSpace)
}
let isWhitespace = x => x == 32 || (x > 8 && x < 14)
let firstAfterWhitespace = (buffer, i) => {
    let length = buffer.length
    while (i < length && isWhitespace(buffer[i])) i++
    return i
}
let getNextNumber = (bufferToParse, index = 0, byItself = false) => {
    if (!bufferToParse.length) {
        _throw("", "getNextNumber0")
    }
    let isExponential = false
    let isStartingWithZero = bufferToParse[index] == 48
    let isFraction = false
    let lastIsExponent = false
    let fractionIsUsed = false
    let endsWithUsed = false
    let bufferLength = bufferToParse.length
    let lastChar = null
    for (let i = index; i < bufferLength; i++) {
        let curr = bufferToParse[i]
        let isInvalid = ((isStartingWithZero && i > index && !lastIsExponent && bufferToParse[index + 1] != 46 && bufferToParse[index + 1] != 69 && bufferToParse[index + 1] != 101) || curr == 47 || (curr < 45 && curr != 43) || curr > 57) || ((curr == 46 ? fractionIsUsed ? true : !(isFraction = !isFraction, fractionIsUsed = true) : false)) || (curr == 45 || curr == 43) && i > index && !lastIsExponent
        if (lastIsExponent) lastIsExponent = false
        if (curr == 32 || (curr > 8 && curr < 14) || (!byItself && curr == 44)) return lastChar == 69 || lastChar == 101 ? _throw("Invalid Number", "getNextNumber1") : [customSlice(bufferToParse, index, i), 0]
        if (curr == 69 || curr == 101) {
            if (!isExponential) {
                isExponential = true
                lastIsExponent = true
            }
            else _throw("Invalid Number", "getNextNumber2")
        } else if (isInvalid) {
            _throw("Invalid Number", "getNextNumber3")
        }
        if (i == bufferLength - 1) endsWithUsed = true
        lastChar = bufferToParse[i]
    }
    let last = bufferToParse[bufferLength - 1]
    let asString = customSlice(bufferToParse, index)
    return byItself || endsWithUsed ? (last != 46 && last != 69 && last != 101 && [asString, 0]) || _throw("Invalid Number", "getNextNumber4") : [asString, 0]
}
let getNextObject = (bufferToParse, index = 0) => {
    let o = {}
    let bufferLength = bufferToParse.length
    bufferToParse = customSlice(bufferToParse, 1, bufferLength - 1)
    let i;
    let startFrom = firstAfterWhitespace(bufferToParse, index + 1)
    for (i = startFrom; i < bufferLength - 2; i++) {
        let nextKey = getNextKey(bufferToParse, i - 1)
        if (nextKey[0] === false) {
            return _throw("Invalid Object", "getNextObject0")
        }
        let nextKeyFirst = nextKey[0]
        let nextKeyLength = nextKey[2]
        let nextValue = getNextValue(bufferToParse, i + nextKeyLength + nextKey[1])
        if (!nextValue) {
            break
        }
        o[nextKeyFirst] = valueOf(nextValue[0])
        let add = nextKeyLength + nextKey[1] + 1 + nextValue[0].length + nextValue[1]
        let until = untilNextKey(bufferToParse, i + add)
        if (!until) break
        i += add + until
    }
    let hasAnyKey = i != startFrom
    if (bufferLength - i == 1 && hasAnyKey) _throw("Trailing commmas are not allowed.", "getNextObject")
    return o
}
let getNextArray = (bufferToParse, index = 0, shoulEnd) => {
    let a = []
    let aLength = 0
    let bufferLength = bufferToParse.length
    bufferToParse = customSlice(bufferToParse, 1, bufferLength - 1)
    let lastUntil
    let i;
    for (i = index; i < bufferLength - 2; i++) {
        let currElement = matchWhileValid(bufferToParse, i)
        if (!currElement) {
            let e = bufferToParse[i]
            if (e == 32 || e > 8 || e < 14) continue
            _throw("Invalid Array", "getNextArray")
        }
        let toAdd = currElement[0].length + currElement[1]
        let until = untilNextKey(bufferToParse, i + toAdd)
        lastUntil = until
        let increase = toAdd + until - 1
        i += increase
        a[aLength++] = valueOf(currElement[0])
    }
    let lastIndex = firstAfterWhitespace(buffer, i)
    if (shoulEnd && lastIndex > i && !isWhitespace(buffer[i])) _throw("Invalid JSON")
    if (lastUntil) _throw("Trailing commmas are not allowed.", "getNextArray")
    return a
}
let unescapeString = str => str.replace(/(?<=([^\\]|^)(\\\\)*)\\([btrnf/])/g, q => {
    return escapeReady[q[1]]
}).replace(/\\u([\d\w]{4})/gi, (_, m) => String.fromCharCode(parseInt(m, 16)))
    .replace(/\\\\/g, "\\")
    .replace(/\\"/g, '"');
let valueOf = (bufferToParse) => {
    let bufferLength = bufferToParse.length
    //isBoolean
    let firstElement = bufferToParse[0]
    let foundEqual = alsoValid2[firstElement]
    if (foundEqual && foundEqual[0].equals(bufferToParse)) return foundEqual[1]
    //isString
    if (firstElement == 34) {
        let result = matchWhileValid(bufferToParse, 0, '"')[0]
        return result ? unescapeString(customSlice(result, 1, bufferLength - 1).toString()) : _throw("Invalid String", "valueOfValidString")
    }
    //isNumber
    else if (((firstElement > 47 && firstElement < 58) || firstElement == 45 || firstElement == 43)) {
        return +getNextNumber(bufferToParse, 0, true)[0]
    }
    //isObject
    else if (firstElement == 123 && bufferToParse[bufferLength - 1] == 125) {
        return getNextObject(bufferToParse, 0, true)
    }
    //isArray
    else if (firstElement == 91 && bufferToParse[bufferLength - 1] == 93) {
        return getNextArray(bufferToParse, 0, true)
    }
    return _throw("Invalid JSON", "valueOf")
}
let parser = function (bufferToParse, options = {}) {
    if (arguments.length == 0) _throw("No argument passed to the parser")
    if (bufferToParse === undefined) _throw("Undefined cannot be parsed to a valid JSON object")
    if (!!bufferToParse === bufferToParse) return bufferToParse
    if (bufferToParse === null) return null
    if (typeof bufferToParse == "string") bufferToParse = Buffer.from(bufferToParse)
    let countStartingSpace = -1;
    let countTrailingSpace = bufferToParse.length;
    for (let i = 0; bufferToParse[i] == 32 || (bufferToParse[i] > 8 && bufferToParse[i] < 14); i++)countStartingSpace = i
    for (let i = bufferToParse.length - 1; i > countStartingSpace && (bufferToParse[i] == 32 || (bufferToParse[i] > 8 && bufferToParse[i] < 14)); i--)countTrailingSpace = i
    if (!Buffer.isBuffer(bufferToParse)) _throw("Input is not a buffer and cannot be converted to one.")
    bufferToParse = customSlice(bufferToParse, countStartingSpace + 1, countTrailingSpace)
    if (Buffer.from([117, 110, 100, 101, 102, 105, 110, 101, 100]).equals(bufferToParse)) _throw("Undefined cannot be parsed to a valid JSON object")
    return valueOf(bufferToParse)
}
let isCyclic = (object) => {
    let stack = []
    let recurse = (obj) => {
        if (obj && typeof obj === 'object') {
            if (stack.indexOf(obj) > -1) {
                return true
            }
            stack.push(obj)
            for (let key in obj) {
                if (recurse(obj[key])) {
                    return true
                }
            }
            stack.pop()
        }
        return false
    }
    return recurse(object)
}
let bufferizer = (objectToStringify) => {
    if (typeof objectToStringify == "boolean") {
        return Buffer.from(objectToStringify ? "true" : "false")
    } else if (typeof objectToStringify == "number") {
        return Buffer.from(objectToStringify.toString())
    } else if (typeof objectToStringify == "string") {
        return Buffer.from('"' + objectToStringify.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t").replace(/\f/g, "\\f").replace(/"/g, '\\"') + '"')
    } else if (typeof objectToStringify == "object") {
        if (objectToStringify === null) {
            return Buffer.from("null")
        } else if (isCyclic(objectToStringify)) {
            _throw("Cyclic object cannot be bufferized", "bufferizer")
        } else {
            let resObj = {}
            let counter = 0
            let size = 0
            let isNotFirst = false
            let isArray = Array.isArray(objectToStringify)
            if (isArray) {
                for (let i = 0; i < objectToStringify.length; i++) {
                    if (objectToStringify[i] === undefined) objectToStringify[i] = null
                    let value = bufferizer(objectToStringify[i])
                    let newSize = (value ? value.length : 0) + +isNotFirst
                    let bufferToAdd = Buffer.allocUnsafe(newSize)
                    if (isNotFirst) bufferToAdd[0] = 44
                    value.copy(bufferToAdd, +isNotFirst)
                    resObj[counter++ + ""] = bufferToAdd
                    size += newSize
                    if (!isNotFirst) isNotFirst = true
                }
            } else {
                if (objectToStringify.toJSON) {
                    try {
                        let asJSON = objectToStringify.toJSON()
                        return bufferizer(asJSON)
                    } catch (e) {
                        _throw("Object is too large to bufferize")
                    }
                }
                for (let key in objectToStringify) {
                    if (objectToStringify[key] === undefined) continue
                    let value = bufferizer(objectToStringify[key])
                    let newSize0 = key.length + +isNotFirst + 3
                    let newSize = newSize0 + (value ? value.length : 0)
                    let bufferToAdd = Buffer.allocUnsafe(newSize)
                    if (isNotFirst) bufferToAdd[0] = 44
                    bufferToAdd.set(Buffer.from('"' + key + '":'), +isNotFirst)
                    value.copy(bufferToAdd, newSize0)
                    resObj[counter++ + ""] = bufferToAdd
                    size += newSize
                    if (!isNotFirst) isNotFirst = true
                }
            }
            let result = Buffer.allocUnsafe(size + 2)
            result[0] = 123 - (isArray && 32)
            let counter2 = 1
            for (let key in resObj) {
                result.set(resObj[key], counter2)
                counter2 += resObj[key].length
            }
            delete resObj
            result[counter2] = 125 - (isArray && 32)
            return result
        }
    }
}
module.exports = { parse: parser, bufferize: bufferizer, stringify: b => bufferizer(b).toString() }