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
const utils = require('./utils')

const patternCounter = {}
const invalidDatetime = []
const validDatetime = []

let timeRules = {
    'before': {
        'pattern': 'before_DURATION/TIME/DATE_5',
        'entailment': ['decrease_time'],
        'neutral': ['increase_time'],
        'contradiction': ['chg_after', 'chg_at']
    },
    'after': {
        'pattern': 'after_TIME/DATE_5',
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
        'entailment': ['chg_before','increase_time'],
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
        'entailment': ['decrease_time'],
        'neutral': ['increase_time'],
        'contradiction': null
        // 'contradiction': ['chg_after_time2', 'chg_at_time1', 'chg_before_time1']
    },
    'later': {
        'pattern': 'later_DATE_-5',
        'entailment': null,
        'neutral': null,
        'contradiction': ['chg_earlier', 'chg_before']
    },
    'earlier': {
        'pattern': 'earlier_DATE_-5',
        'entailment': null,
        'neutral': null,
        'contradiction': ['chg_later', 'chg_after']
    }
}

let transformStats = {
  overall: {
    entailment: 0,
    neutral: 0,
    contradiction: 0,
    entailment_token_count: 0,
    neutral_token_count: 0,
    contradiction_token_count: 0
  }
}
for (let k in timeRules) {
  transformStats[k] = {
    entailment: 0,
    neutral: 0,
    contradiction: 0,
    entailment_token_count: 0,
    neutral_token_count: 0,
    contradiction_token_count: 0
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

function printProgress(progress){
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    process.stdout.write('Reading lines ' + progress );
}

function Counter(array) {
  var count = {};
  array.forEach(val => count[val] = (count[val] || 0) + 1);
  return count;
}

function getTimePatterns(rules) {
  let timePatterns = {}
  for (let k in rules) {
    timePatterns[k] = rules[k]['pattern']
  }
  return timePatterns
}

function computeTokenCount(transformStats) {
  transformStats['overall']['entailment_token_count'] =  transformStats['overall']['entailment_token_count'] / transformStats['overall']['entailment']
  transformStats['overall']['neutral_token_count'] =  transformStats['overall']['neutral_token_count'] / transformStats['overall']['neutral']
  transformStats['overall']['contradiction_token_count'] =  transformStats['overall']['contradiction_token_count'] / transformStats['overall']['contradiction']
  for (let k in timeRules) {
    transformStats[k]['entailment_token_count'] =  transformStats[k]['entailment_token_count'] / transformStats[k]['entailment']
    transformStats[k]['neutral_token_count'] =  transformStats[k]['neutral_token_count'] / transformStats[k]['neutral']
    transformStats[k]['contradiction_token_count'] =  transformStats[k]['contradiction_token_count'] / transformStats[k]['contradiction']
  }
  return transformStats
}

// if has_day? increase day
// if has_month? increase month
// if has_season? increase season
// if has_year? increase year
//    if has_start? to middle, to end
//    if has_early? to late
//    if this? to next
function change_time(times, tokens, direction) {
  for (let i in times) {
    let tType = times[i].split(' ')[0]
    let tIndex = parseInt(times[i].split(' ')[1])
    let val = tokens[tIndex]
    if (!val) {
      console.log("null value: ", tType, tIndex, tokens, direction)
    }

    if (utils.could_be_day(val)) {
      // console.log("change day: ", val, direction)
      tokens[tIndex] = utils.next_day(val, direction)
      // console.log("to day: ", tokens[tIndex], direction)
      return tokens
    }

    if (utils.could_be_date(val)) {
      // console.log("change date: ", val, direction)
      tokens[tIndex] = utils.next_date(val, direction)
      // console.log("to date: ", tokens[tIndex], direction)
      return tokens
    }

    if (utils.could_be_month(val)) {
      // console.log("change month: ", val, direction)
      tokens[tIndex] = utils.next_month(val, direction)
      // console.log("to month: ", tokens[tIndex], direction)
      return tokens
    }

    if (utils.could_be_season(val)) {
      // console.log("change season: ", val, direction)
      tokens[tIndex] = utils.next_season(val, direction)
      // console.log("to season: ", tokens[tIndex], direction)
      return tokens
    }

    if (utils.could_be_year(val)) {
      // console.log("change year: ", val, direction)
      tokens[tIndex] = utils.next_year(val, direction)
      // console.log("to year: ", tokens[tIndex], direction)
      return tokens
    }
  }
  return false // nothing changed
}

function getAllTimeExpressions(times, tokens) {
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
    if (!moment(timeString).isValid()) {
      // console.log(timeString, moment(timeString).toDate())
      invalidDatetime.push(timeString)
    } else {
      validDatetime.push(timeString)
    }
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

function pickTrainSet(sentences) {
  let maxToken = 0
  let minToken = 100000
  let counter = {
    'before': {
        'entailment': 600,
        'neutral': 600,
        'contradiction': 600
    },
    'after': {
        'entailment': 600,
        'neutral': 600,
        'contradiction': 600
    },
    'at': {
        'entailment': 600,
        'neutral': 600,
        'contradiction': 600
    },
    'in': {
        'entailment': 600,
        'neutral': 600,
        'contradiction': 600
    },
    'since_date': { // is since an event?
        'entailment': 600,
        'neutral': 600,
        'contradiction': 600
    },
    'between': {
        'entailment': 600,
        'neutral': 600,
        'contradiction': 600
        // 'contradiction': ['chg_after_time2', 'chg_at_time1', 'chg_before_time1']
    },
    'later': {
        'entailment': 600,
        'neutral': 600,
        'contradiction': 600
    },
    'earlier': {
        'entailment': 600,
        'neutral': 600,
        'contradiction': 600
    },
    'tokens': {
      'entailment': 0,
      'neutral': 0,
      'contradiction': 0
    }
  }
  let res = []
  for (i in sentences) {
    let sent = sentences[i]
    let label = sent['gold_label']
    let keyword = sent['pairID']
    if (counter[keyword][label] > 0) {
      let tlength = sent['sentence1'].split(' ').length
      counter['tokens'][label] += tlength
      if (tlength > maxToken) {
        maxToken = tlength
      }
      if (tlength < minToken) {
        minToken = tlength
      }
      res.push(JSON.stringify(sent))
      counter[keyword][label]--
    }
  }
  for (let k in counter) {
    console.log('keyword: ', k)
    console.log('entailment: ', 600 - counter[k]['entailment'])
    console.log('neutral: ', 600 - counter[k]['neutral'])
    console.log('contradiction: ', 600 - counter[k]['contradiction'])
    console.log('\n')
  }
  console.log('entailment#: ', counter['tokens']['entailment'])
  console.log('neutral#: ', counter['tokens']['neutral'])
  console.log('contradiction#: ', counter['tokens']['contradiction'])
  console.log('max: ', maxToken)
  console.log('min: ', minToken)
  return res
}

function pickDevSet(sentences) {
  let maxToken = 0
  let minToken = 100000
  let counter = {
    'before': {
        'entailment': 20,
        'neutral': 20,
        'contradiction': 20
    },
    'after': {
        'entailment': 20,
        'neutral': 20,
        'contradiction': 20
    },
    'at': {
        'entailment': 20,
        'neutral': 20,
        'contradiction': 20
    },
    'in': {
        'entailment': 20,
        'neutral': 20,
        'contradiction': 20
    },
    'since_date': { // is since an event?
        'entailment': 20,
        'neutral': 20,
        'contradiction': 20
    },
    'between': {
        'entailment': 20,
        'neutral': 20,
        'contradiction': 20
        // 'contradiction': ['chg_after_time2', 'chg_at_time1', 'chg_before_time1']
    },
    'later': {
        'entailment': 20,
        'neutral': 20,
        'contradiction': 20
    },
    'earlier': {
        'entailment': 20,
        'neutral': 20,
        'contradiction': 20
    },
    'tokens': {
      'entailment': 0,
      'neutral': 0,
      'contradiction': 0
    }
  }
  let res = []
  for (i in sentences) {
    let sent = sentences[i]
    let label = sent['gold_label']
    let keyword = sent['pairID']
    if (counter[keyword][label] > 0) {
      let tlength = sent['sentence1'].split(' ').length
      counter['tokens'][label] += tlength
      if (tlength > maxToken) {
        maxToken = tlength
      }
      if (tlength < minToken) {
        minToken = tlength
      }
      res.push(JSON.stringify(sent))
      counter[keyword][label]--
    }
  }
  for (let k in counter) {
    console.log('keyword: ', k)
    console.log('entailment: ', 20 - counter[k]['entailment'])
    console.log('neutral: ', 20 - counter[k]['neutral'])
    console.log('contradiction: ', 20 - counter[k]['contradiction'])
    console.log('\n')
  }
  console.log('entailment#: ', counter['tokens']['entailment'])
  console.log('neutral#: ', counter['tokens']['neutral'])
  console.log('contradiction#: ', counter['tokens']['contradiction'])
  console.log('max: ', maxToken)
  console.log('min: ', minToken)
  return res
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
    let direction = windowsize > 0 ? 1 : -1

    if (wordIndex > -1) {
      // console.log(`keyword found: ${words.join(' ')}`)
      let times = []
      for (let k in keytimes) {
        let kt = keytimes[k]
        let lasti = wordIndex - direction
        if (ners[wordIndex + direction] !== kt) continue // Temporal NER should start from neighbors
        for (let i = wordIndex; Math.abs(i - wordIndex) <= Math.abs(windowsize) && i < ners.length && i >= 0;) {
          let diff = i - wordIndex;
          if (ners[i] == kt && i == (lasti + direction) && (windowsize < 0 ? diff >= windowsize && diff < 0 : diff <= windowsize && diff > 0 )) {
            times.push([kt, i].join(' '))
          }
          lasti = i
          windowsize > 0 ? i++ : i--
        }
      }

      if (direction == -1) {
        times.reverse()
      }

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

function transformNLISentence(key, tokens, keyword, times, type) {
  // index sentence1 sentence2 label
  let res = []
  let ops = ['entailment', 'neutral', 'contradiction']
  if (!timeRules.hasOwnProperty(key)) {
    console.log('assert unknown keyword')
    return false
  }
  
  getAllTimeExpressions(times, tokens)

  let rule = timeRules[key]
  // console.log(_tokens)
  for (let index in ops) {
    // increase time; change keyword
    let opcodes = rule[ops[index]]
    if (!opcodes) continue

    // cover all operations
    let scorefull = opcodes.length
    let score = 0
    
    let _tokens = tokens.slice()
    for (let j in opcodes) {
      let opcode = opcodes[j].split('_')
      if (opcode[0] == 'chg') {
        let tokenIndex = keyword[1]
        // console.log("chg op: ",_tokens[tokenIndex], opcode[1], ' : ', _tokens.join(' '))
        _tokens[tokenIndex] = opcode[1]
        score++
        continue
      }
      if (opcode[0] == 'increase') {
        let _res = change_time(times, _tokens, 1)
        if (_res) {
          _tokens = _res
          score++
        }
        continue
      }
      if (opcode[0] == 'decrease') {
        let _res = change_time(times, _tokens, -1)
        if (_res) {
          _tokens = _res
          score++
        }
        continue
      }
    }
    if (scorefull != score) continue
    let origin = tokens.join(' ')
    let chg = _tokens.join(' ')
    if (origin != chg) {
      transformStats[keyword[0]][ops[index]]++
      transformStats['overall'][ops[index]]++
      transformStats[keyword[0]][ops[index] + '_token_count'] += _tokens.length
      transformStats['overall'][ops[index] + '_token_count'] += _tokens.length
      // SNLI format
      if (type == 'genre') {
        res.push({
            "annotator_labels": [ops[index],ops[index],ops[index],ops[index],ops[index]],
            "genre": "time",
            "gold_label": ops[index],
            "pairID": keyword[0],
            "promptID": "#promptID#",
            "sentence1": origin,
            "sentence1_binary_parse": origin,
            "sentence1_parse": "",
            "sentence2": chg,
            "sentence2_binary_parse": chg,
            "sentence2_parse": ""
        })
        // res.push([ops[index], '()', '()', '()', '()', origin, chg, '#promptID#', keyword[0], 'time', ops[index],ops[index],ops[index],ops[index],ops[index]])
      } else {
        res.push({
            "annotator_labels": [ops[index],ops[index],ops[index],ops[index],ops[index]],
            "captionID": "id",
            "gold_label": ops[index],
            "pairID": keyword[0],
            "sentence1": origin,
            "sentence1_binary_parse": origin,
            "sentence1_parse": "",
            "sentence2": chg,
            "sentence2_binary_parse": chg,
            "sentence2_parse": ""
        })
        // res.push([ops[index], '()', '()', '()', '()', origin, chg, '#promptID#', keyword[0], ops[index], ops[index],ops[index],ops[index],ops[index]])
      }
    }
  }
  return res
}

async function transformLineByLine(filename, type='train') {
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
    let res = transformNLISentence(ops[0], ops[1].split(' '), ops[2].split(' '), ops.slice(3), type)
    if (res.length > 0) {
      output = output.concat(res)
    }
  }
  const invalid = Counter(invalidDatetime)
  const valid = Counter(validDatetime)
  
  transformStats = computeTokenCount(transformStats)
  const stats = Buffer.from(JSON.stringify(transformStats), 'utf-8')
  fs.writeFileSync(`./data/nli-transform-stats_${type}.json`, stats)

  const db1 = Buffer.from(JSON.stringify(invalid), 'utf-8')
  fs.writeFileSync(`./data/nli-date-invalid_${type}.json`, db1)

  const db2 = Buffer.from(JSON.stringify(valid), 'utf-8')
  fs.writeFileSync(`./data/nli-date-valid_${type}.json`, db2)

  if (type == 'train') {
    output = pickTrainSet(output)
  } else if (type == 'dev') {
    output = pickDevSet(output)
  } else if (type == 'test') {
    output = pickDevSet(output)
  } else if (type == 'genre') {
    output = pickDevSet(output)
  }
  const db3 = Buffer.from(output.join('\n'), 'utf-8')
  fs.writeFileSync(`./data/tnli_${type}.jsonl`, db3)
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
        printProgress(sc)
        // console.log(`Reading sentence: ${sc}`)
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
  console.log(`\n${output.length} sentences are found.`)
  // console.log(patternCounter)
  const dataBuffer = Buffer.from(output.join('\n'), 'utf-8')
  fs.writeFileSync(`./data/${filename}_annotated.txt`, dataBuffer)
}

async function mixDatasetWithSnli(tnliPath, snliPath, type='train') {
  const fileStream1 = fs.createReadStream(tnliPath)
  const fileStream2 = fs.createReadStream(snliPath)
  const tnli = []
  const snli = []

  const rl1 = readline.createInterface({
    input: fileStream1,
    crlfDelay: Infinity
  });

  for await (const line of rl1) {
    tnli.push(line)
  }

  const rl2 = readline.createInterface({
    input: fileStream2,
    crlfDelay: Infinity
  });
  for await (const line of rl2) {
    snli.push(line)
  }
  
  fileStream1.destroy()
  fileStream2.destroy()

  let j = tnli.length
  while (j > 0) {
    let i = Math.floor(Math.random() * snli.length)
    if (type == 'genre') {
      console.log(`append tnli ${j} to mnli dev ${i} as genre time`)
      snli.push(tnli[j])
    } else {
      console.log(`inject tnli ${j} into snli ${i}`)
      snli[i] = tnli[j]
    }
    j--
  }
  const dataBuffer = Buffer.from(snli.join('\n'), 'utf-8')
  fs.writeFileSync(`./data/snli_${type}_mixed.jsonl`, dataBuffer)
}

if (process.argv.length < 3) {
  console.log('param function and file are expected')
}

if (process.argv[2] == 'generate') {
  processLineByLine(process.argv[3])
} else if (process.argv[2] == 'transform') {
  if (process.argv[3] == 'dev' || process.argv[3] == 'test' || process.argv[3] == 'genre') {
    transformLineByLine(process.argv[4], process.argv[3])
  } else {
    transformLineByLine(process.argv[3], 'train')
  }
} else if (process.argv[2] == 'mix') {
  let tnliPath = process.argv[3]
  let snliPath = process.argv[4]
  mixDatasetWithSnli(tnliPath, snliPath, process.argv[5] || 'train')
}