// parse with coreNLP
// search corpus
// apply relax -> entailment
// apply restrict -> neutral
// apply contradict -> contradiction
// randomly mix with corpus
// re-training
// validate on bAbI, NLI

// coreference

const readline = require('readline')
const fs = require('fs')
const moment = require('moment')

const patternCounter = {}

let timeRules = {
    'before': {
        'pattern': 'before_DURATION/TIME/DATE_5',
        'entailment': ['decrease_time'],
        'neutral': ['increase_time'],
        'contradiction': ['chg_after', 'chg_at']
    },
    'after': {
        'pattern': 'after_DURATION/TIME/DATE_5',
        'entailment': ['increase_time'],
        'neutral': ['decrease_time'],
        'contradiction': ['chg_before', 'chg_at']
    },
    'at': {
        'pattern': 'at_DATE_5',
        'entailment': ['increase_time', 'chg_before'],
        'neutral': null,
        'contradiction': ['chg_before', 'chg_after']
    },
    'in': {
        'pattern': 'in_DATE_5',
        'entailment': ['increase_time', 'chg_before'],
        'neutral': null,
        'contradiction': ['chg_before', 'chg_after']
    },
    'since_date': { // is since an event?
        'pattern': 'since_DATE_5',
        'entailment': ['increase_time', 'increase_time,chg_after'],
        'neutral': null,
        'contradiction': ['chg_before']
    },
    // 'since_event': { // is since an event?
    //     'pattern': ['since_DATE'],
    //     'entailment': null,
    //     'neutral': null,
    //     'contradiction': ['chg_before']
    // },
    'between': {
        'pattern': 'between_DURATION/TIME/DATE_5',
        'entailment': ['increase_time1, decrease_time2'],
        'neutral': ['decrease_time1, increase_time2'],
        'contradiction': ['chg_after_time2', 'chg_at_time1', 'chg_before_time1']
    },
    'later': {
        'pattern': 'later_DATE_-5',
        'entailment': null,
        'neutral': null,
        'contradiction': ['chg_time']
    },
    'earlier': {
        'pattern': 'earlier_DATE_-5',
        'entailment': null,
        'neutral': null,
        'contradiction': ['chg_time']
    }
}

let quants = {
    'more': {
        'pattern': ['more than_NUM'],
        'entailment': ['decrease_num'],
        'neutral': ['increase_num'],
        'contradiction': ['rm_more than', 'chg_less than'],
    },
    'less': {
        'pattern': ['more than_NUM'],
        'entailment': ['decrease_num'],
        'neutral': ['increase_num'],
        'contradiction': ['rm_more than', 'chg_less than'],
    },
    'between': {
        'pattern': ['more than_NUM'],
        'entailment': ['decrease_num'],
        'neutral': ['increase_num'],
        'contradiction': ['rm_more than', 'chg_less than'],
    },
    'smaller': {
        'pattern': ['more than_NUM'],
        'entailment': ['decrease_num'],
        'neutral': ['increase_num'],
        'contradiction': ['rm_more than', 'chg_less than'],
    },
    'bigger': {
        'pattern': ['more than_NUM'],
        'entailment': ['decrease_num'],
        'neutral': ['increase_num'],
        'contradiction': ['rm_more than', 'chg_less than'],
    },
    'equal': {
        'pattern': ['more than_NUM'],
        'entailment': ['decrease_num'],
        'neutral': ['increase_num'],
        'contradiction': ['rm_more than', 'chg_less than'],
    },
    'same': {
        'pattern': ['more than_NUM'],
        'entailment': ['decrease_num'],
        'neutral': ['increase_num'],
        'contradiction': ['rm_more than', 'chg_less than'],
    }
}

function getTimePatterns(rules) {
  let timePatterns = {}
  for (let k in rules) {
    timePatterns[k] = rules[k]['pattern']
  }
  return timePatterns
}

function increaseTime(times, tokens) {
  let timeString = ""
  for (let i in times) {
    let type = times[i].split(' ')[0]
    let index = parseInt(times[i].split(' ')[1])
    if (i == 0) {
      timeType = type
      lastIndex = index
      timeString += tokens[index]
    } else {
      if (type == timeType && index == lastIndex+1) {
        lastIndex = index
        timeString += ' ' + tokens[index]
      }
    }
  }
  if (timeString.length > 0) {
    console.log(timeString, moment(timeString).toDate())
  }
  if (moment.isDate(timeString)) {
    return tokens.join(' ').replace(timeString, moment(timeString).add(1, 'days').toDate())
  } else {
    return false
  }
}

