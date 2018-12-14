const MONTHS = {
  "january": 1,
  "february": 2,
  "march": 3,
  "april": 4,
  "may": 5,
  "june": 6,
  "july": 7,
  "august": 8,
  "september": 9,
  "october": 10,
  "november": 11,
  "december": 12
}

const DAYS = {
  "sunday": 0,
  "monday": 1,
  "tuesday": 2,
  "wednesday": 3,
  "thursday": 4,
  "friday": 5,
  "saturday": 6
}

const SEASONS = {
  "spring": 0,
  "summer": 1,
  "autumn": 2,
  "winter": 3
}

function next_mod(lookup, query, pointer) {
  let i = lookup.indexOf(query.toLowerCase()) + 1 * pointer
  i = i < 0 ? i + lookup.length : i
  let next_index = i % lookup.length
  return lookup[next_index]
}

function next_season(season, pointer) {
  let lookup = ["spring", "summer", "autumn", "winter"]
  return next_mod(lookup, season, pointer)
}

function next_date(date, pointer) {
  date = new Number(date)
  if (isNaN(date)) {
    return false
  }
  return (date + pointer).toString()
}

function next_day(day, pointer) {
  let lookup = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday"
  ]
  return next_mod(lookup, day, pointer)
}

function next_month(month, pointer) {
  let lookup = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october" ,
    "november" ,
    "december"
  ]
  return next_mod(lookup, month, pointer)
}

function next_year(year, pointer) {
  year = new Number(year)
  if (isNaN(year)) {
    return false
  }
  return (year + pointer).toString()
}

function could_be_hour(hour, width = null, hours12 = false) {
  hour = new Number(hour)
  if (isNaN(hour)) {
    return false
  }
  return hour >= 0 && hour <= (hours12 ? 12 : 24) && (width == null || width > 0)
}

function could_be_minute(minute, width = null) {
  minute = new Number(minute)
  if (isNaN(minute)) {
    return false
  }
  return minute >= 0 && minute <= 60 && (width == null || width <= 2)
}

function could_be_second(second, width = null) {
  second = new Number(second)
  if (isNaN(second)) {
    return false
  }
  return second >= 0 && second <= 60 && (width == null || width <= 2)
}

function could_be_day(date) {
  if (typeof day == 'string') {
    day = day.toLowerCase()
    return DAYS.hasOwnProperty(day)
  } else {
    return false
  }
}

function could_be_date(date) {
  date = new Number(date)
  if (isNaN(date)) {
    return false
  }
  return date >= 1 && date <= 31
}

function could_be_month(month, width = null) {
  if (typeof month == 'string') {
    month = month.toLowerCase()
    if (MONTHS.hasOwnProperty(month)) {
      month = MONTHS[month]
    } else {
      month = new Number(month)
    }
  }
  if (isNaN(month)) {
    return false
  }
  return month >= 1 && month <= 12 && (width == null || width <= 2)
}

function could_be_season(season) {
  season = season.toLowerCase()
  return SEASONS.hasOwnProperty(season)
}

function could_be_year(year, width = null) {
  year = new Number(year)
  if (isNaN(year)) {
    return false
  }
  return year >= 0 && year <= 9999 && (width == null || width == 2 || width == 4)
}

module.exports = {
  MONTHS: MONTHS,
  DAYS: DAYS,
  could_be_date: could_be_date,
  could_be_day: could_be_day,
  could_be_month: could_be_month,
  could_be_season: could_be_season,
  could_be_year: could_be_year,
  next_day: next_day,
  next_date: next_date,
  next_month: next_month,
  next_season: next_season,
  next_year:next_year 
}