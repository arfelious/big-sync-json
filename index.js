let escapeFkr = (bufferToParse, index, counter = 0) => {
    if (bufferToParse[index] == 92) return escapeFkr(bufferToParse, index - 1, counter + 1)
    return !(counter % 2)
}
let alsoValid = [null, false, true]
let alsoValid2 = alsoValid.map(e=>Buffer.from(e+""))
let _throw = (err, from) => {
    if(from)console.error("From:",from)
    throw (typeof isCalledRecursively != "undefined" && !isCalledRecursively) ? err : "Invalid JSON"
}
let matchWhileValid = (bufferToParse, index = 0, increaser, decreaser = null) => {
    let amount = 0
    let countStartingSpace = index - 1;
    let spacesAtStart = 0
    for (let i = countStartingSpace + 1; bufferToParse[i] == 32 || (bufferToParse[i] > 8 && bufferToParse[i] < 14); i++) {
        countStartingSpace = i
        spacesAtStart++
    }
    countStartingSpace++
    let firstChar = bufferToParse[countStartingSpace]
    //number
    if (firstChar > 47 && firstChar < 58) {
        let nextNumber = getNextNumber(bufferToParse, countStartingSpace)
        return [nextNumber[0], spacesAtStart + nextNumber[1]]
    }
    //boolean
    if (firstChar == 102 || firstChar == 110 || firstChar == 116) {
        let find = alsoValid2.findIndex(e => e[0] == firstChar)
        if (find + 1) {
            let hold = true
            for (let i = 0; i < alsoValid2[find].length; i++) {
                if (alsoValid2[find][i] != bufferToParse[countStartingSpace + i]) {
                    hold = false
                    break
                }
            }
            for (let i = alsoValid2[find].length; i < bufferToParse.length; i++) {
                let e = bufferToParse[countStartingSpace + i]
                if ((e < 9 || e > 13) && e != 32 && e != 44 && e != 125) hold = false
                else if (e == 44) break;
            }
            if (hold) return [alsoValid2[find], spacesAtStart]
            else _throw("", "matchWhileValid1")
        } else {
            _throw("", "matchWhileValid2")
        }
    }
    if (!increaser) increaser = firstChar
    if (!decreaser) decreaser = { "{": "}", "[": "]", '"': null, 91: 93, 123: 125 }[increaser]
    if (typeof increaser == "string") increaser = increaser.charCodeAt();
    if (typeof decreaser == "string") decreaser = decreaser.charCodeAt();
    if (firstChar != increaser) return false
    let isString = increaser == 34 && !decreaser
    let isInString = false
    for (let i = countStartingSpace; i < bufferToParse.length; i++) {
        let isNotEscaped = escapeFkr(bufferToParse, i - 1)
        let curr = bufferToParse[i]
        if ( curr == 34 && !isString && isNotEscaped) isInString = !isInString
        let checkStr =  isString||!isInString
        let isIncreaser = curr == increaser && isNotEscaped && checkStr
        let isDecreaser = curr == decreaser && isNotEscaped && checkStr
        if ((decreaser || (!decreaser && !amount)) && isIncreaser) amount++
        else if ((amount && !decreaser && isIncreaser)||(decreaser&&isDecreaser)) {
            let cond0 = amount&&!decreaser&&isIncreaser
            if(!cond0)amount--
            let cond = cond0||amount===0
            if(cond)return [bufferToParse.slice(countStartingSpace, i + 1), spacesAtStart]
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
    let countStartingSpace = index - 1;
    let countSpaces = 0
    for (let i = index; bufferToParse[i] == 32 || (bufferToParse[i] > 8 && bufferToParse[i] < 14); i++){
        countStartingSpace = i
        countSpaces++
    }
    let whenToStart = countStartingSpace + 1
    let validNext = matchWhileValid(bufferToParse, whenToStart, '"', null)
    return [validNext[0].slice(1,validNext[0].length-1),countSpaces]
}
let getNextValue = (bufferToParse, index = 0) => {
    let countStartingSpace = index;
    for (let i = index; bufferToParse[i] == 32 || (bufferToParse[i] > 8 && bufferToParse[i] < 14); i++)countStartingSpace = i
    if (bufferToParse[index] == 58) countStartingSpace++
    else {
        _throw("", "getNextValue")
    }
    for (let i = countStartingSpace; bufferToParse[i] == 32 || (bufferToParse[i] > 8 && bufferToParse[i] < 14); i++)countStartingSpace = i
    return matchWhileValid(bufferToParse, countStartingSpace)
}
let getNextNumber = (bufferToParse, index = 0, byItself = false) => {
    if (!bufferToParse.length) {
        _throw("", "getNextNumber0")
    }
    let isExponential = false
    let isStartingWithZero = bufferToParse[index] == 48
    let isFraction = false
    let endsWithUsed = false
    let bufferLength = bufferToParse.length
    let lastChar = null
    for (let i = index; i < bufferLength; i++) {
        let isInvalid = (isStartingWithZero && i > index ? true : bufferToParse[i] < 48 || bufferToParse[i] > 57) || (isExponential && (bufferToParse[i] == 46 ? !(isFraction = !isFraction) : false))
        if (bufferToParse[i] == 32 || (bufferToParse[i] > 8 && bufferToParse[i] < 14) || (!byItself && bufferToParse[i] == 44)) return lastChar == 69 || lastChar == 101 ? _throw("Invalid Number", "getNextNumber1") : [bufferToParse.slice(index, i), 0]
        if (bufferToParse[i] == 69 || bufferToParse[i] == 101) {
            if (!isExponential) isExponential = true
            else _throw("Invalid Number", "getNextNumber2")
        } else if (isInvalid) _throw("Invalid Number", "getNextNumber3")
        if (i == bufferLength - 1) endsWithUsed = true
        lastChar = bufferToParse[i]
    }
    let last = bufferToParse[bufferLength - 1]
    let asString = bufferToParse.slice(index)
    return byItself || endsWithUsed ? (last != 69 && last != 101 && [asString, 0]) || _throw("Invalid Number", "getNextNumber4") : [asString, 0]
}
let getNextObject = (bufferToParse, index = 0) => {
    let o = {}
    let bufferLength = bufferToParse.length
    bufferToParse = bufferToParse.slice(1, bufferLength - 1)
    for (let i = index + 1; i < bufferLength - 2; i++) {
        let nextKey = getNextKey(bufferToParse, i - 1)
        let nextKeyFirst = nextKey[0]
        let nextValue = getNextValue(bufferToParse, i + nextKeyFirst.length + 1 +nextKey[1])
        if (!nextValue){
            break
        }
        o[nextKeyFirst] = valueOf(nextValue[0])
        let add = nextKeyFirst.length + 2 + nextValue[0].length + nextValue[1] + nextKey[1]
        let until = untilNextKey(bufferToParse, i + add)
        if (!until) break
        i += add + until
    }
    return o
}
let getNextArray = (bufferToParse, index = 0) => {
    let a = []
    let aLength = 0
    let bufferLength = bufferToParse.length
    bufferToParse = bufferToParse.slice(1, bufferLength - 1)
    bufferLength -= 2
    for (let i = index; i < bufferLength; i++) {
        let currElement = matchWhileValid(bufferToParse, i)
        if (!currElement) break;
        let toAdd = currElement[0].length + currElement[1]
        let until = untilNextKey(bufferToParse, i + toAdd)
        let increase = toAdd + until - 1
        i += increase
        a[aLength++] = valueOf(currElement[0])
    }
    return a
}
let valueOf = (bufferToParse) => {
    let bufferLength = bufferToParse.length
    //isBoolean
    let indexOfFoundEqual = -1
    if ((indexOfFoundEqual = alsoValid2.findIndex(e => e.equals(bufferToParse))) + 1) return alsoValid[indexOfFoundEqual]
    //isString
    if (bufferToParse[0] == 34) {
        let result = matchWhileValid(bufferToParse, 0, '"')[0]
        return result ? result.slice(1, bufferLength - 1).toString().replace(/(?<=(^|[^\\])(\\\\)*)\\b/g,"\b").replace(/(?<=(^|[^\\])(\\\\)*)\\t/g,"\t").replace(/(?<=(^|[^\\])(\\\\)*)\\r/g,"\r").replace(/(?<=(^|[^\\])(\\\\)*)\\n/g,"\n").replace(/(?<=(^|[^\\])(\\\\)*)\\f/g,"\f").replace(/(\\\\)+/g,e=>"\\".repeat(e.length/2))
        .replace(/\\"/g,'"'): _throw("Invalid String", "valueOfValidString")
    }
    //isNumber
    else if (bufferToParse[0] > 47 && bufferToParse[0] < 58) {
        return +getNextNumber(bufferToParse, 0, true)[0]
    }
    //isObject
    else if (bufferToParse[0] == 123 && bufferToParse[bufferLength - 1] == 125) {
        return getNextObject(bufferToParse, 0)
    }
    //isArray
    else if (bufferToParse[0] == 91 && bufferToParse[bufferLength - 1] == 93) {
        return getNextArray(bufferToParse, 0)
    }
    return
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
    if (!Buffer.isBuffer(bufferToParse)) _throw("Input is not a buffer or cannot be converted to one.")
    bufferToParse = bufferToParse.slice(countStartingSpace + 1, countTrailingSpace)
    if (Buffer.from([117, 110, 100, 101, 102, 105, 110, 101, 100]).equals(bufferToParse)) _throw("Undefined cannot be parsed to a valid JSON object")
    return valueOf(bufferToParse)
}
let isCyclic = (object)=>{
    let stack = []
    let recurse = (obj)=>{
        if(obj && typeof obj === 'object'){
            if(stack.indexOf(obj)>-1){
                return true
            }
            stack.push(obj)
            for(let key in obj){
                if(recurse(obj[key])){
                    return true
                }
            }
            stack.pop()
        }
        return false
    }
    return recurse(object)
}
let bufferizer = (objectToStringify)=>{
    if(typeof objectToStringift == "boolean"){
        return Buffer.from(objectToStringify?"true":"false")
    }else if(typeof objectToStringify == "number"){
        return Buffer.from(objectToStringify.toString())
    }else if(typeof objectToStringify == "string"){
        return Buffer.from('"'+objectToStringify.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t").replace(/\f/g, "\\f").replace(/"/g,"\\\"")+'"')
    }else if(typeof objectToStringify == "object"){
        if(objectToStringify == null){
            return Buffer.from("null")
        }else if(isCyclic(objectToStringify)){
            throw new Error("Cyclic object")
        }else {
             let resObj = {}
             let counter = 0
             let size = 0
             let isNotFirst = false
             let isArray = Array.isArray(objectToStringify)
             if(isArray){
                for(let i = 0;i<objectToStringify.length;i++){
                   let value = bufferizer(objectToStringify[i])
                   let newSize = value.length+ +isNotFirst
                   let bufferToAdd = Buffer.alloc(newSize)
                   if(isNotFirst)bufferToAdd[0] = 44
                     value.copy(bufferToAdd,+isNotFirst)
                        resObj[counter++ +""]=bufferToAdd
                        size+=newSize
                        if(!isNotFirst)isNotFirst = true    
                }
            }else{
            for(let key in objectToStringify){
                let value = bufferizer(objectToStringify[key])
                let newSize0 = key.length+ +isNotFirst+3
                let newSize = newSize0+value.length
                let bufferToAdd = Buffer.alloc(newSize)
                if(isNotFirst)bufferToAdd[0] = 44
               bufferToAdd.set(Buffer.from('"'+key+'":'),+isNotFirst)
                value.copy(bufferToAdd,newSize0)
                resObj[counter++ +""]=bufferToAdd
                size+=newSize
                if(!isNotFirst)isNotFirst = true    
            }
        }
        let result = Buffer.alloc(size+2)
        result[0] = 123-(isArray&&32)
        let counter2 = 1
        for(let key in resObj){
            result.set(resObj[key],counter2)
            counter2+=resObj[key].length
        }
        delete resObj
        result[counter2] = 125-(isArray&&32)
        return result

    }
    }
}
module.exports = {parse:parser,bufferize:bufferizer}