function decreaseTime(times, tokens) {
  let timeString = ""
  for (let i in times) {
    let type = times[i].split(' ')[0]
    let index = parseInt(times[i].split(' ')[1])
    if (i == 0) {
      timeType = type
      lastIndex = index
      timeString += tokens[index]
    } else {
      if (type == timeType && index == lastIndex+1) {
        lastIndex = index
        timeString += ' ' + tokens[index]
      }
    }
  }
  if (timeString.length > 0) {
    console.log(timeString, moment(timeString).toDate())
  }
  if (moment.isDate(timeString)) {
    return tokens.join(' ').replace(timeString, moment(timeString).subtract(1, 'days').toDate())
  } else {
    return false
  }
}

let timePatterns = getTimePatterns(timeRules)


function parseLine(line) {
  // index word lemma pos ner
  return line.split(' ')
}

// return sentence | type keyword_index POS NER time1 POS NER time2 POS NER
function parseSentence(sent, patterns) {
  let words = sent.map((s) => s[1])
  let poss = sent.map((s) => s[3])
  let ners = sent.map((s) => s[4])
  for (let key in patterns) {
    let keyword = patterns[key].split('_')[0]
    let keytimes = patterns[key].split('_')[1].split('/') // [DATE, DURATION, TIME] 
    let windowsize = parseInt(patterns[key].split('_')[2])
    let wordIndex = words.indexOf(keyword)
    if (wordIndex > -1) {
      // console.log(`keyword found: ${words.join(' ')}`)
      let times = []
      keytimes.map((kt) => {
        for (let i in ners) {
          let diff = i - wordIndex;
          if (ners[i] == kt && (windowsize < 0 ? diff >= windowsize && diff < 0 : diff <= windowsize && diff > 0 )) {
            times.push([kt, i].join(' '))
          }
        }
      })
    
      if (times.length > 0) {
        if (patternCounter[key]) {
          patternCounter[key] += 1
        } else {
          patternCounter[key] = 1
        }
        let _sent = words.join(' ')
        let _keyword = [key, wordIndex].join(' ')
        let _times = times.join('\t')
        return [key, _sent, _keyword, _times].join('\t')
      } else {
        continue
      }
    } else {
      continue
    }
  }
  return false
}

function transformNLISentence(key, tokens, keyword, times) {
  // index sentence1 sentence2 label
  let res = []
  let ops = ['entailment', 'neutral', 'contradiction']
  if (!timeRules.hasOwnProperty(key)) {
    console.log('assert unknown keyword')
    return false
  }
  let rule = timeRules[key]
  for (let index in ops) {
    // increase time; change keyword
    let opcodes = rule[ops[index]]
    for (let j in opcodes) {
      let opcode = opcodes[j].split('_')
      if (opcode[0] == 'chg') {
        let tokenIndex = keyword[1]
        tokens[tokenIndex] = opcode[1]
        res.push([tokens.join(' '), ops[index]].join('\t'))
      }
      if (opcode[0] == 'increase') {
        let chg = increaseTime(times, tokens)
        if (chg) {
          console.log('transform increase')
          res.push([tokens.join(' '), chg, ops[index]].join('\t'))
        }
      }
      if (opcode[0] == 'decrease') {
        let chg = decreaseTime(times, tokens)
        if (chg) {
          console.log('transform decrease')
          res.push([tokens.join(' '), chg, ops[index]].join('\t'))
        }
      }
    }
  }
  return res
}

async function transformLineByLine(filename) {
  const fileStream = fs.createReadStream(filename)

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });
  let sc = 0
  let output = []

  for await (const line of rl) {
    if (line.length == 0) {
      continue
    }
    let ops = line.split('\t')
    let res = transformNLISentence(ops[0], ops[1].split(' '), ops[2], ops.slice(3))
    if (res.length > 0) {
      output.concat(res)
    }
  }
  const dataBuffer = Buffer.from(output.join('\n'), 'utf-8')
  fs.writeFileSync(`nli-train.txt`, dataBuffer)
}

async function processLineByLine(filename) {
  const fileStream = fs.createReadStream(filename)

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });
  let sc = 0
  let sentence = []
  let output = []

  for await (const line of rl) {
    if (line.length == 0) {
      if (sc % 100 == 0) {
        console.log(`Reading sentence: ${sc}`)
      }
      sc += 1
      let res = parseSentence(sentence, timePatterns)
      sentence = []
      if (res) {
        output.push(res)
      }
    } else {
      sentence.push(line.split('\t'))
    }
  }
  console.log(`${output.length} sentences are found.`)
  console.log(patternCounter)
  const dataBuffer = Buffer.from(output.join('\n'), 'utf-8')
  fs.writeFileSync(`output.txt`, dataBuffer)
}

if (process.argv.length < 3) {
  console.log('param function and file are expected')
}

if (process.argv[2] == 'generate') {
  processLineByLine(process.argv[3])
} else if (process.argv[2] == 'transform') {
  transformLineByLine(process.argv[3])
}