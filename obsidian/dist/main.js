"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __typeError = (msg) => {
  throw TypeError(msg);
};
var __defNormalProp = (obj, key2, value) => key2 in obj ? __defProp(obj, key2, { enumerable: true, configurable: true, writable: true, value }) : obj[key2] = value;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key2 of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key2) && key2 !== except)
        __defProp(to, key2, { get: () => from[key2], enumerable: !(desc = __getOwnPropDesc(from, key2)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __publicField = (obj, key2, value) => __defNormalProp(obj, typeof key2 !== "symbol" ? key2 + "" : key2, value);
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);

// obsidian/main.js
var main_exports = {};
__export(main_exports, {
  default: () => TempvsPlugin
});
module.exports = __toCommonJS(main_exports);

// node_modules/ical.js/dist/ical.js
var Binary = class _Binary {
  /**
   * Creates a new ICAL.Binary instance
   *
   * @param {String} aValue     The binary data for this value
   */
  constructor(aValue) {
    /**
     * The type name, to be used in the jCal object.
     * @default "binary"
     * @constant
     */
    __publicField(this, "icaltype", "binary");
    this.value = aValue;
  }
  /**
   * Creates a binary value from the given string.
   *
   * @param {String} aString        The binary value string
   * @return {Binary}               The binary value instance
   */
  static fromString(aString) {
    return new _Binary(aString);
  }
  /**
   * Base64 decode the current value
   *
   * @return {String}         The base64-decoded value
   */
  decodeValue() {
    return this._b64_decode(this.value);
  }
  /**
   * Encodes the passed parameter with base64 and sets the internal
   * value to the result.
   *
   * @param {String} aValue      The raw binary value to encode
   */
  setEncodedValue(aValue) {
    this.value = this._b64_encode(aValue);
  }
  _b64_encode(data) {
    let b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    let o1, o2, o3, h1, h2, h3, h4, bits, i = 0, ac = 0, enc = "", tmp_arr = [];
    if (!data) {
      return data;
    }
    do {
      o1 = data.charCodeAt(i++);
      o2 = data.charCodeAt(i++);
      o3 = data.charCodeAt(i++);
      bits = o1 << 16 | o2 << 8 | o3;
      h1 = bits >> 18 & 63;
      h2 = bits >> 12 & 63;
      h3 = bits >> 6 & 63;
      h4 = bits & 63;
      tmp_arr[ac++] = b64.charAt(h1) + b64.charAt(h2) + b64.charAt(h3) + b64.charAt(h4);
    } while (i < data.length);
    enc = tmp_arr.join("");
    let r = data.length % 3;
    return (r ? enc.slice(0, r - 3) : enc) + "===".slice(r || 3);
  }
  _b64_decode(data) {
    let b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    let o1, o2, o3, h1, h2, h3, h4, bits, i = 0, ac = 0, dec = "", tmp_arr = [];
    if (!data) {
      return data;
    }
    data += "";
    do {
      h1 = b64.indexOf(data.charAt(i++));
      h2 = b64.indexOf(data.charAt(i++));
      h3 = b64.indexOf(data.charAt(i++));
      h4 = b64.indexOf(data.charAt(i++));
      bits = h1 << 18 | h2 << 12 | h3 << 6 | h4;
      o1 = bits >> 16 & 255;
      o2 = bits >> 8 & 255;
      o3 = bits & 255;
      if (h3 == 64) {
        tmp_arr[ac++] = String.fromCharCode(o1);
      } else if (h4 == 64) {
        tmp_arr[ac++] = String.fromCharCode(o1, o2);
      } else {
        tmp_arr[ac++] = String.fromCharCode(o1, o2, o3);
      }
    } while (i < data.length);
    dec = tmp_arr.join("");
    return dec;
  }
  /**
   * The string representation of this value
   * @return {String}
   */
  toString() {
    return this.value;
  }
};
var DURATION_LETTERS = /([PDWHMTS]{1,1})/;
var DATA_PROPS_TO_COPY = ["weeks", "days", "hours", "minutes", "seconds", "isNegative"];
var Duration = class _Duration {
  /**
   * Creates a new ICAL.Duration instance.
   *
   * @param {Object} data                 An object with members of the duration
   * @param {Number=} data.weeks          Duration in weeks
   * @param {Number=} data.days           Duration in days
   * @param {Number=} data.hours          Duration in hours
   * @param {Number=} data.minutes        Duration in minutes
   * @param {Number=} data.seconds        Duration in seconds
   * @param {Boolean=} data.isNegative    If true, the duration is negative
   */
  constructor(data) {
    /**
     * The weeks in this duration
     * @type {Number}
     * @default 0
     */
    __publicField(this, "weeks", 0);
    /**
     * The days in this duration
     * @type {Number}
     * @default 0
     */
    __publicField(this, "days", 0);
    /**
     * The days in this duration
     * @type {Number}
     * @default 0
     */
    __publicField(this, "hours", 0);
    /**
     * The minutes in this duration
     * @type {Number}
     * @default 0
     */
    __publicField(this, "minutes", 0);
    /**
     * The seconds in this duration
     * @type {Number}
     * @default 0
     */
    __publicField(this, "seconds", 0);
    /**
     * The seconds in this duration
     * @type {Boolean}
     * @default false
     */
    __publicField(this, "isNegative", false);
    /**
     * The class identifier.
     * @constant
     * @type {String}
     * @default "icalduration"
     */
    __publicField(this, "icalclass", "icalduration");
    /**
     * The type name, to be used in the jCal object.
     * @constant
     * @type {String}
     * @default "duration"
     */
    __publicField(this, "icaltype", "duration");
    this.wrappedJSObject = this;
    this.fromData(data);
  }
  /**
   * Returns a new ICAL.Duration instance from the passed seconds value.
   *
   * @param {Number} aSeconds       The seconds to create the instance from
   * @return {Duration}             The newly created duration instance
   */
  static fromSeconds(aSeconds) {
    return new _Duration().fromSeconds(aSeconds);
  }
  /**
   * Checks if the given string is an iCalendar duration value.
   *
   * @param {String} value      The raw ical value
   * @return {Boolean}          True, if the given value is of the
   *                              duration ical type
   */
  static isValueString(string) {
    return string[0] === "P" || string[1] === "P";
  }
  /**
   * Creates a new {@link ICAL.Duration} instance from the passed string.
   *
   * @param {String} aStr       The string to parse
   * @return {Duration}         The created duration instance
   */
  static fromString(aStr) {
    let pos = 0;
    let dict = /* @__PURE__ */ Object.create(null);
    let chunks = 0;
    while ((pos = aStr.search(DURATION_LETTERS)) !== -1) {
      let type = aStr[pos];
      let numeric = aStr.slice(0, Math.max(0, pos));
      aStr = aStr.slice(pos + 1);
      chunks += parseDurationChunk(type, numeric, dict);
    }
    if (chunks < 2) {
      throw new Error(
        'invalid duration value: Not enough duration components in "' + aStr + '"'
      );
    }
    return new _Duration(dict);
  }
  /**
   * Creates a new ICAL.Duration instance from the given data object.
   *
   * @param {Object} aData                An object with members of the duration
   * @param {Number=} aData.weeks         Duration in weeks
   * @param {Number=} aData.days          Duration in days
   * @param {Number=} aData.hours         Duration in hours
   * @param {Number=} aData.minutes       Duration in minutes
   * @param {Number=} aData.seconds       Duration in seconds
   * @param {Boolean=} aData.isNegative   If true, the duration is negative
   * @return {Duration}                   The createad duration instance
   */
  static fromData(aData) {
    return new _Duration(aData);
  }
  /**
   * Returns a clone of the duration object.
   *
   * @return {Duration}      The cloned object
   */
  clone() {
    return _Duration.fromData(this);
  }
  /**
   * The duration value expressed as a number of seconds.
   *
   * @return {Number}             The duration value in seconds
   */
  toSeconds() {
    let seconds = this.seconds + 60 * this.minutes + 3600 * this.hours + 86400 * this.days + 7 * 86400 * this.weeks;
    return this.isNegative ? -seconds : seconds;
  }
  /**
   * Reads the passed seconds value into this duration object. Afterwards,
   * members like {@link ICAL.Duration#days days} and {@link ICAL.Duration#weeks weeks} will be set up
   * accordingly.
   *
   * @param {Number} aSeconds     The duration value in seconds
   * @return {Duration}           Returns this instance
   */
  fromSeconds(aSeconds) {
    let secs = Math.abs(aSeconds);
    this.isNegative = aSeconds < 0;
    this.days = trunc(secs / 86400);
    if (this.days % 7 == 0) {
      this.weeks = this.days / 7;
      this.days = 0;
    } else {
      this.weeks = 0;
    }
    secs -= (this.days + 7 * this.weeks) * 86400;
    this.hours = trunc(secs / 3600);
    secs -= this.hours * 3600;
    this.minutes = trunc(secs / 60);
    secs -= this.minutes * 60;
    this.seconds = secs;
    return this;
  }
  /**
   * Sets up the current instance using members from the passed data object.
   *
   * @param {Object} aData                An object with members of the duration
   * @param {Number=} aData.weeks         Duration in weeks
   * @param {Number=} aData.days          Duration in days
   * @param {Number=} aData.hours         Duration in hours
   * @param {Number=} aData.minutes       Duration in minutes
   * @param {Number=} aData.seconds       Duration in seconds
   * @param {Boolean=} aData.isNegative   If true, the duration is negative
   */
  fromData(aData) {
    for (let prop of DATA_PROPS_TO_COPY) {
      if (aData && prop in aData) {
        this[prop] = aData[prop];
      } else {
        this[prop] = 0;
      }
    }
  }
  /**
   * Resets the duration instance to the default values, i.e. PT0S
   */
  reset() {
    this.isNegative = false;
    this.weeks = 0;
    this.days = 0;
    this.hours = 0;
    this.minutes = 0;
    this.seconds = 0;
  }
  /**
   * Compares the duration instance with another one.
   *
   * @param {Duration} aOther             The instance to compare with
   * @return {Number}                     -1, 0 or 1 for less/equal/greater
   */
  compare(aOther) {
    let thisSeconds = this.toSeconds();
    let otherSeconds = aOther.toSeconds();
    return (thisSeconds > otherSeconds) - (thisSeconds < otherSeconds);
  }
  /**
   * Normalizes the duration instance. For example, a duration with a value
   * of 61 seconds will be normalized to 1 minute and 1 second.
   */
  normalize() {
    this.fromSeconds(this.toSeconds());
  }
  /**
   * The string representation of this duration.
   * @return {String}
   */
  toString() {
    if (this.toSeconds() == 0) {
      return "PT0S";
    } else {
      let str = "";
      if (this.isNegative) str += "-";
      str += "P";
      let hasWeeks = false;
      if (this.weeks) {
        if (this.days || this.hours || this.minutes || this.seconds) {
          str += this.weeks * 7 + this.days + "D";
        } else {
          str += this.weeks + "W";
          hasWeeks = true;
        }
      } else if (this.days) {
        str += this.days + "D";
      }
      if (!hasWeeks) {
        if (this.hours || this.minutes || this.seconds) {
          str += "T";
          if (this.hours) {
            str += this.hours + "H";
          }
          if (this.minutes) {
            str += this.minutes + "M";
          }
          if (this.seconds) {
            str += this.seconds + "S";
          }
        }
      }
      return str;
    }
  }
  /**
   * The iCalendar string representation of this duration.
   * @return {String}
   */
  toICALString() {
    return this.toString();
  }
};
function parseDurationChunk(letter, number, object) {
  let type;
  switch (letter) {
    case "P":
      if (number && number === "-") {
        object.isNegative = true;
      } else {
        object.isNegative = false;
      }
      break;
    case "D":
      type = "days";
      break;
    case "W":
      type = "weeks";
      break;
    case "H":
      type = "hours";
      break;
    case "M":
      type = "minutes";
      break;
    case "S":
      type = "seconds";
      break;
    default:
      return 0;
  }
  if (type) {
    if (!number && number !== 0) {
      throw new Error(
        'invalid duration value: Missing number before "' + letter + '"'
      );
    }
    let num = parseInt(number, 10);
    if (isStrictlyNaN(num)) {
      throw new Error(
        'invalid duration value: Invalid number "' + number + '" before "' + letter + '"'
      );
    }
    object[type] = num;
  }
  return 1;
}
var Period = class _Period {
  /**
   * Creates a new ICAL.Period instance. The passed data object cannot contain both and end date and
   * a duration.
   *
   * @param {Object} aData                  An object with members of the period
   * @param {Time=} aData.start             The start of the period
   * @param {Time=} aData.end               The end of the period
   * @param {Duration=} aData.duration      The duration of the period
   */
  constructor(aData) {
    /**
     * The start of the period
     * @type {Time}
     */
    __publicField(this, "start", null);
    /**
     * The end of the period
     * @type {Time}
     */
    __publicField(this, "end", null);
    /**
     * The duration of the period
     * @type {Duration}
     */
    __publicField(this, "duration", null);
    /**
     * The class identifier.
     * @constant
     * @type {String}
     * @default "icalperiod"
     */
    __publicField(this, "icalclass", "icalperiod");
    /**
     * The type name, to be used in the jCal object.
     * @constant
     * @type {String}
     * @default "period"
     */
    __publicField(this, "icaltype", "period");
    this.wrappedJSObject = this;
    if (aData && "start" in aData) {
      if (aData.start && !(aData.start instanceof Time)) {
        throw new TypeError(".start must be an instance of ICAL.Time");
      }
      this.start = aData.start;
    }
    if (aData && aData.end && aData.duration) {
      throw new Error("cannot accept both end and duration");
    }
    if (aData && "end" in aData) {
      if (aData.end && !(aData.end instanceof Time)) {
        throw new TypeError(".end must be an instance of ICAL.Time");
      }
      this.end = aData.end;
    }
    if (aData && "duration" in aData) {
      if (aData.duration && !(aData.duration instanceof Duration)) {
        throw new TypeError(".duration must be an instance of ICAL.Duration");
      }
      this.duration = aData.duration;
    }
  }
  /**
   * Creates a new {@link ICAL.Period} instance from the passed string.
   *
   * @param {String} str            The string to parse
   * @param {Property} prop         The property this period will be on
   * @return {Period}               The created period instance
   */
  static fromString(str, prop) {
    let parts = str.split("/");
    if (parts.length !== 2) {
      throw new Error(
        'Invalid string value: "' + str + '" must contain a "/" char.'
      );
    }
    let options = {
      start: Time.fromDateTimeString(parts[0], prop)
    };
    let end = parts[1];
    if (Duration.isValueString(end)) {
      options.duration = Duration.fromString(end);
    } else {
      options.end = Time.fromDateTimeString(end, prop);
    }
    return new _Period(options);
  }
  /**
   * Creates a new {@link ICAL.Period} instance from the given data object.
   * The passed data object cannot contain both and end date and a duration.
   *
   * @param {Object} aData                  An object with members of the period
   * @param {Time=} aData.start             The start of the period
   * @param {Time=} aData.end               The end of the period
   * @param {Duration=} aData.duration      The duration of the period
   * @return {Period}                       The period instance
   */
  static fromData(aData) {
    return new _Period(aData);
  }
  /**
   * Returns a new period instance from the given jCal data array. The first
   * member is always the start date string, the second member is either a
   * duration or end date string.
   *
   * @param {jCalComponent} aData           The jCal data array
   * @param {Property} aProp                The property this jCal data is on
   * @param {Boolean} aLenient              If true, data value can be both date and date-time
   * @return {Period}                       The period instance
   */
  static fromJSON(aData, aProp, aLenient) {
    function fromDateOrDateTimeString(aValue, dateProp) {
      if (aLenient) {
        return Time.fromString(aValue, dateProp);
      } else {
        return Time.fromDateTimeString(aValue, dateProp);
      }
    }
    if (Duration.isValueString(aData[1])) {
      return _Period.fromData({
        start: fromDateOrDateTimeString(aData[0], aProp),
        duration: Duration.fromString(aData[1])
      });
    } else {
      return _Period.fromData({
        start: fromDateOrDateTimeString(aData[0], aProp),
        end: fromDateOrDateTimeString(aData[1], aProp)
      });
    }
  }
  /**
   * Returns a clone of the duration object.
   *
   * @return {Period}      The cloned object
   */
  clone() {
    return _Period.fromData({
      start: this.start ? this.start.clone() : null,
      end: this.end ? this.end.clone() : null,
      duration: this.duration ? this.duration.clone() : null
    });
  }
  /**
   * Calculates the duration of the period, either directly or by subtracting
   * start from end date.
   *
   * @return {Duration}      The calculated duration
   */
  getDuration() {
    if (this.duration) {
      return this.duration;
    } else {
      return this.end.subtractDate(this.start);
    }
  }
  /**
   * Calculates the end date of the period, either directly or by adding
   * duration to start date.
   *
   * @return {Time}          The calculated end date
   */
  getEnd() {
    if (this.end) {
      return this.end;
    } else {
      let end = this.start.clone();
      end.addDuration(this.duration);
      return end;
    }
  }
  /**
   * Compare this period with a date or other period. To maintain the logic where a.compare(b)
   * returns 1 when a > b, this function will return 1 when the period is after the date, 0 when the
   * date is within the period, and -1 when the period is before the date. When comparing two
   * periods, as soon as they overlap in any way this will return 0.
   *
   * @param {Time|Period} dt    The date or other period to compare with
   */
  compare(dt) {
    if (dt.compare(this.start) < 0) {
      return 1;
    } else if (dt.compare(this.getEnd()) > 0) {
      return -1;
    } else {
      return 0;
    }
  }
  /**
   * The string representation of this period.
   * @return {String}
   */
  toString() {
    return this.start + "/" + (this.end || this.duration);
  }
  /**
   * The jCal representation of this period type.
   * @return {Object}
   */
  toJSON() {
    return [this.start.toString(), (this.end || this.duration).toString()];
  }
  /**
   * The iCalendar string representation of this period.
   * @return {String}
   */
  toICALString() {
    return this.start.toICALString() + "/" + (this.end || this.duration).toICALString();
  }
};
var _epochTime;
var _Time = class _Time {
  // MONDAY
  /**
   * Creates a new ICAL.Time instance.
   *
   * @param {timeInit} data           Time initialization
   * @param {Timezone} zone           timezone this position occurs in
   */
  constructor(data, zone) {
    /**
     * The class identifier.
     * @constant
     * @type {String}
     * @default "icaltime"
     */
    __publicField(this, "icalclass", "icaltime");
    __publicField(this, "_cachedUnixTime", null);
    /**
     * The timezone for this time.
     * @type {Timezone}
     */
    __publicField(this, "zone", null);
    /**
     * Internal uses to indicate that a change has been made and the next read
     * operation must attempt to normalize the value (for example changing the
     * day to 33).
     *
     * @type {Boolean}
     * @private
     */
    __publicField(this, "_pendingNormalization", false);
    this.wrappedJSObject = this;
    this._time = /* @__PURE__ */ Object.create(null);
    this._time.year = 0;
    this._time.month = 1;
    this._time.day = 1;
    this._time.hour = 0;
    this._time.minute = 0;
    this._time.second = 0;
    this._time.isDate = false;
    this.fromData(data, zone);
  }
  /**
   * Returns the days in the given month
   *
   * @param {Number} month      The month to check
   * @param {Number} year       The year to check
   * @return {Number}           The number of days in the month
   */
  static daysInMonth(month, year) {
    let _daysInMonth = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let days = 30;
    if (month < 1 || month > 12) return days;
    days = _daysInMonth[month];
    if (month == 2) {
      days += _Time.isLeapYear(year);
    }
    return days;
  }
  /**
   * Checks if the year is a leap year
   *
   * @param {Number} year       The year to check
   * @return {Boolean}          True, if the year is a leap year
   */
  static isLeapYear(year) {
    if (year <= 1752) {
      return year % 4 == 0;
    } else {
      return year % 4 == 0 && year % 100 != 0 || year % 400 == 0;
    }
  }
  /**
   * Create a new ICAL.Time from the day of year and year. The date is returned
   * in floating timezone.
   *
   * @param {Number} aDayOfYear     The day of year
   * @param {Number} aYear          The year to create the instance in
   * @return {Time}                 The created instance with the calculated date
   */
  static fromDayOfYear(aDayOfYear, aYear) {
    let year = aYear;
    let doy = aDayOfYear;
    let tt = new _Time();
    tt.auto_normalize = false;
    let is_leap = _Time.isLeapYear(year) ? 1 : 0;
    if (doy < 1) {
      year--;
      is_leap = _Time.isLeapYear(year) ? 1 : 0;
      doy += _Time.daysInYearPassedMonth[is_leap][12];
      return _Time.fromDayOfYear(doy, year);
    } else if (doy > _Time.daysInYearPassedMonth[is_leap][12]) {
      is_leap = _Time.isLeapYear(year) ? 1 : 0;
      doy -= _Time.daysInYearPassedMonth[is_leap][12];
      year++;
      return _Time.fromDayOfYear(doy, year);
    }
    tt.year = year;
    tt.isDate = true;
    for (let month = 11; month >= 0; month--) {
      if (doy > _Time.daysInYearPassedMonth[is_leap][month]) {
        tt.month = month + 1;
        tt.day = doy - _Time.daysInYearPassedMonth[is_leap][month];
        break;
      }
    }
    tt.auto_normalize = true;
    return tt;
  }
  /**
   * Returns a new ICAL.Time instance from a date string, e.g 2015-01-02.
   *
   * @deprecated                Use {@link ICAL.Time.fromDateString} instead
   * @param {String} str        The string to create from
   * @return {Time}             The date/time instance
   */
  static fromStringv2(str) {
    return new _Time({
      year: parseInt(str.slice(0, 4), 10),
      month: parseInt(str.slice(5, 7), 10),
      day: parseInt(str.slice(8, 10), 10),
      isDate: true
    });
  }
  /**
   * Returns a new ICAL.Time instance from a date string, e.g 2015-01-02.
   *
   * @param {String} aValue     The string to create from
   * @return {Time}             The date/time instance
   */
  static fromDateString(aValue) {
    return new _Time({
      year: strictParseInt(aValue.slice(0, 4)),
      month: strictParseInt(aValue.slice(5, 7)),
      day: strictParseInt(aValue.slice(8, 10)),
      isDate: true
    });
  }
  /**
   * Returns a new ICAL.Time instance from a date-time string, e.g
   * 2015-01-02T03:04:05. If a property is specified, the timezone is set up
   * from the property's TZID parameter.
   *
   * @param {String} aValue         The string to create from
   * @param {Property=} prop        The property the date belongs to
   * @return {Time}                 The date/time instance
   */
  static fromDateTimeString(aValue, prop) {
    if (aValue.length < 19) {
      throw new Error(
        'invalid date-time value: "' + aValue + '"'
      );
    }
    let zone;
    let zoneId;
    if (aValue.slice(-1) === "Z") {
      zone = Timezone.utcTimezone;
    } else if (prop) {
      zoneId = prop.getParameter("tzid");
      if (prop.parent) {
        if (prop.parent.name === "standard" || prop.parent.name === "daylight") {
          zone = Timezone.localTimezone;
        } else if (zoneId) {
          zone = prop.parent.getTimeZoneByID(zoneId);
        }
      }
    }
    const timeData = {
      year: strictParseInt(aValue.slice(0, 4)),
      month: strictParseInt(aValue.slice(5, 7)),
      day: strictParseInt(aValue.slice(8, 10)),
      hour: strictParseInt(aValue.slice(11, 13)),
      minute: strictParseInt(aValue.slice(14, 16)),
      second: strictParseInt(aValue.slice(17, 19))
    };
    if (zoneId && !zone) {
      timeData.timezone = zoneId;
    }
    return new _Time(timeData, zone);
  }
  /**
   * Returns a new ICAL.Time instance from a date or date-time string,
   *
   * @param {String} aValue         The string to create from
   * @param {Property=} prop        The property the date belongs to
   * @return {Time}                 The date/time instance
   */
  static fromString(aValue, aProperty) {
    if (aValue.length > 10) {
      return _Time.fromDateTimeString(aValue, aProperty);
    } else {
      return _Time.fromDateString(aValue);
    }
  }
  /**
   * Creates a new ICAL.Time instance from the given Javascript Date.
   *
   * @param {?Date} aDate             The Javascript Date to read, or null to reset
   * @param {Boolean} [useUTC=false]  If true, the UTC values of the date will be used
   */
  static fromJSDate(aDate, useUTC) {
    let tt = new _Time();
    return tt.fromJSDate(aDate, useUTC);
  }
  /**
   * Creates a new ICAL.Time instance from the current moment.
   * The instance is “floating” - has no timezone relation.
   * To create an instance considering the time zone, call
   * ICAL.Time.fromJSDate(new Date(), true)
   * @return {Time}
   */
  static now() {
    return _Time.fromJSDate(/* @__PURE__ */ new Date(), false);
  }
  /**
   * Returns the date on which ISO week number 1 starts.
   *
   * @see Time#weekNumber
   * @param {Number} aYear                  The year to search in
   * @param {weekDay=} aWeekStart           The week start weekday, used for calculation.
   * @return {Time}                         The date on which week number 1 starts
   */
  static weekOneStarts(aYear, aWeekStart) {
    let t = _Time.fromData({
      year: aYear,
      month: 1,
      day: 1,
      isDate: true
    });
    let dow = t.dayOfWeek();
    let wkst = aWeekStart || _Time.DEFAULT_WEEK_START;
    if (dow > _Time.THURSDAY) {
      t.day += 7;
    }
    if (wkst > _Time.THURSDAY) {
      t.day -= 7;
    }
    t.day -= dow - wkst;
    return t;
  }
  /**
   * Get the dominical letter for the given year. Letters range from A - G for
   * common years, and AG to GF for leap years.
   *
   * @param {Number} yr           The year to retrieve the letter for
   * @return {String}             The dominical letter.
   */
  static getDominicalLetter(yr) {
    let LTRS = "GFEDCBA";
    let dom = (yr + (yr / 4 | 0) + (yr / 400 | 0) - (yr / 100 | 0) - 1) % 7;
    let isLeap = _Time.isLeapYear(yr);
    if (isLeap) {
      return LTRS[(dom + 6) % 7] + LTRS[dom];
    } else {
      return LTRS[dom];
    }
  }
  /**
   * January 1st, 1970 as an ICAL.Time.
   * @type {Time}
   * @constant
   * @instance
   */
  static get epochTime() {
    if (!__privateGet(this, _epochTime)) {
      __privateSet(this, _epochTime, _Time.fromData({
        year: 1970,
        month: 1,
        day: 1,
        hour: 0,
        minute: 0,
        second: 0,
        isDate: false,
        timezone: "Z"
      }));
    }
    return __privateGet(this, _epochTime);
  }
  static _cmp_attr(a, b, attr) {
    if (a[attr] > b[attr]) return 1;
    if (a[attr] < b[attr]) return -1;
    return 0;
  }
  /**
   * The type name, to be used in the jCal object. This value may change and
   * is strictly defined by the {@link ICAL.Time#isDate isDate} member.
   * @type {String}
   * @default "date-time"
   */
  get icaltype() {
    return this.isDate ? "date" : "date-time";
  }
  /**
   * The year of this date.
   * @type {Number}
   */
  get year() {
    return this._getTimeAttr("year");
  }
  set year(val) {
    this._setTimeAttr("year", val);
  }
  /**
   * The month of this date.
   * @type {Number}
   */
  get month() {
    return this._getTimeAttr("month");
  }
  set month(val) {
    this._setTimeAttr("month", val);
  }
  /**
   * The day of this date.
   * @type {Number}
   */
  get day() {
    return this._getTimeAttr("day");
  }
  set day(val) {
    this._setTimeAttr("day", val);
  }
  /**
   * The hour of this date-time.
   * @type {Number}
   */
  get hour() {
    return this._getTimeAttr("hour");
  }
  set hour(val) {
    this._setTimeAttr("hour", val);
  }
  /**
   * The minute of this date-time.
   * @type {Number}
   */
  get minute() {
    return this._getTimeAttr("minute");
  }
  set minute(val) {
    this._setTimeAttr("minute", val);
  }
  /**
   * The second of this date-time.
   * @type {Number}
   */
  get second() {
    return this._getTimeAttr("second");
  }
  set second(val) {
    this._setTimeAttr("second", val);
  }
  /**
   * If true, the instance represents a date (as opposed to a date-time)
   * @type {Boolean}
   */
  get isDate() {
    return this._getTimeAttr("isDate");
  }
  set isDate(val) {
    this._setTimeAttr("isDate", val);
  }
  /**
   * @private
   * @param {String} attr             Attribute to get (one of: year, month,
   *                                  day, hour, minute, second, isDate)
   * @return {Number|Boolean}         Current value for the attribute
   */
  _getTimeAttr(attr) {
    if (this._pendingNormalization) {
      this._normalize();
      this._pendingNormalization = false;
    }
    return this._time[attr];
  }
  /**
   * @private
   * @param {String} attr             Attribute to set (one of: year, month,
   *                                  day, hour, minute, second, isDate)
   * @param {Number|Boolean} val      New value for the attribute
   */
  _setTimeAttr(attr, val) {
    if (attr === "isDate" && val && !this._time.isDate) {
      this.adjust(0, 0, 0, 0);
    }
    this._cachedUnixTime = null;
    this._pendingNormalization = true;
    this._time[attr] = val;
  }
  /**
   * Returns a clone of the time object.
   *
   * @return {Time}              The cloned object
   */
  clone() {
    return new _Time(this._time, this.zone);
  }
  /**
   * Reset the time instance to epoch time
   */
  reset() {
    this.fromData(_Time.epochTime);
    this.zone = Timezone.utcTimezone;
  }
  /**
   * Reset the time instance to the given date/time values.
   *
   * @param {Number} year             The year to set
   * @param {Number} month            The month to set
   * @param {Number} day              The day to set
   * @param {Number} hour             The hour to set
   * @param {Number} minute           The minute to set
   * @param {Number} second           The second to set
   * @param {Timezone} timezone       The timezone to set
   */
  resetTo(year, month, day, hour, minute, second, timezone) {
    this.fromData({
      year,
      month,
      day,
      hour,
      minute,
      second,
      zone: timezone
    });
  }
  /**
   * Set up the current instance from the Javascript date value.
   *
   * @param {?Date} aDate             The Javascript Date to read, or null to reset
   * @param {Boolean} [useUTC=false]  If true, the UTC values of the date will be used
   */
  fromJSDate(aDate, useUTC) {
    if (!aDate) {
      this.reset();
    } else {
      if (useUTC) {
        this.zone = Timezone.utcTimezone;
        this.year = aDate.getUTCFullYear();
        this.month = aDate.getUTCMonth() + 1;
        this.day = aDate.getUTCDate();
        this.hour = aDate.getUTCHours();
        this.minute = aDate.getUTCMinutes();
        this.second = aDate.getUTCSeconds();
      } else {
        this.zone = Timezone.localTimezone;
        this.year = aDate.getFullYear();
        this.month = aDate.getMonth() + 1;
        this.day = aDate.getDate();
        this.hour = aDate.getHours();
        this.minute = aDate.getMinutes();
        this.second = aDate.getSeconds();
      }
    }
    this._cachedUnixTime = null;
    return this;
  }
  /**
   * Sets up the current instance using members from the passed data object.
   *
   * @param {timeInit} aData          Time initialization
   * @param {Timezone=} aZone         Timezone this position occurs in
   */
  fromData(aData, aZone) {
    if (aData) {
      for (let [key2, value] of Object.entries(aData)) {
        if (key2 === "icaltype") continue;
        this[key2] = value;
      }
    }
    if (aZone) {
      this.zone = aZone;
    }
    if (aData && !("isDate" in aData)) {
      this.isDate = !("hour" in aData);
    } else if (aData && "isDate" in aData) {
      this.isDate = aData.isDate;
    }
    if (aData && "timezone" in aData) {
      let zone = TimezoneService.get(
        aData.timezone
      );
      this.zone = zone || Timezone.localTimezone;
    }
    if (aData && "zone" in aData) {
      this.zone = aData.zone;
    }
    if (!this.zone) {
      this.zone = Timezone.localTimezone;
    }
    this._cachedUnixTime = null;
    return this;
  }
  /**
   * Calculate the day of week.
   * @param {weekDay=} aWeekStart
   *        The week start weekday, defaults to SUNDAY
   * @return {weekDay}
   */
  dayOfWeek(aWeekStart) {
    let firstDow = aWeekStart || _Time.SUNDAY;
    let dowCacheKey = (this.year << 12) + (this.month << 8) + (this.day << 3) + firstDow;
    if (dowCacheKey in _Time._dowCache) {
      return _Time._dowCache[dowCacheKey];
    }
    let q = this.day;
    let m = this.month + (this.month < 3 ? 12 : 0);
    let Y = this.year - (this.month < 3 ? 1 : 0);
    let h = q + Y + trunc((m + 1) * 26 / 10) + trunc(Y / 4);
    {
      h += trunc(Y / 100) * 6 + trunc(Y / 400);
    }
    h = (h + 7 - firstDow) % 7 + 1;
    _Time._dowCache[dowCacheKey] = h;
    return h;
  }
  /**
   * Calculate the day of year.
   * @return {Number}
   */
  dayOfYear() {
    let is_leap = _Time.isLeapYear(this.year) ? 1 : 0;
    let diypm = _Time.daysInYearPassedMonth;
    return diypm[is_leap][this.month - 1] + this.day;
  }
  /**
   * Returns a copy of the current date/time, rewound to the start of the
   * week. The resulting ICAL.Time instance is of icaltype date, even if this
   * is a date-time.
   *
   * @param {weekDay=} aWeekStart
   *        The week start weekday, defaults to SUNDAY
   * @return {Time}      The start of the week (cloned)
   */
  startOfWeek(aWeekStart) {
    let firstDow = aWeekStart || _Time.SUNDAY;
    let result = this.clone();
    result.day -= (this.dayOfWeek() + 7 - firstDow) % 7;
    result.isDate = true;
    result.hour = 0;
    result.minute = 0;
    result.second = 0;
    return result;
  }
  /**
   * Returns a copy of the current date/time, shifted to the end of the week.
   * The resulting ICAL.Time instance is of icaltype date, even if this is a
   * date-time.
   *
   * @param {weekDay=} aWeekStart
   *        The week start weekday, defaults to SUNDAY
   * @return {Time}      The end of the week (cloned)
   */
  endOfWeek(aWeekStart) {
    let firstDow = aWeekStart || _Time.SUNDAY;
    let result = this.clone();
    result.day += (7 - this.dayOfWeek() + firstDow - _Time.SUNDAY) % 7;
    result.isDate = true;
    result.hour = 0;
    result.minute = 0;
    result.second = 0;
    return result;
  }
  /**
   * Returns a copy of the current date/time, rewound to the start of the
   * month. The resulting ICAL.Time instance is of icaltype date, even if
   * this is a date-time.
   *
   * @return {Time}      The start of the month (cloned)
   */
  startOfMonth() {
    let result = this.clone();
    result.day = 1;
    result.isDate = true;
    result.hour = 0;
    result.minute = 0;
    result.second = 0;
    return result;
  }
  /**
   * Returns a copy of the current date/time, shifted to the end of the
   * month.  The resulting ICAL.Time instance is of icaltype date, even if
   * this is a date-time.
   *
   * @return {Time}      The end of the month (cloned)
   */
  endOfMonth() {
    let result = this.clone();
    result.day = _Time.daysInMonth(result.month, result.year);
    result.isDate = true;
    result.hour = 0;
    result.minute = 0;
    result.second = 0;
    return result;
  }
  /**
   * Returns a copy of the current date/time, rewound to the start of the
   * year. The resulting ICAL.Time instance is of icaltype date, even if
   * this is a date-time.
   *
   * @return {Time}      The start of the year (cloned)
   */
  startOfYear() {
    let result = this.clone();
    result.day = 1;
    result.month = 1;
    result.isDate = true;
    result.hour = 0;
    result.minute = 0;
    result.second = 0;
    return result;
  }
  /**
   * Returns a copy of the current date/time, shifted to the end of the
   * year.  The resulting ICAL.Time instance is of icaltype date, even if
   * this is a date-time.
   *
   * @return {Time}      The end of the year (cloned)
   */
  endOfYear() {
    let result = this.clone();
    result.day = 31;
    result.month = 12;
    result.isDate = true;
    result.hour = 0;
    result.minute = 0;
    result.second = 0;
    return result;
  }
  /**
   * First calculates the start of the week, then returns the day of year for
   * this date. If the day falls into the previous year, the day is zero or negative.
   *
   * @param {weekDay=} aFirstDayOfWeek
   *        The week start weekday, defaults to SUNDAY
   * @return {Number}     The calculated day of year
   */
  startDoyWeek(aFirstDayOfWeek) {
    let firstDow = aFirstDayOfWeek || _Time.SUNDAY;
    let delta = this.dayOfWeek() - firstDow;
    if (delta < 0) delta += 7;
    return this.dayOfYear() - delta;
  }
  /**
   * Get the dominical letter for the current year. Letters range from A - G
   * for common years, and AG to GF for leap years.
   *
   * @param {Number} yr           The year to retrieve the letter for
   * @return {String}             The dominical letter.
   */
  getDominicalLetter() {
    return _Time.getDominicalLetter(this.year);
  }
  /**
   * Finds the nthWeekDay relative to the current month (not day).  The
   * returned value is a day relative the month that this month belongs to so
   * 1 would indicate the first of the month and 40 would indicate a day in
   * the following month.
   *
   * @param {Number} aDayOfWeek   Day of the week see the day name constants
   * @param {Number} aPos         Nth occurrence of a given week day values
   *        of 1 and 0 both indicate the first weekday of that type. aPos may
   *        be either positive or negative
   *
   * @return {Number} numeric value indicating a day relative
   *                   to the current month of this time object
   */
  nthWeekDay(aDayOfWeek, aPos) {
    let daysInMonth = _Time.daysInMonth(this.month, this.year);
    let weekday;
    let pos = aPos;
    let start = 0;
    let otherDay = this.clone();
    if (pos >= 0) {
      otherDay.day = 1;
      if (pos != 0) {
        pos--;
      }
      start = otherDay.day;
      let startDow = otherDay.dayOfWeek();
      let offset = aDayOfWeek - startDow;
      if (offset < 0)
        offset += 7;
      start += offset;
      start -= aDayOfWeek;
      weekday = aDayOfWeek;
    } else {
      otherDay.day = daysInMonth;
      let endDow = otherDay.dayOfWeek();
      pos++;
      weekday = endDow - aDayOfWeek;
      if (weekday < 0) {
        weekday += 7;
      }
      weekday = daysInMonth - weekday;
    }
    weekday += pos * 7;
    return start + weekday;
  }
  /**
   * Checks if current time is the nth weekday, relative to the current
   * month.  Will always return false when rule resolves outside of current
   * month.
   *
   * @param {weekDay} aDayOfWeek                 Day of week to check
   * @param {Number} aPos                        Relative position
   * @return {Boolean}                           True, if it is the nth weekday
   */
  isNthWeekDay(aDayOfWeek, aPos) {
    let dow = this.dayOfWeek();
    if (aPos === 0 && dow === aDayOfWeek) {
      return true;
    }
    let day = this.nthWeekDay(aDayOfWeek, aPos);
    if (day === this.day) {
      return true;
    }
    return false;
  }
  /**
   * Calculates the ISO 8601 week number. The first week of a year is the
   * week that contains the first Thursday. The year can have 53 weeks, if
   * January 1st is a Friday.
   *
   * Note there are regions where the first week of the year is the one that
   * starts on January 1st, which may offset the week number. Also, if a
   * different week start is specified, this will also affect the week
   * number.
   *
   * @see Time.weekOneStarts
   * @param {weekDay} aWeekStart                  The weekday the week starts with
   * @return {Number}                             The ISO week number
   */
  weekNumber(aWeekStart) {
    let wnCacheKey = (this.year << 12) + (this.month << 8) + (this.day << 3) + aWeekStart;
    if (wnCacheKey in _Time._wnCache) {
      return _Time._wnCache[wnCacheKey];
    }
    let week1;
    let dt = this.clone();
    dt.isDate = true;
    let isoyear = this.year;
    if (dt.month == 12 && dt.day > 25) {
      week1 = _Time.weekOneStarts(isoyear + 1, aWeekStart);
      if (dt.compare(week1) < 0) {
        week1 = _Time.weekOneStarts(isoyear, aWeekStart);
      } else {
        isoyear++;
      }
    } else {
      week1 = _Time.weekOneStarts(isoyear, aWeekStart);
      if (dt.compare(week1) < 0) {
        week1 = _Time.weekOneStarts(--isoyear, aWeekStart);
      }
    }
    let daysBetween = dt.subtractDate(week1).toSeconds() / 86400;
    let answer = trunc(daysBetween / 7) + 1;
    _Time._wnCache[wnCacheKey] = answer;
    return answer;
  }
  /**
   * Adds the duration to the current time. The instance is modified in
   * place.
   *
   * @param {Duration} aDuration         The duration to add
   */
  addDuration(aDuration) {
    let mult = aDuration.isNegative ? -1 : 1;
    let second = this.second;
    let minute = this.minute;
    let hour = this.hour;
    let day = this.day;
    second += mult * aDuration.seconds;
    minute += mult * aDuration.minutes;
    hour += mult * aDuration.hours;
    day += mult * aDuration.days;
    day += mult * 7 * aDuration.weeks;
    this.second = second;
    this.minute = minute;
    this.hour = hour;
    this.day = day;
    this._cachedUnixTime = null;
  }
  /**
   * Subtract the date details (_excluding_ timezone).  Useful for finding
   * the relative difference between two time objects excluding their
   * timezone differences.
   *
   * @param {Time} aDate     The date to subtract
   * @return {Duration}      The difference as a duration
   */
  subtractDate(aDate) {
    let unixTime = this.toUnixTime() + this.utcOffset();
    let other = aDate.toUnixTime() + aDate.utcOffset();
    return Duration.fromSeconds(unixTime - other);
  }
  /**
   * Subtract the date details, taking timezones into account.
   *
   * @param {Time} aDate  The date to subtract
   * @return {Duration}   The difference in duration
   */
  subtractDateTz(aDate) {
    let unixTime = this.toUnixTime();
    let other = aDate.toUnixTime();
    return Duration.fromSeconds(unixTime - other);
  }
  /**
   * Compares the ICAL.Time instance with another one, or a period.
   *
   * @param {Time|Period} aOther                  The instance to compare with
   * @return {Number}                             -1, 0 or 1 for less/equal/greater
   */
  compare(other) {
    if (other instanceof Period) {
      return -1 * other.compare(this);
    } else {
      let a = this.toUnixTime();
      let b = other.toUnixTime();
      if (a > b) return 1;
      if (b > a) return -1;
      return 0;
    }
  }
  /**
   * Compares only the date part of this instance with another one.
   *
   * @param {Time} other                  The instance to compare with
   * @param {Timezone} tz                 The timezone to compare in
   * @return {Number}                     -1, 0 or 1 for less/equal/greater
   */
  compareDateOnlyTz(other, tz) {
    let a = this.convertToZone(tz);
    let b = other.convertToZone(tz);
    let rc = 0;
    if ((rc = _Time._cmp_attr(a, b, "year")) != 0) return rc;
    if ((rc = _Time._cmp_attr(a, b, "month")) != 0) return rc;
    if ((rc = _Time._cmp_attr(a, b, "day")) != 0) return rc;
    return rc;
  }
  /**
   * Convert the instance into another timezone. The returned ICAL.Time
   * instance is always a copy.
   *
   * @param {Timezone} zone      The zone to convert to
   * @return {Time}              The copy, converted to the zone
   */
  convertToZone(zone) {
    let copy = this.clone();
    let zone_equals = this.zone.tzid == zone.tzid;
    if (!this.isDate && !zone_equals) {
      Timezone.convert_time(copy, this.zone, zone);
    }
    copy.zone = zone;
    return copy;
  }
  /**
   * Calculates the UTC offset of the current date/time in the timezone it is
   * in.
   *
   * @return {Number}     UTC offset in seconds
   */
  utcOffset() {
    if (this.zone == Timezone.localTimezone || this.zone == Timezone.utcTimezone) {
      return 0;
    } else {
      return this.zone.utcOffset(this);
    }
  }
  /**
   * Returns an RFC 5545 compliant ical representation of this object.
   *
   * @return {String} ical date/date-time
   */
  toICALString() {
    let string = this.toString();
    if (string.length > 10) {
      return design.icalendar.value["date-time"].toICAL(string);
    } else {
      return design.icalendar.value.date.toICAL(string);
    }
  }
  /**
   * The string representation of this date/time, in jCal form
   * (including : and - separators).
   * @return {String}
   */
  toString() {
    let result = this.year + "-" + pad2(this.month) + "-" + pad2(this.day);
    if (!this.isDate) {
      result += "T" + pad2(this.hour) + ":" + pad2(this.minute) + ":" + pad2(this.second);
      if (this.zone === Timezone.utcTimezone) {
        result += "Z";
      }
    }
    return result;
  }
  /**
   * Converts the current instance to a Javascript date
   * @return {Date}
   */
  toJSDate() {
    if (this.zone == Timezone.localTimezone) {
      if (this.isDate) {
        return new Date(this.year, this.month - 1, this.day);
      } else {
        return new Date(
          this.year,
          this.month - 1,
          this.day,
          this.hour,
          this.minute,
          this.second,
          0
        );
      }
    } else {
      return new Date(this.toUnixTime() * 1e3);
    }
  }
  _normalize() {
    if (this._time.isDate) {
      this._time.hour = 0;
      this._time.minute = 0;
      this._time.second = 0;
    }
    this.adjust(0, 0, 0, 0);
    return this;
  }
  /**
   * Adjust the date/time by the given offset
   *
   * @param {Number} aExtraDays       The extra amount of days
   * @param {Number} aExtraHours      The extra amount of hours
   * @param {Number} aExtraMinutes    The extra amount of minutes
   * @param {Number} aExtraSeconds    The extra amount of seconds
   * @param {Number=} aTime           The time to adjust, defaults to the
   *                                    current instance.
   */
  adjust(aExtraDays, aExtraHours, aExtraMinutes, aExtraSeconds, aTime) {
    let minutesOverflow, hoursOverflow, daysOverflow = 0, yearsOverflow = 0;
    let second, minute, hour, day;
    let daysInMonth;
    let time2 = aTime || this._time;
    if (!time2.isDate) {
      second = time2.second + aExtraSeconds;
      time2.second = second % 60;
      minutesOverflow = trunc(second / 60);
      if (time2.second < 0) {
        time2.second += 60;
        minutesOverflow--;
      }
      minute = time2.minute + aExtraMinutes + minutesOverflow;
      time2.minute = minute % 60;
      hoursOverflow = trunc(minute / 60);
      if (time2.minute < 0) {
        time2.minute += 60;
        hoursOverflow--;
      }
      hour = time2.hour + aExtraHours + hoursOverflow;
      time2.hour = hour % 24;
      daysOverflow = trunc(hour / 24);
      if (time2.hour < 0) {
        time2.hour += 24;
        daysOverflow--;
      }
    }
    if (time2.month > 12) {
      yearsOverflow = trunc((time2.month - 1) / 12);
    } else if (time2.month < 1) {
      yearsOverflow = trunc(time2.month / 12) - 1;
    }
    time2.year += yearsOverflow;
    time2.month -= 12 * yearsOverflow;
    day = time2.day + aExtraDays + daysOverflow;
    if (day > 0) {
      for (; ; ) {
        daysInMonth = _Time.daysInMonth(time2.month, time2.year);
        if (day <= daysInMonth) {
          break;
        }
        time2.month++;
        if (time2.month > 12) {
          time2.year++;
          time2.month = 1;
        }
        day -= daysInMonth;
      }
    } else {
      while (day <= 0) {
        if (time2.month == 1) {
          time2.year--;
          time2.month = 12;
        } else {
          time2.month--;
        }
        day += _Time.daysInMonth(time2.month, time2.year);
      }
    }
    time2.day = day;
    this._cachedUnixTime = null;
    return this;
  }
  /**
   * Sets up the current instance from unix time, the number of seconds since
   * January 1st, 1970.
   *
   * @param {Number} seconds      The seconds to set up with
   */
  fromUnixTime(seconds) {
    this.zone = Timezone.utcTimezone;
    let date = new Date(seconds * 1e3);
    this.year = date.getUTCFullYear();
    this.month = date.getUTCMonth() + 1;
    this.day = date.getUTCDate();
    if (this._time.isDate) {
      this.hour = 0;
      this.minute = 0;
      this.second = 0;
    } else {
      this.hour = date.getUTCHours();
      this.minute = date.getUTCMinutes();
      this.second = date.getUTCSeconds();
    }
    this._cachedUnixTime = null;
  }
  /**
   * Converts the current instance to seconds since January 1st 1970.
   *
   * @return {Number}         Seconds since 1970
   */
  toUnixTime() {
    if (this._cachedUnixTime !== null) {
      return this._cachedUnixTime;
    }
    let offset = this.utcOffset();
    let ms = Date.UTC(
      this.year,
      this.month - 1,
      this.day,
      this.hour,
      this.minute,
      this.second - offset
    );
    this._cachedUnixTime = ms / 1e3;
    return this._cachedUnixTime;
  }
  /**
   * Converts time to into Object which can be serialized then re-created
   * using the constructor.
   *
   * @example
   * // toJSON will automatically be called
   * var json = JSON.stringify(mytime);
   *
   * var deserialized = JSON.parse(json);
   *
   * var time = new ICAL.Time(deserialized);
   *
   * @return {Object}
   */
  toJSON() {
    let copy = [
      "year",
      "month",
      "day",
      "hour",
      "minute",
      "second",
      "isDate"
    ];
    let result = /* @__PURE__ */ Object.create(null);
    let i = 0;
    let len = copy.length;
    let prop;
    for (; i < len; i++) {
      prop = copy[i];
      result[prop] = this[prop];
    }
    if (this.zone) {
      result.timezone = this.zone.tzid;
    }
    return result;
  }
};
_epochTime = new WeakMap();
__publicField(_Time, "_dowCache", {});
__publicField(_Time, "_wnCache", {});
/**
 * Creates a new ICAL.Time instance from the the passed data object.
 *
 * @param {timeInit} aData          Time initialization
 * @param {Timezone=} aZone         Timezone this position occurs in
 */
__publicField(_Time, "fromData", function fromData(aData, aZone) {
  let t = new _Time();
  return t.fromData(aData, aZone);
});
__privateAdd(_Time, _epochTime, null);
/**
 * The days that have passed in the year after a given month. The array has
 * two members, one being an array of passed days for non-leap years, the
 * other analog for leap years.
 * @example
 * var isLeapYear = ICAL.Time.isLeapYear(year);
 * var passedDays = ICAL.Time.daysInYearPassedMonth[isLeapYear][month];
 * @type {Array.<Array.<Number>>}
 */
__publicField(_Time, "daysInYearPassedMonth", [
  [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365],
  [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335, 366]
]);
__publicField(_Time, "SUNDAY", 1);
__publicField(_Time, "MONDAY", 2);
__publicField(_Time, "TUESDAY", 3);
__publicField(_Time, "WEDNESDAY", 4);
__publicField(_Time, "THURSDAY", 5);
__publicField(_Time, "FRIDAY", 6);
__publicField(_Time, "SATURDAY", 7);
/**
 * The default weekday for the WKST part.
 * @constant
 * @default ICAL.Time.MONDAY
 */
__publicField(_Time, "DEFAULT_WEEK_START", 2);
var Time = _Time;
var CHAR = /[^ \t]/;
var VALUE_DELIMITER = ":";
var PARAM_DELIMITER = ";";
var PARAM_NAME_DELIMITER = "=";
var DEFAULT_VALUE_TYPE$1 = "unknown";
var DEFAULT_PARAM_TYPE = "text";
var RFC6868_REPLACE_MAP$1 = { "^'": '"', "^n": "\n", "^^": "^" };
function parse(input) {
  let state = {};
  let root = state.component = [];
  state.stack = [root];
  parse._eachLine(input, function(err, line) {
    parse._handleContentLine(line, state);
  });
  if (state.stack.length > 1) {
    throw new ParserError(
      "invalid ical body. component began but did not end"
    );
  }
  state = null;
  return root.length == 1 ? root[0] : root;
}
parse.property = function(str, designSet) {
  let state = {
    component: [[], []],
    designSet: designSet || design.defaultSet
  };
  parse._handleContentLine(str, state);
  return state.component[1][0];
};
parse.component = function(str) {
  return parse(str);
};
var ParserError = class extends Error {
  constructor() {
    super(...arguments);
    __publicField(this, "name", this.constructor.name);
  }
};
parse.ParserError = ParserError;
parse._handleContentLine = function(line, state) {
  let valuePos = line.indexOf(VALUE_DELIMITER);
  let paramPos = line.indexOf(PARAM_DELIMITER);
  let lastParamIndex;
  let lastValuePos;
  let name;
  let value;
  let params = {};
  if (paramPos !== -1 && valuePos !== -1) {
    if (paramPos > valuePos) {
      paramPos = -1;
    }
  }
  let parsedParams;
  if (paramPos !== -1) {
    name = line.slice(0, Math.max(0, paramPos)).toLowerCase();
    parsedParams = parse._parseParameters(line.slice(Math.max(0, paramPos)), 0, state.designSet);
    if (parsedParams[2] == -1) {
      throw new ParserError("Invalid parameters in '" + line + "'");
    }
    params = parsedParams[0];
    let parsedParamLength;
    if (typeof parsedParams[1] === "string") {
      parsedParamLength = parsedParams[1].length;
    } else {
      parsedParamLength = parsedParams[1].reduce((accumulator, currentValue) => {
        return accumulator + currentValue.length;
      }, 0);
    }
    lastParamIndex = parsedParamLength + parsedParams[2] + paramPos;
    if ((lastValuePos = line.slice(Math.max(0, lastParamIndex)).indexOf(VALUE_DELIMITER)) !== -1) {
      value = line.slice(Math.max(0, lastParamIndex + lastValuePos + 1));
    } else {
      throw new ParserError("Missing parameter value in '" + line + "'");
    }
  } else if (valuePos !== -1) {
    name = line.slice(0, Math.max(0, valuePos)).toLowerCase();
    value = line.slice(Math.max(0, valuePos + 1));
    if (name === "begin") {
      let newComponent = [value.toLowerCase(), [], []];
      if (state.stack.length === 1) {
        state.component.push(newComponent);
      } else {
        state.component[2].push(newComponent);
      }
      state.stack.push(state.component);
      state.component = newComponent;
      if (!state.designSet) {
        state.designSet = design.getDesignSet(state.component[0]);
      }
      return;
    } else if (name === "end") {
      state.component = state.stack.pop();
      return;
    }
  } else {
    throw new ParserError(
      'invalid line (no token ";" or ":") "' + line + '"'
    );
  }
  let valueType;
  let multiValue = false;
  let structuredValue = false;
  let propertyDetails;
  let splitName;
  let ungroupedName;
  if (state.designSet.propertyGroups && name.indexOf(".") !== -1) {
    splitName = name.split(".");
    params.group = splitName[0];
    ungroupedName = splitName[1];
  } else {
    ungroupedName = name;
  }
  if (ungroupedName in state.designSet.property) {
    propertyDetails = state.designSet.property[ungroupedName];
    if ("multiValue" in propertyDetails) {
      multiValue = propertyDetails.multiValue;
    }
    if ("structuredValue" in propertyDetails) {
      structuredValue = propertyDetails.structuredValue;
    }
    if (value && "detectType" in propertyDetails) {
      valueType = propertyDetails.detectType(value);
    }
  }
  if (!valueType) {
    if (!("value" in params)) {
      if (propertyDetails) {
        valueType = propertyDetails.defaultType;
      } else {
        valueType = DEFAULT_VALUE_TYPE$1;
      }
    } else {
      valueType = params.value.toLowerCase();
    }
  }
  delete params.value;
  let result;
  if (multiValue && structuredValue) {
    value = parse._parseMultiValue(value, structuredValue, valueType, [], multiValue, state.designSet, structuredValue);
    result = [ungroupedName, params, valueType, value];
  } else if (multiValue) {
    result = [ungroupedName, params, valueType];
    parse._parseMultiValue(value, multiValue, valueType, result, null, state.designSet, false);
  } else if (structuredValue) {
    value = parse._parseMultiValue(value, structuredValue, valueType, [], null, state.designSet, structuredValue);
    result = [ungroupedName, params, valueType, value];
  } else {
    value = parse._parseValue(value, valueType, state.designSet, false);
    result = [ungroupedName, params, valueType, value];
  }
  if (state.component[0] === "vcard" && state.component[1].length === 0 && !(name === "version" && value === "4.0")) {
    state.designSet = design.getDesignSet("vcard3");
  }
  state.component[1].push(result);
};
parse._parseValue = function(value, type, designSet, structuredValue) {
  if (type in designSet.value && "fromICAL" in designSet.value[type]) {
    return designSet.value[type].fromICAL(value, structuredValue);
  }
  return value;
};
parse._parseParameters = function(line, start, designSet) {
  let lastParam = start;
  let pos = 0;
  let delim = PARAM_NAME_DELIMITER;
  let result = {};
  let name, lcname;
  let value, valuePos = -1;
  let type, multiValue, mvdelim;
  while (pos !== false && (pos = line.indexOf(delim, pos + 1)) !== -1) {
    name = line.slice(lastParam + 1, pos);
    if (name.length == 0) {
      throw new ParserError("Empty parameter name in '" + line + "'");
    }
    lcname = name.toLowerCase();
    mvdelim = false;
    multiValue = false;
    if (lcname in designSet.param && designSet.param[lcname].valueType) {
      type = designSet.param[lcname].valueType;
    } else {
      type = DEFAULT_PARAM_TYPE;
    }
    if (lcname in designSet.param) {
      multiValue = designSet.param[lcname].multiValue;
      if (designSet.param[lcname].multiValueSeparateDQuote) {
        mvdelim = parse._rfc6868Escape('"' + multiValue + '"');
      }
    }
    let nextChar = line[pos + 1];
    if (nextChar === '"') {
      valuePos = pos + 2;
      pos = line.indexOf('"', valuePos);
      if (multiValue && pos != -1) {
        let extendedValue = true;
        while (extendedValue) {
          if (line[pos + 1] == multiValue && line[pos + 2] == '"') {
            pos = line.indexOf('"', pos + 3);
          } else {
            extendedValue = false;
          }
        }
      }
      if (pos === -1) {
        throw new ParserError(
          'invalid line (no matching double quote) "' + line + '"'
        );
      }
      value = line.slice(valuePos, pos);
      lastParam = line.indexOf(PARAM_DELIMITER, pos);
      let propValuePos = line.indexOf(VALUE_DELIMITER, pos);
      if (lastParam === -1 || propValuePos !== -1 && lastParam > propValuePos) {
        pos = false;
      }
    } else {
      valuePos = pos + 1;
      let nextPos = line.indexOf(PARAM_DELIMITER, valuePos);
      let propValuePos = line.indexOf(VALUE_DELIMITER, valuePos);
      if (propValuePos !== -1 && nextPos > propValuePos) {
        nextPos = propValuePos;
        pos = false;
      } else if (nextPos === -1) {
        if (propValuePos === -1) {
          nextPos = line.length;
        } else {
          nextPos = propValuePos;
        }
        pos = false;
      } else {
        lastParam = nextPos;
        pos = nextPos;
      }
      value = line.slice(valuePos, nextPos);
    }
    const length_before = value.length;
    value = parse._rfc6868Escape(value);
    valuePos += length_before - value.length;
    if (multiValue) {
      let delimiter = mvdelim || multiValue;
      value = parse._parseMultiValue(value, delimiter, type, [], null, designSet);
    } else {
      value = parse._parseValue(value, type, designSet);
    }
    if (multiValue && lcname in result) {
      if (Array.isArray(result[lcname])) {
        result[lcname].push(value);
      } else {
        result[lcname] = [
          result[lcname],
          value
        ];
      }
    } else {
      result[lcname] = value;
    }
  }
  return [result, value, valuePos];
};
parse._rfc6868Escape = function(val) {
  return val.replace(/\^['n^]/g, function(x) {
    return RFC6868_REPLACE_MAP$1[x];
  });
};
parse._parseMultiValue = function(buffer, delim, type, result, innerMulti, designSet, structuredValue) {
  let pos = 0;
  let lastPos = 0;
  let value;
  if (delim.length === 0) {
    return buffer;
  }
  while ((pos = unescapedIndexOf(buffer, delim, lastPos)) !== -1) {
    value = buffer.slice(lastPos, pos);
    if (innerMulti) {
      value = parse._parseMultiValue(value, innerMulti, type, [], null, designSet, structuredValue);
    } else {
      value = parse._parseValue(value, type, designSet, structuredValue);
    }
    result.push(value);
    lastPos = pos + delim.length;
  }
  value = buffer.slice(lastPos);
  if (innerMulti) {
    value = parse._parseMultiValue(value, innerMulti, type, [], null, designSet, structuredValue);
  } else {
    value = parse._parseValue(value, type, designSet, structuredValue);
  }
  result.push(value);
  return result.length == 1 ? result[0] : result;
};
parse._eachLine = function(buffer, callback) {
  let len = buffer.length;
  let lastPos = buffer.search(CHAR);
  let pos = lastPos;
  let line;
  let firstChar;
  let newlineOffset;
  do {
    pos = buffer.indexOf("\n", lastPos) + 1;
    if (pos > 1 && buffer[pos - 2] === "\r") {
      newlineOffset = 2;
    } else {
      newlineOffset = 1;
    }
    if (pos === 0) {
      pos = len;
      newlineOffset = 0;
    }
    firstChar = buffer[lastPos];
    if (firstChar === " " || firstChar === "	") {
      line += buffer.slice(lastPos + 1, pos - newlineOffset);
    } else {
      if (line)
        callback(null, line);
      line = buffer.slice(lastPos, pos - newlineOffset);
    }
    lastPos = pos;
  } while (pos !== len);
  line = line.trim();
  if (line.length)
    callback(null, line);
};
var OPTIONS = ["tzid", "location", "tznames", "latitude", "longitude"];
var _utcTimezone, _localTimezone;
var _Timezone = class _Timezone {
  /**
   * Creates a new ICAL.Timezone instance, by passing in a tzid and component.
   *
   * @param {Component|Object} data options for class
   * @param {String|Component} data.component
   *        If data is a simple object, then this member can be set to either a
   *        string containing the component data, or an already parsed
   *        ICAL.Component
   * @param {String} data.tzid      The timezone identifier
   * @param {String} data.location  The timezone locationw
   * @param {String} data.tznames   An alternative string representation of the
   *                                  timezone
   * @param {Number} data.latitude  The latitude of the timezone
   * @param {Number} data.longitude The longitude of the timezone
   */
  constructor(data) {
    /**
     * Timezone identifier
     * @type {String}
     */
    __publicField(this, "tzid", "");
    /**
     * Timezone location
     * @type {String}
     */
    __publicField(this, "location", "");
    /**
     * Alternative timezone name, for the string representation
     * @type {String}
     */
    __publicField(this, "tznames", "");
    /**
     * The primary latitude for the timezone.
     * @type {Number}
     */
    __publicField(this, "latitude", 0);
    /**
     * The primary longitude for the timezone.
     * @type {Number}
     */
    __publicField(this, "longitude", 0);
    /**
     * The vtimezone component for this timezone.
     * @type {Component}
     */
    __publicField(this, "component", null);
    /**
     * The year this timezone has been expanded to. All timezone transition
     * dates until this year are known and can be used for calculation
     *
     * @private
     * @type {Number}
     */
    __publicField(this, "expandedUntilYear", 0);
    /**
     * The class identifier.
     * @constant
     * @type {String}
     * @default "icaltimezone"
     */
    __publicField(this, "icalclass", "icaltimezone");
    this.wrappedJSObject = this;
    this.fromData(data);
  }
  static _compare_change_fn(a, b) {
    if (a.year < b.year) return -1;
    else if (a.year > b.year) return 1;
    if (a.month < b.month) return -1;
    else if (a.month > b.month) return 1;
    if (a.day < b.day) return -1;
    else if (a.day > b.day) return 1;
    if (a.hour < b.hour) return -1;
    else if (a.hour > b.hour) return 1;
    if (a.minute < b.minute) return -1;
    else if (a.minute > b.minute) return 1;
    if (a.second < b.second) return -1;
    else if (a.second > b.second) return 1;
    return 0;
  }
  /**
   * Convert the date/time from one zone to the next.
   *
   * @param {Time} tt                  The time to convert
   * @param {Timezone} from_zone       The source zone to convert from
   * @param {Timezone} to_zone         The target zone to convert to
   * @return {Time}                    The converted date/time object
   */
  static convert_time(tt, from_zone, to_zone) {
    if (tt.isDate || from_zone.tzid == to_zone.tzid || from_zone == _Timezone.localTimezone || to_zone == _Timezone.localTimezone) {
      tt.zone = to_zone;
      return tt;
    }
    let utcOffset = from_zone.utcOffset(tt);
    tt.adjust(0, 0, 0, -utcOffset);
    utcOffset = to_zone.utcOffset(tt);
    tt.adjust(0, 0, 0, utcOffset);
    return null;
  }
  /**
   * Creates a new ICAL.Timezone instance from the passed data object.
   *
   * @param {Component|Object} aData options for class
   * @param {String|Component} aData.component
   *        If aData is a simple object, then this member can be set to either a
   *        string containing the component data, or an already parsed
   *        ICAL.Component
   * @param {String} aData.tzid      The timezone identifier
   * @param {String} aData.location  The timezone locationw
   * @param {String} aData.tznames   An alternative string representation of the
   *                                  timezone
   * @param {Number} aData.latitude  The latitude of the timezone
   * @param {Number} aData.longitude The longitude of the timezone
   */
  static fromData(aData) {
    let tt = new _Timezone();
    return tt.fromData(aData);
  }
  static get utcTimezone() {
    if (!__privateGet(this, _utcTimezone)) {
      __privateSet(this, _utcTimezone, _Timezone.fromData({
        tzid: "UTC"
      }));
    }
    return __privateGet(this, _utcTimezone);
  }
  static get localTimezone() {
    if (!__privateGet(this, _localTimezone)) {
      __privateSet(this, _localTimezone, _Timezone.fromData({
        tzid: "floating"
      }));
    }
    return __privateGet(this, _localTimezone);
  }
  /**
   * Adjust a timezone change object.
   * @private
   * @param {Object} change     The timezone change object
   * @param {Number} days       The extra amount of days
   * @param {Number} hours      The extra amount of hours
   * @param {Number} minutes    The extra amount of minutes
   * @param {Number} seconds    The extra amount of seconds
   */
  static adjust_change(change, days, hours, minutes2, seconds) {
    return Time.prototype.adjust.call(
      change,
      days,
      hours,
      minutes2,
      seconds,
      change
    );
  }
  /**
   * Sets up the current instance using members from the passed data object.
   *
   * @param {Component|Object} aData options for class
   * @param {String|Component} aData.component
   *        If aData is a simple object, then this member can be set to either a
   *        string containing the component data, or an already parsed
   *        ICAL.Component
   * @param {String} aData.tzid      The timezone identifier
   * @param {String} aData.location  The timezone locationw
   * @param {String} aData.tznames   An alternative string representation of the
   *                                  timezone
   * @param {Number} aData.latitude  The latitude of the timezone
   * @param {Number} aData.longitude The longitude of the timezone
   */
  fromData(aData) {
    this.expandedUntilYear = 0;
    this.changes = [];
    if (aData instanceof Component) {
      this.component = aData;
    } else {
      if (aData && "component" in aData) {
        if (typeof aData.component == "string") {
          let jCal = parse(aData.component);
          this.component = new Component(jCal);
        } else if (aData.component instanceof Component) {
          this.component = aData.component;
        } else {
          this.component = null;
        }
      }
      for (let prop of OPTIONS) {
        if (aData && prop in aData) {
          this[prop] = aData[prop];
        }
      }
    }
    if (this.component instanceof Component && !this.tzid) {
      this.tzid = this.component.getFirstPropertyValue("tzid");
    }
    return this;
  }
  /**
   * Finds the utcOffset the given time would occur in this timezone.
   *
   * @param {Time} tt         The time to check for
   * @return {Number}         utc offset in seconds
   */
  utcOffset(tt) {
    if (this == _Timezone.utcTimezone || this == _Timezone.localTimezone) {
      return 0;
    }
    this._ensureCoverage(tt.year);
    if (!this.changes.length) {
      return 0;
    }
    let tt_change = {
      year: tt.year,
      month: tt.month,
      day: tt.day,
      hour: tt.hour,
      minute: tt.minute,
      second: tt.second
    };
    let change_num = this._findNearbyChange(tt_change);
    let change_num_to_use = -1;
    let step = 1;
    for (; ; ) {
      let change = clone(this.changes[change_num], true);
      if (change.utcOffset < change.prevUtcOffset) {
        _Timezone.adjust_change(change, 0, 0, 0, change.utcOffset);
      } else {
        _Timezone.adjust_change(
          change,
          0,
          0,
          0,
          change.prevUtcOffset
        );
      }
      let cmp = _Timezone._compare_change_fn(tt_change, change);
      if (cmp >= 0) {
        change_num_to_use = change_num;
      } else {
        step = -1;
      }
      if (step == -1 && change_num_to_use != -1) {
        break;
      }
      change_num += step;
      if (change_num < 0) {
        return 0;
      }
      if (change_num >= this.changes.length) {
        break;
      }
    }
    let zone_change = this.changes[change_num_to_use];
    let utcOffset_change = zone_change.utcOffset - zone_change.prevUtcOffset;
    if (utcOffset_change < 0 && change_num_to_use > 0) {
      let tmp_change = clone(zone_change, true);
      _Timezone.adjust_change(tmp_change, 0, 0, 0, tmp_change.prevUtcOffset);
      if (_Timezone._compare_change_fn(tt_change, tmp_change) < 0) {
        let prev_zone_change = this.changes[change_num_to_use - 1];
        let want_daylight = false;
        if (zone_change.is_daylight != want_daylight && prev_zone_change.is_daylight == want_daylight) {
          zone_change = prev_zone_change;
        }
      }
    }
    return zone_change.utcOffset;
  }
  _findNearbyChange(change) {
    let idx = binsearchInsert(
      this.changes,
      change,
      _Timezone._compare_change_fn
    );
    if (idx >= this.changes.length) {
      return this.changes.length - 1;
    }
    return idx;
  }
  _ensureCoverage(aYear) {
    if (_Timezone._minimumExpansionYear == -1) {
      let today2 = Time.now();
      _Timezone._minimumExpansionYear = today2.year;
    }
    let changesEndYear = aYear;
    if (changesEndYear < _Timezone._minimumExpansionYear) {
      changesEndYear = _Timezone._minimumExpansionYear;
    }
    changesEndYear += _Timezone.EXTRA_COVERAGE;
    if (!this.changes.length || this.expandedUntilYear < aYear) {
      let subcomps = this.component.getAllSubcomponents();
      let compLen = subcomps.length;
      let compIdx = 0;
      for (; compIdx < compLen; compIdx++) {
        this._expandComponent(
          subcomps[compIdx],
          changesEndYear,
          this.changes
        );
      }
      this.changes.sort(_Timezone._compare_change_fn);
      this.expandedUntilYear = changesEndYear;
    }
  }
  _expandComponent(aComponent, aYear, changes) {
    if (!aComponent.hasProperty("dtstart") || !aComponent.hasProperty("tzoffsetto") || !aComponent.hasProperty("tzoffsetfrom")) {
      return null;
    }
    let dtstart = aComponent.getFirstProperty("dtstart").getFirstValue();
    let change;
    function convert_tzoffset(offset) {
      return offset.factor * (offset.hours * 3600 + offset.minutes * 60);
    }
    function init_changes() {
      let changebase = {};
      changebase.is_daylight = aComponent.name == "daylight";
      changebase.utcOffset = convert_tzoffset(
        aComponent.getFirstProperty("tzoffsetto").getFirstValue()
      );
      changebase.prevUtcOffset = convert_tzoffset(
        aComponent.getFirstProperty("tzoffsetfrom").getFirstValue()
      );
      return changebase;
    }
    if (!aComponent.hasProperty("rrule") && !aComponent.hasProperty("rdate")) {
      change = init_changes();
      change.year = dtstart.year;
      change.month = dtstart.month;
      change.day = dtstart.day;
      change.hour = dtstart.hour;
      change.minute = dtstart.minute;
      change.second = dtstart.second;
      _Timezone.adjust_change(change, 0, 0, 0, -change.prevUtcOffset);
      changes.push(change);
    } else {
      let props = aComponent.getAllProperties("rdate");
      for (let rdate of props) {
        let time2 = rdate.getFirstValue();
        change = init_changes();
        change.year = time2.year;
        change.month = time2.month;
        change.day = time2.day;
        if (time2.isDate) {
          change.hour = dtstart.hour;
          change.minute = dtstart.minute;
          change.second = dtstart.second;
          if (dtstart.zone != _Timezone.utcTimezone) {
            _Timezone.adjust_change(change, 0, 0, 0, -change.prevUtcOffset);
          }
        } else {
          change.hour = time2.hour;
          change.minute = time2.minute;
          change.second = time2.second;
          if (time2.zone != _Timezone.utcTimezone) {
            _Timezone.adjust_change(change, 0, 0, 0, -change.prevUtcOffset);
          }
        }
        changes.push(change);
      }
      let rrule = aComponent.getFirstProperty("rrule");
      if (rrule) {
        rrule = rrule.getFirstValue();
        change = init_changes();
        if (rrule.until && rrule.until.zone == _Timezone.utcTimezone) {
          rrule.until.adjust(0, 0, 0, change.prevUtcOffset);
          rrule.until.zone = _Timezone.localTimezone;
        }
        let iterator = rrule.iterator(dtstart);
        let occ;
        while (occ = iterator.next()) {
          change = init_changes();
          if (occ.year > aYear || !occ) {
            break;
          }
          change.year = occ.year;
          change.month = occ.month;
          change.day = occ.day;
          change.hour = occ.hour;
          change.minute = occ.minute;
          change.second = occ.second;
          change.isDate = occ.isDate;
          _Timezone.adjust_change(change, 0, 0, 0, -change.prevUtcOffset);
          changes.push(change);
        }
      }
    }
    return changes;
  }
  /**
   * The string representation of this timezone.
   * @return {String}
   */
  toString() {
    return this.tznames ? this.tznames : this.tzid;
  }
};
_utcTimezone = new WeakMap();
_localTimezone = new WeakMap();
/**
 * The instance describing the UTC timezone
 * @type {Timezone}
 * @constant
 * @instance
 */
__privateAdd(_Timezone, _utcTimezone, null);
/**
 * The instance describing the local timezone
 * @type {Timezone}
 * @constant
 * @instance
 */
__privateAdd(_Timezone, _localTimezone, null);
__publicField(_Timezone, "_minimumExpansionYear", -1);
__publicField(_Timezone, "EXTRA_COVERAGE", 5);
var Timezone = _Timezone;
var zones = null;
var TimezoneService = {
  get count() {
    if (zones === null) {
      return 0;
    }
    return Object.keys(zones).length;
  },
  reset: function() {
    zones = /* @__PURE__ */ Object.create(null);
    let utc = Timezone.utcTimezone;
    zones.Z = utc;
    zones.UTC = utc;
    zones.GMT = utc;
  },
  _hard_reset: function() {
    zones = null;
  },
  /**
   * Checks if timezone id has been registered.
   *
   * @param {String} tzid     Timezone identifier (e.g. America/Los_Angeles)
   * @return {Boolean}        False, when not present
   */
  has: function(tzid) {
    if (zones === null) {
      return false;
    }
    return !!zones[tzid];
  },
  /**
   * Returns a timezone by its tzid if present.
   *
   * @param {String} tzid               Timezone identifier (e.g. America/Los_Angeles)
   * @return {Timezone | undefined}     The timezone, or undefined if not found
   */
  get: function(tzid) {
    if (zones === null) {
      this.reset();
    }
    return zones[tzid];
  },
  /**
   * Registers a timezone object or component.
   *
   * @param {Component|Timezone} timezone
   *        The initialized zone or vtimezone.
   *
   * @param {String=} name
   *        The name of the timezone. Defaults to the component's TZID if not
   *        passed.
   */
  register: function(timezone, name) {
    if (zones === null) {
      this.reset();
    }
    if (typeof timezone === "string" && name instanceof Timezone) {
      [timezone, name] = [name, timezone];
    }
    if (!name) {
      if (timezone instanceof Timezone) {
        name = timezone.tzid;
      } else {
        if (timezone.name === "vtimezone") {
          timezone = new Timezone(timezone);
          name = timezone.tzid;
        }
      }
    }
    if (!name) {
      throw new TypeError("Neither a timezone nor a name was passed");
    }
    if (timezone instanceof Timezone) {
      zones[name] = timezone;
    } else {
      throw new TypeError("timezone must be ICAL.Timezone or ICAL.Component");
    }
  },
  /**
   * Removes a timezone by its tzid from the list.
   *
   * @param {String} tzid     Timezone identifier (e.g. America/Los_Angeles)
   * @return {?Timezone}      The removed timezone, or null if not registered
   */
  remove: function(tzid) {
    if (zones === null) {
      return null;
    }
    return delete zones[tzid];
  }
};
function updateTimezones(vcal) {
  let allsubs, properties, vtimezones, reqTzid, i;
  if (!vcal || vcal.name !== "vcalendar") {
    return vcal;
  }
  allsubs = vcal.getAllSubcomponents();
  properties = [];
  vtimezones = {};
  for (i = 0; i < allsubs.length; i++) {
    if (allsubs[i].name === "vtimezone") {
      let tzid = allsubs[i].getFirstProperty("tzid").getFirstValue();
      vtimezones[tzid] = allsubs[i];
    } else {
      properties = properties.concat(allsubs[i].getAllProperties());
    }
  }
  reqTzid = {};
  for (i = 0; i < properties.length; i++) {
    let tzid = properties[i].getParameter("tzid");
    if (tzid) {
      reqTzid[tzid] = true;
    }
  }
  for (let [tzid, comp] of Object.entries(vtimezones)) {
    if (!reqTzid[tzid]) {
      vcal.removeSubcomponent(comp);
    }
  }
  for (let tzid of Object.keys(reqTzid)) {
    if (!vtimezones[tzid] && TimezoneService.has(tzid)) {
      vcal.addSubcomponent(TimezoneService.get(tzid).component);
    }
  }
  return vcal;
}
function isStrictlyNaN(number) {
  return typeof number === "number" && isNaN(number);
}
function strictParseInt(string) {
  let result = parseInt(string, 10);
  if (isStrictlyNaN(result)) {
    throw new Error(
      'Could not extract integer from "' + string + '"'
    );
  }
  return result;
}
function formatClassType(data, type) {
  if (typeof data === "undefined") {
    return void 0;
  }
  if (data instanceof type) {
    return data;
  }
  return new type(data);
}
function unescapedIndexOf(buffer, search, pos) {
  while ((pos = buffer.indexOf(search, pos)) !== -1) {
    if (pos > 0 && buffer[pos - 1] === "\\") {
      pos += 1;
    } else {
      return pos;
    }
  }
  return -1;
}
function binsearchInsert(list, seekVal, cmpfunc) {
  if (!list.length)
    return 0;
  let low = 0, high = list.length - 1, mid, cmpval;
  while (low <= high) {
    mid = low + Math.floor((high - low) / 2);
    cmpval = cmpfunc(seekVal, list[mid]);
    if (cmpval < 0)
      high = mid - 1;
    else if (cmpval > 0)
      low = mid + 1;
    else
      break;
  }
  if (cmpval < 0)
    return mid;
  else if (cmpval > 0)
    return mid + 1;
  else
    return mid;
}
function clone(aSrc, aDeep) {
  if (!aSrc || typeof aSrc != "object") {
    return aSrc;
  } else if (aSrc instanceof Date) {
    return new Date(aSrc.getTime());
  } else if ("clone" in aSrc) {
    return aSrc.clone();
  } else if (Array.isArray(aSrc)) {
    let arr = [];
    for (let i = 0; i < aSrc.length; i++) {
      arr.push(aDeep ? clone(aSrc[i], true) : aSrc[i]);
    }
    return arr;
  } else {
    let obj = {};
    for (let [name, value] of Object.entries(aSrc)) {
      if (aDeep) {
        obj[name] = clone(value, true);
      } else {
        obj[name] = value;
      }
    }
    return obj;
  }
}
function foldline(aLine) {
  let result = "";
  let line = aLine || "", pos = 0, line_length = 0;
  while (line.length) {
    let cp = line.codePointAt(pos);
    if (cp < 128) ++line_length;
    else if (cp < 2048) line_length += 2;
    else if (cp < 65536) line_length += 3;
    else line_length += 4;
    if (line_length < ICALmodule.foldLength + 1)
      pos += cp > 65535 ? 2 : 1;
    else {
      result += ICALmodule.newLineChar + " " + line.slice(0, Math.max(0, pos));
      line = line.slice(Math.max(0, pos));
      pos = line_length = 0;
    }
  }
  return result.slice(ICALmodule.newLineChar.length + 1);
}
function pad2(data) {
  if (typeof data !== "string") {
    if (typeof data === "number") {
      data = parseInt(data);
    }
    data = String(data);
  }
  let len = data.length;
  switch (len) {
    case 0:
      return "00";
    case 1:
      return "0" + data;
    default:
      return data;
  }
}
function trunc(number) {
  return number < 0 ? Math.ceil(number) : Math.floor(number);
}
function extend(source, target) {
  for (let key2 in source) {
    let descr = Object.getOwnPropertyDescriptor(source, key2);
    if (descr && !Object.getOwnPropertyDescriptor(target, key2)) {
      Object.defineProperty(target, key2, descr);
    }
  }
  return target;
}
var helpers = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  binsearchInsert,
  clone,
  extend,
  foldline,
  formatClassType,
  isStrictlyNaN,
  pad2,
  strictParseInt,
  trunc,
  unescapedIndexOf,
  updateTimezones
});
var UtcOffset = class _UtcOffset {
  /**
   * Creates a new ICAL.UtcOffset instance.
   *
   * @param {Object} aData          An object with members of the utc offset
   * @param {Number=} aData.hours   The hours for the utc offset
   * @param {Number=} aData.minutes The minutes in the utc offset
   * @param {Number=} aData.factor  The factor for the utc-offset, either -1 or 1
   */
  constructor(aData) {
    /**
     * The hours in the utc-offset
     * @type {Number}
     */
    __publicField(this, "hours", 0);
    /**
     * The minutes in the utc-offset
     * @type {Number}
     */
    __publicField(this, "minutes", 0);
    /**
     * The sign of the utc offset, 1 for positive offset, -1 for negative
     * offsets.
     * @type {Number}
     */
    __publicField(this, "factor", 1);
    /**
     * The type name, to be used in the jCal object.
     * @constant
     * @type {String}
     * @default "utc-offset"
     */
    __publicField(this, "icaltype", "utc-offset");
    this.fromData(aData);
  }
  /**
   * Creates a new {@link ICAL.UtcOffset} instance from the passed string.
   *
   * @param {String} aString    The string to parse
   * @return {Duration}         The created utc-offset instance
   */
  static fromString(aString) {
    let options = {};
    options.factor = aString[0] === "+" ? 1 : -1;
    options.hours = strictParseInt(aString.slice(1, 3));
    options.minutes = strictParseInt(aString.slice(4, 6));
    return new _UtcOffset(options);
  }
  /**
   * Creates a new {@link ICAL.UtcOffset} instance from the passed seconds
   * value.
   *
   * @param {Number} aSeconds       The number of seconds to convert
   */
  static fromSeconds(aSeconds) {
    let instance = new _UtcOffset();
    instance.fromSeconds(aSeconds);
    return instance;
  }
  /**
   * Returns a clone of the utc offset object.
   *
   * @return {UtcOffset}     The cloned object
   */
  clone() {
    return _UtcOffset.fromSeconds(this.toSeconds());
  }
  /**
   * Sets up the current instance using members from the passed data object.
   *
   * @param {Object} aData          An object with members of the utc offset
   * @param {Number=} aData.hours   The hours for the utc offset
   * @param {Number=} aData.minutes The minutes in the utc offset
   * @param {Number=} aData.factor  The factor for the utc-offset, either -1 or 1
   */
  fromData(aData) {
    if (aData) {
      for (let [key2, value] of Object.entries(aData)) {
        this[key2] = value;
      }
    }
    this._normalize();
  }
  /**
   * Sets up the current instance from the given seconds value. The seconds
   * value is truncated to the minute. Offsets are wrapped when the world
   * ends, the hour after UTC+14:00 is UTC-12:00.
   *
   * @param {Number} aSeconds         The seconds to convert into an offset
   */
  fromSeconds(aSeconds) {
    let secs = Math.abs(aSeconds);
    this.factor = aSeconds < 0 ? -1 : 1;
    this.hours = trunc(secs / 3600);
    secs -= this.hours * 3600;
    this.minutes = trunc(secs / 60);
    return this;
  }
  /**
   * Convert the current offset to a value in seconds
   *
   * @return {Number}                 The offset in seconds
   */
  toSeconds() {
    return this.factor * (60 * this.minutes + 3600 * this.hours);
  }
  /**
   * Compare this utc offset with another one.
   *
   * @param {UtcOffset} other             The other offset to compare with
   * @return {Number}                     -1, 0 or 1 for less/equal/greater
   */
  compare(other) {
    let a = this.toSeconds();
    let b = other.toSeconds();
    return (a > b) - (b > a);
  }
  _normalize() {
    let secs = this.toSeconds();
    let factor = this.factor;
    while (secs < -43200) {
      secs += 97200;
    }
    while (secs > 50400) {
      secs -= 97200;
    }
    this.fromSeconds(secs);
    if (secs == 0) {
      this.factor = factor;
    }
  }
  /**
   * The iCalendar string representation of this utc-offset.
   * @return {String}
   */
  toICALString() {
    return design.icalendar.value["utc-offset"].toICAL(this.toString());
  }
  /**
   * The string representation of this utc-offset.
   * @return {String}
   */
  toString() {
    return (this.factor == 1 ? "+" : "-") + pad2(this.hours) + ":" + pad2(this.minutes);
  }
};
var VCardTime = class _VCardTime extends Time {
  /**
   * Creates a new ICAL.VCardTime instance.
   *
   * @param {Object} data                           The data for the time instance
   * @param {Number=} data.year                     The year for this date
   * @param {Number=} data.month                    The month for this date
   * @param {Number=} data.day                      The day for this date
   * @param {Number=} data.hour                     The hour for this date
   * @param {Number=} data.minute                   The minute for this date
   * @param {Number=} data.second                   The second for this date
   * @param {Timezone|UtcOffset} zone               The timezone to use
   * @param {String} icaltype                       The type for this date/time object
   */
  constructor(data, zone, icaltype) {
    super(data, zone);
    /**
     * The class identifier.
     * @constant
     * @type {String}
     * @default "vcardtime"
     */
    __publicField(this, "icalclass", "vcardtime");
    /**
     * The type name, to be used in the jCal object.
     * @type {String}
     * @default "date-and-or-time"
     */
    __publicField(this, "icaltype", "date-and-or-time");
    this.icaltype = icaltype || "date-and-or-time";
  }
  /**
   * Returns a new ICAL.VCardTime instance from a date and/or time string.
   *
   * @param {String} aValue     The string to create from
   * @param {String} aIcalType  The type for this instance, e.g. date-and-or-time
   * @return {VCardTime}        The date/time instance
   */
  static fromDateAndOrTimeString(aValue, aIcalType) {
    function part(v, s, e) {
      return v ? strictParseInt(v.slice(s, s + e)) : null;
    }
    let parts = aValue.split("T");
    let dt = parts[0], tmz = parts[1];
    let splitzone = tmz ? design.vcard.value.time._splitZone(tmz) : [];
    let zone = splitzone[0], tm = splitzone[1];
    let dtlen = dt ? dt.length : 0;
    let tmlen = tm ? tm.length : 0;
    let hasDashDate = dt && dt[0] == "-" && dt[1] == "-";
    let hasDashTime = tm && tm[0] == "-";
    let o = {
      year: hasDashDate ? null : part(dt, 0, 4),
      month: hasDashDate && (dtlen == 4 || dtlen == 7) ? part(dt, 2, 2) : dtlen == 7 ? part(dt, 5, 2) : dtlen == 10 ? part(dt, 5, 2) : null,
      day: dtlen == 5 ? part(dt, 3, 2) : dtlen == 7 && hasDashDate ? part(dt, 5, 2) : dtlen == 10 ? part(dt, 8, 2) : null,
      hour: hasDashTime ? null : part(tm, 0, 2),
      minute: hasDashTime && tmlen == 3 ? part(tm, 1, 2) : tmlen > 4 ? hasDashTime ? part(tm, 1, 2) : part(tm, 3, 2) : null,
      second: tmlen == 4 ? part(tm, 2, 2) : tmlen == 6 ? part(tm, 4, 2) : tmlen == 8 ? part(tm, 6, 2) : null
    };
    if (zone == "Z") {
      zone = Timezone.utcTimezone;
    } else if (zone && zone[3] == ":") {
      zone = UtcOffset.fromString(zone);
    } else {
      zone = null;
    }
    return new _VCardTime(o, zone, aIcalType);
  }
  /**
   * Returns a clone of the vcard date/time object.
   *
   * @return {VCardTime}     The cloned object
   */
  clone() {
    return new _VCardTime(this._time, this.zone, this.icaltype);
  }
  _normalize() {
    return this;
  }
  /**
   * @inheritdoc
   */
  utcOffset() {
    if (this.zone instanceof UtcOffset) {
      return this.zone.toSeconds();
    } else {
      return Time.prototype.utcOffset.apply(this, arguments);
    }
  }
  /**
   * Returns an RFC 6350 compliant representation of this object.
   *
   * @return {String}         vcard date/time string
   */
  toICALString() {
    return design.vcard.value[this.icaltype].toICAL(this.toString());
  }
  /**
   * The string representation of this date/time, in jCard form
   * (including : and - separators).
   * @return {String}
   */
  toString() {
    let y = this.year, m = this.month, d = this.day;
    let h = this.hour, mm = this.minute, s = this.second;
    let hasYear = y !== null, hasMonth = m !== null, hasDay = d !== null;
    let hasHour = h !== null, hasMinute = mm !== null, hasSecond = s !== null;
    let datepart = (hasYear ? pad2(y) + (hasMonth || hasDay ? "-" : "") : hasMonth || hasDay ? "--" : "") + (hasMonth ? pad2(m) : "") + (hasDay ? "-" + pad2(d) : "");
    let timepart = (hasHour ? pad2(h) : "-") + (hasHour && hasMinute ? ":" : "") + (hasMinute ? pad2(mm) : "") + (!hasHour && !hasMinute ? "-" : "") + (hasMinute && hasSecond ? ":" : "") + (hasSecond ? pad2(s) : "");
    let zone;
    if (this.zone === Timezone.utcTimezone) {
      zone = "Z";
    } else if (this.zone instanceof UtcOffset) {
      zone = this.zone.toString();
    } else if (this.zone === Timezone.localTimezone) {
      zone = "";
    } else if (this.zone instanceof Timezone) {
      let offset = UtcOffset.fromSeconds(this.zone.utcOffset(this));
      zone = offset.toString();
    } else {
      zone = "";
    }
    switch (this.icaltype) {
      case "time":
        return timepart + zone;
      case "date-and-or-time":
      case "date-time":
        return datepart + (timepart == "--" ? "" : "T" + timepart + zone);
      case "date":
        return datepart;
    }
    return null;
  }
};
var _RecurIterator = class _RecurIterator {
  /**
   * Creates a new ICAL.RecurIterator instance. The options object may contain additional members
   * when resuming iteration from a previous run.
   *
   * @param {Object} options                The iterator options
   * @param {Recur} options.rule            The rule to iterate.
   * @param {Time} options.dtstart          The start date of the event.
   * @param {Boolean=} options.initialized  When true, assume that options are
   *        from a previously constructed iterator. Initialization will not be
   *        repeated.
   */
  constructor(options) {
    /**
     * True when iteration is finished.
     * @type {Boolean}
     */
    __publicField(this, "completed", false);
    /**
     * The rule that is being iterated
     * @type {Recur}
     */
    __publicField(this, "rule", null);
    /**
     * The start date of the event being iterated.
     * @type {Time}
     */
    __publicField(this, "dtstart", null);
    /**
     * The last occurrence that was returned from the
     * {@link RecurIterator#next} method.
     * @type {Time}
     */
    __publicField(this, "last", null);
    /**
     * The sequence number from the occurrence
     * @type {Number}
     */
    __publicField(this, "occurrence_number", 0);
    /**
     * The indices used for the {@link ICAL.RecurIterator#by_data} object.
     * @type {Object}
     * @private
     */
    __publicField(this, "by_indices", null);
    /**
     * If true, the iterator has already been initialized
     * @type {Boolean}
     * @private
     */
    __publicField(this, "initialized", false);
    /**
     * The initializd by-data.
     * @type {Object}
     * @private
     */
    __publicField(this, "by_data", null);
    /**
     * The expanded yeardays
     * @type {Array}
     * @private
     */
    __publicField(this, "days", null);
    /**
     * The index in the {@link ICAL.RecurIterator#days} array.
     * @type {Number}
     * @private
     */
    __publicField(this, "days_index", 0);
    this.fromData(options);
  }
  /**
   * Initialize the recurrence iterator from the passed data object. This
   * method is usually not called directly, you can initialize the iterator
   * through the constructor.
   *
   * @param {Object} options                The iterator options
   * @param {Recur} options.rule            The rule to iterate.
   * @param {Time} options.dtstart          The start date of the event.
   * @param {Boolean=} options.initialized  When true, assume that options are
   *        from a previously constructed iterator. Initialization will not be
   *        repeated.
   */
  fromData(options) {
    this.rule = formatClassType(options.rule, Recur);
    if (!this.rule) {
      throw new Error("iterator requires a (ICAL.Recur) rule");
    }
    this.dtstart = formatClassType(options.dtstart, Time);
    if (!this.dtstart) {
      throw new Error("iterator requires a (ICAL.Time) dtstart");
    }
    if (options.by_data) {
      this.by_data = options.by_data;
    } else {
      this.by_data = clone(this.rule.parts, true);
    }
    if (options.occurrence_number)
      this.occurrence_number = options.occurrence_number;
    this.days = options.days || [];
    if (options.last) {
      this.last = formatClassType(options.last, Time);
    }
    this.by_indices = options.by_indices;
    if (!this.by_indices) {
      this.by_indices = {
        "BYSECOND": 0,
        "BYMINUTE": 0,
        "BYHOUR": 0,
        "BYDAY": 0,
        "BYMONTH": 0,
        "BYWEEKNO": 0,
        "BYMONTHDAY": 0
      };
    }
    this.initialized = options.initialized || false;
    if (!this.initialized) {
      try {
        this.init();
      } catch (e) {
        if (e instanceof InvalidRecurrenceRuleError) {
          this.completed = true;
        } else {
          throw e;
        }
      }
    }
  }
  /**
   * Initialize the iterator
   * @private
   */
  init() {
    this.initialized = true;
    this.last = this.dtstart.clone();
    let parts = this.by_data;
    if ("BYDAY" in parts) {
      this.sort_byday_rules(parts.BYDAY);
    }
    if ("BYYEARDAY" in parts) {
      if ("BYMONTH" in parts || "BYWEEKNO" in parts || "BYMONTHDAY" in parts) {
        throw new Error("Invalid BYYEARDAY rule");
      }
    }
    if ("BYWEEKNO" in parts && "BYMONTHDAY" in parts) {
      throw new Error("BYWEEKNO does not fit to BYMONTHDAY");
    }
    if (this.rule.freq == "MONTHLY" && ("BYYEARDAY" in parts || "BYWEEKNO" in parts)) {
      throw new Error("For MONTHLY recurrences neither BYYEARDAY nor BYWEEKNO may appear");
    }
    if (this.rule.freq == "WEEKLY" && ("BYYEARDAY" in parts || "BYMONTHDAY" in parts)) {
      throw new Error("For WEEKLY recurrences neither BYMONTHDAY nor BYYEARDAY may appear");
    }
    if (this.rule.freq != "YEARLY" && "BYYEARDAY" in parts) {
      throw new Error("BYYEARDAY may only appear in YEARLY rules");
    }
    this.last.second = this.setup_defaults("BYSECOND", "SECONDLY", this.dtstart.second);
    this.last.minute = this.setup_defaults("BYMINUTE", "MINUTELY", this.dtstart.minute);
    this.last.hour = this.setup_defaults("BYHOUR", "HOURLY", this.dtstart.hour);
    this.last.day = this.setup_defaults("BYMONTHDAY", "DAILY", this.dtstart.day);
    this.last.month = this.setup_defaults("BYMONTH", "MONTHLY", this.dtstart.month);
    if (this.rule.freq == "WEEKLY") {
      if ("BYDAY" in parts) {
        let [, dow] = this.ruleDayOfWeek(parts.BYDAY[0], this.rule.wkst);
        let wkdy = dow - this.last.dayOfWeek(this.rule.wkst);
        if (this.last.dayOfWeek(this.rule.wkst) < dow && wkdy >= 0 || wkdy < 0) {
          this.last.day += wkdy;
        }
      } else {
        let dayName = Recur.numericDayToIcalDay(this.dtstart.dayOfWeek());
        parts.BYDAY = [dayName];
      }
    }
    if (this.rule.freq == "YEARLY") {
      const untilYear = this.rule.until ? this.rule.until.year : 2e4;
      while (this.last.year <= untilYear) {
        this.expand_year_days(this.last.year);
        if (this.days.length > 0) {
          break;
        }
        this.increment_year(this.rule.interval);
      }
      if (this.days.length == 0) {
        throw new InvalidRecurrenceRuleError();
      }
      if (!this._nextByYearDay() && !this.next_year() && !this.next_year() && !this.next_year()) {
        throw new InvalidRecurrenceRuleError();
      }
    }
    if (this.rule.freq == "MONTHLY") {
      if (this.has_by_data("BYDAY")) {
        let tempLast = null;
        let initLast = this.last.clone();
        let daysInMonth = Time.daysInMonth(this.last.month, this.last.year);
        for (let bydow of this.by_data.BYDAY) {
          this.last = initLast.clone();
          let [pos, dow] = this.ruleDayOfWeek(bydow);
          let dayOfMonth = this.last.nthWeekDay(dow, pos);
          if (pos >= 6 || pos <= -6) {
            throw new Error("Malformed values in BYDAY part");
          }
          if (dayOfMonth > daysInMonth || dayOfMonth <= 0) {
            if (tempLast && tempLast.month == initLast.month) {
              continue;
            }
            while (dayOfMonth > daysInMonth || dayOfMonth <= 0) {
              this.increment_month();
              daysInMonth = Time.daysInMonth(this.last.month, this.last.year);
              dayOfMonth = this.last.nthWeekDay(dow, pos);
            }
          }
          this.last.day = dayOfMonth;
          if (!tempLast || this.last.compare(tempLast) < 0) {
            tempLast = this.last.clone();
          }
        }
        this.last = tempLast.clone();
        if (this.has_by_data("BYMONTHDAY")) {
          this._byDayAndMonthDay(true);
        }
        if (this.last.day > daysInMonth || this.last.day == 0) {
          throw new Error("Malformed values in BYDAY part");
        }
      } else if (this.has_by_data("BYMONTHDAY")) {
        this.last.day = 1;
        let normalized = this.normalizeByMonthDayRules(
          this.last.year,
          this.last.month,
          this.rule.parts.BYMONTHDAY
        ).filter((d) => d >= this.last.day);
        if (normalized.length) {
          this.last.day = normalized[0];
          this.by_data.BYMONTHDAY = normalized;
        } else {
          if (!this.next_month() && !this.next_month() && !this.next_month()) {
            throw new InvalidRecurrenceRuleError();
          }
        }
      }
    }
  }
  /**
   * Retrieve the next occurrence from the iterator.
   * @return {Time}
   */
  next(again = false) {
    let before = this.last ? this.last.clone() : null;
    if (this.rule.count && this.occurrence_number >= this.rule.count || this.rule.until && this.last.compare(this.rule.until) > 0) {
      this.completed = true;
    }
    if (this.completed) {
      return null;
    }
    if (this.occurrence_number == 0 && this.last.compare(this.dtstart) >= 0) {
      this.occurrence_number++;
      return this.last;
    }
    let valid;
    let invalid_count = 0;
    do {
      valid = 1;
      switch (this.rule.freq) {
        case "SECONDLY":
          this.next_second();
          break;
        case "MINUTELY":
          this.next_minute();
          break;
        case "HOURLY":
          this.next_hour();
          break;
        case "DAILY":
          this.next_day();
          break;
        case "WEEKLY":
          this.next_week();
          break;
        case "MONTHLY":
          valid = this.next_month();
          if (valid) {
            invalid_count = 0;
          } else if (++invalid_count == 336) {
            this.completed = true;
            return null;
          }
          break;
        case "YEARLY":
          valid = this.next_year();
          if (valid) {
            invalid_count = 0;
          } else if (++invalid_count == 28) {
            this.completed = true;
            return null;
          }
          break;
        default:
          return null;
      }
    } while (!this.check_contracting_rules() || this.last.compare(this.dtstart) < 0 || !valid);
    if (this.last.compare(before) == 0) {
      if (again) {
        throw new Error("Same occurrence found twice, protecting you from death by recursion");
      }
      this.next(true);
    }
    if (this.rule.until && this.last.compare(this.rule.until) > 0) {
      this.completed = true;
      return null;
    } else {
      this.occurrence_number++;
      return this.last;
    }
  }
  next_second() {
    return this.next_generic("BYSECOND", "SECONDLY", "second", "minute");
  }
  increment_second(inc) {
    return this.increment_generic(inc, "second", 60, "minute");
  }
  next_minute() {
    return this.next_generic(
      "BYMINUTE",
      "MINUTELY",
      "minute",
      "hour",
      "next_second"
    );
  }
  increment_minute(inc) {
    return this.increment_generic(inc, "minute", 60, "hour");
  }
  next_hour() {
    return this.next_generic(
      "BYHOUR",
      "HOURLY",
      "hour",
      "monthday",
      "next_minute"
    );
  }
  increment_hour(inc) {
    this.increment_generic(inc, "hour", 24, "monthday");
  }
  next_day() {
    let this_freq = this.rule.freq == "DAILY";
    if (this.next_hour() == 0) {
      return 0;
    }
    if (this_freq) {
      this.increment_monthday(this.rule.interval);
    } else {
      this.increment_monthday(1);
    }
    return 0;
  }
  next_week() {
    let end_of_data = 0;
    if (this.next_weekday_by_week() == 0) {
      return end_of_data;
    }
    if (this.has_by_data("BYWEEKNO")) {
      this.by_indices.BYWEEKNO++;
      if (this.by_indices.BYWEEKNO == this.by_data.BYWEEKNO.length) {
        this.by_indices.BYWEEKNO = 0;
        end_of_data = 1;
      }
      this.last.month = 1;
      this.last.day = 1;
      let week_no = this.by_data.BYWEEKNO[this.by_indices.BYWEEKNO];
      this.last.day += 7 * week_no;
      if (end_of_data) {
        this.increment_year(1);
      }
    } else {
      this.increment_monthday(7 * this.rule.interval);
    }
    return end_of_data;
  }
  /**
   * Normalize each by day rule for a given year/month.
   * Takes into account ordering and negative rules
   *
   * @private
   * @param {Number} year         Current year.
   * @param {Number} month        Current month.
   * @param {Array}  rules        Array of rules.
   *
   * @return {Array} sorted and normalized rules.
   *                 Negative rules will be expanded to their
   *                 correct positive values for easier processing.
   */
  normalizeByMonthDayRules(year, month, rules) {
    let daysInMonth = Time.daysInMonth(month, year);
    let newRules = [];
    let ruleIdx = 0;
    let len = rules.length;
    let rule;
    for (; ruleIdx < len; ruleIdx++) {
      rule = parseInt(rules[ruleIdx], 10);
      if (isNaN(rule)) {
        throw new Error("Invalid BYMONTHDAY value");
      }
      if (Math.abs(rule) > daysInMonth) {
        continue;
      }
      if (rule < 0) {
        rule = daysInMonth + (rule + 1);
      } else if (rule === 0) {
        continue;
      }
      if (newRules.indexOf(rule) === -1) {
        newRules.push(rule);
      }
    }
    return newRules.sort(function(a, b) {
      return a - b;
    });
  }
  /**
   * NOTES:
   * We are given a list of dates in the month (BYMONTHDAY) (23, etc..)
   * Also we are given a list of days (BYDAY) (MO, 2SU, etc..) when
   * both conditions match a given date (this.last.day) iteration stops.
   *
   * @private
   * @param {Boolean=} isInit     When given true will not increment the
   *                                current day (this.last).
   */
  _byDayAndMonthDay(isInit) {
    let byMonthDay;
    let byDay = this.by_data.BYDAY;
    let date;
    let dateIdx = 0;
    let dateLen;
    let dayLen = byDay.length;
    let dataIsValid = 0;
    let daysInMonth;
    let self = this;
    let lastDay = this.last.day;
    function initMonth() {
      daysInMonth = Time.daysInMonth(
        self.last.month,
        self.last.year
      );
      byMonthDay = self.normalizeByMonthDayRules(
        self.last.year,
        self.last.month,
        self.by_data.BYMONTHDAY
      );
      dateLen = byMonthDay.length;
      while (byMonthDay[dateIdx] <= lastDay && !(isInit && byMonthDay[dateIdx] == lastDay) && dateIdx < dateLen - 1) {
        dateIdx++;
      }
    }
    function nextMonth() {
      lastDay = 0;
      self.increment_month();
      dateIdx = 0;
      initMonth();
    }
    initMonth();
    if (isInit) {
      lastDay -= 1;
    }
    let monthsCounter = 48;
    while (!dataIsValid && monthsCounter) {
      monthsCounter--;
      date = lastDay + 1;
      if (date > daysInMonth) {
        nextMonth();
        continue;
      }
      let next = byMonthDay[dateIdx++];
      if (next >= date) {
        lastDay = next;
      } else {
        nextMonth();
        continue;
      }
      for (let dayIdx = 0; dayIdx < dayLen; dayIdx++) {
        let parts = this.ruleDayOfWeek(byDay[dayIdx]);
        let pos = parts[0];
        let dow = parts[1];
        this.last.day = lastDay;
        if (this.last.isNthWeekDay(dow, pos)) {
          dataIsValid = 1;
          break;
        }
      }
      if (!dataIsValid && dateIdx === dateLen) {
        nextMonth();
        continue;
      }
    }
    if (monthsCounter <= 0) {
      throw new Error("Malformed values in BYDAY combined with BYMONTHDAY parts");
    }
    return dataIsValid;
  }
  next_month() {
    let data_valid = 1;
    if (this.next_hour() == 0) {
      return data_valid;
    }
    if (this.has_by_data("BYDAY") && this.has_by_data("BYMONTHDAY")) {
      data_valid = this._byDayAndMonthDay();
    } else if (this.has_by_data("BYDAY")) {
      let daysInMonth = Time.daysInMonth(this.last.month, this.last.year);
      let setpos = 0;
      let setpos_total = 0;
      if (this.has_by_data("BYSETPOS")) {
        let last_day = this.last.day;
        for (let day2 = 1; day2 <= daysInMonth; day2++) {
          this.last.day = day2;
          if (this.is_day_in_byday(this.last)) {
            setpos_total++;
            if (day2 <= last_day) {
              setpos++;
            }
          }
        }
        this.last.day = last_day;
      }
      data_valid = 0;
      let day;
      for (day = this.last.day + 1; day <= daysInMonth; day++) {
        this.last.day = day;
        if (this.is_day_in_byday(this.last)) {
          if (!this.has_by_data("BYSETPOS") || this.check_set_position(++setpos) || this.check_set_position(setpos - setpos_total - 1)) {
            data_valid = 1;
            break;
          }
        }
      }
      if (day > daysInMonth) {
        this.last.day = 1;
        this.increment_month();
        if (this.is_day_in_byday(this.last)) {
          if (!this.has_by_data("BYSETPOS") || this.check_set_position(1)) {
            data_valid = 1;
          }
        } else {
          data_valid = 0;
        }
      }
    } else if (this.has_by_data("BYMONTHDAY")) {
      this.by_indices.BYMONTHDAY++;
      if (this.by_indices.BYMONTHDAY >= this.by_data.BYMONTHDAY.length) {
        this.by_indices.BYMONTHDAY = 0;
        this.increment_month();
        if (this.by_indices.BYMONTHDAY >= this.by_data.BYMONTHDAY.length) {
          return 0;
        }
      }
      let daysInMonth = Time.daysInMonth(this.last.month, this.last.year);
      let day = this.by_data.BYMONTHDAY[this.by_indices.BYMONTHDAY];
      if (day < 0) {
        day = daysInMonth + day + 1;
      }
      if (day > daysInMonth) {
        this.last.day = 1;
        data_valid = this.is_day_in_byday(this.last);
      } else {
        this.last.day = day;
      }
    } else {
      this.increment_month();
      let daysInMonth = Time.daysInMonth(this.last.month, this.last.year);
      if (this.by_data.BYMONTHDAY[0] > daysInMonth) {
        data_valid = 0;
      } else {
        this.last.day = this.by_data.BYMONTHDAY[0];
      }
    }
    return data_valid;
  }
  next_weekday_by_week() {
    let end_of_data = 0;
    if (this.next_hour() == 0) {
      return end_of_data;
    }
    if (!this.has_by_data("BYDAY")) {
      return 1;
    }
    for (; ; ) {
      let tt = new Time();
      this.by_indices.BYDAY++;
      if (this.by_indices.BYDAY == Object.keys(this.by_data.BYDAY).length) {
        this.by_indices.BYDAY = 0;
        end_of_data = 1;
      }
      let coded_day = this.by_data.BYDAY[this.by_indices.BYDAY];
      let parts = this.ruleDayOfWeek(coded_day);
      let dow = parts[1];
      dow -= this.rule.wkst;
      if (dow < 0) {
        dow += 7;
      }
      tt.year = this.last.year;
      tt.month = this.last.month;
      tt.day = this.last.day;
      let startOfWeek = tt.startDoyWeek(this.rule.wkst);
      if (dow + startOfWeek < 1) {
        if (!end_of_data) {
          continue;
        }
      }
      let next = Time.fromDayOfYear(startOfWeek + dow, this.last.year);
      this.last.year = next.year;
      this.last.month = next.month;
      this.last.day = next.day;
      return end_of_data;
    }
  }
  next_year() {
    if (this.next_hour() == 0) {
      return 0;
    }
    if (this.days.length == 0 || ++this.days_index == this.days.length) {
      this.days_index = 0;
      this.increment_year(this.rule.interval);
      if (this.has_by_data("BYMONTHDAY")) {
        this.by_data.BYMONTHDAY = this.normalizeByMonthDayRules(
          this.last.year,
          this.last.month,
          this.rule.parts.BYMONTHDAY
        );
      }
      this.expand_year_days(this.last.year);
      if (this.days.length == 0) {
        return 0;
      }
    }
    return this._nextByYearDay();
  }
  _nextByYearDay() {
    let doy = this.days[this.days_index];
    let year = this.last.year;
    if (Math.abs(doy) == 366 && !Time.isLeapYear(this.last.year)) {
      return 0;
    }
    if (doy < 1) {
      doy += 1;
      year += 1;
    }
    let next = Time.fromDayOfYear(doy, year);
    this.last.day = next.day;
    this.last.month = next.month;
    return 1;
  }
  /**
   * @param dow (eg: '1TU', '-1MO')
   * @param {weekDay=} aWeekStart The week start weekday
   * @return [pos, numericDow] (eg: [1, 3]) numericDow is relative to aWeekStart
   */
  ruleDayOfWeek(dow, aWeekStart) {
    let matches = dow.match(/([+-]?[0-9])?(MO|TU|WE|TH|FR|SA|SU)/);
    if (matches) {
      let pos = parseInt(matches[1] || 0, 10);
      dow = Recur.icalDayToNumericDay(matches[2], aWeekStart);
      return [pos, dow];
    } else {
      return [0, 0];
    }
  }
  next_generic(aRuleType, aInterval, aDateAttr, aFollowingAttr, aPreviousIncr) {
    let has_by_rule = aRuleType in this.by_data;
    let this_freq = this.rule.freq == aInterval;
    let end_of_data = 0;
    if (aPreviousIncr && this[aPreviousIncr]() == 0) {
      return end_of_data;
    }
    if (has_by_rule) {
      this.by_indices[aRuleType]++;
      let dta = this.by_data[aRuleType];
      if (this.by_indices[aRuleType] == dta.length) {
        this.by_indices[aRuleType] = 0;
        end_of_data = 1;
      }
      this.last[aDateAttr] = dta[this.by_indices[aRuleType]];
    } else if (this_freq) {
      this["increment_" + aDateAttr](this.rule.interval);
    }
    if (has_by_rule && end_of_data && this_freq) {
      this["increment_" + aFollowingAttr](1);
    }
    return end_of_data;
  }
  increment_monthday(inc) {
    for (let i = 0; i < inc; i++) {
      let daysInMonth = Time.daysInMonth(this.last.month, this.last.year);
      this.last.day++;
      if (this.last.day > daysInMonth) {
        this.last.day -= daysInMonth;
        this.increment_month();
      }
    }
  }
  increment_month() {
    this.last.day = 1;
    if (this.has_by_data("BYMONTH")) {
      this.by_indices.BYMONTH++;
      if (this.by_indices.BYMONTH == this.by_data.BYMONTH.length) {
        this.by_indices.BYMONTH = 0;
        this.increment_year(1);
      }
      this.last.month = this.by_data.BYMONTH[this.by_indices.BYMONTH];
    } else {
      if (this.rule.freq == "MONTHLY") {
        this.last.month += this.rule.interval;
      } else {
        this.last.month++;
      }
      this.last.month--;
      let years = trunc(this.last.month / 12);
      this.last.month %= 12;
      this.last.month++;
      if (years != 0) {
        this.increment_year(years);
      }
    }
    if (this.has_by_data("BYMONTHDAY")) {
      this.by_data.BYMONTHDAY = this.normalizeByMonthDayRules(
        this.last.year,
        this.last.month,
        this.rule.parts.BYMONTHDAY
      );
    }
  }
  increment_year(inc) {
    this.last.day = 1;
    this.last.year += inc;
  }
  increment_generic(inc, aDateAttr, aFactor, aNextIncrement) {
    this.last[aDateAttr] += inc;
    let nextunit = trunc(this.last[aDateAttr] / aFactor);
    this.last[aDateAttr] %= aFactor;
    if (nextunit != 0) {
      this["increment_" + aNextIncrement](nextunit);
    }
  }
  has_by_data(aRuleType) {
    return aRuleType in this.rule.parts;
  }
  expand_year_days(aYear) {
    let t = new Time();
    this.days = [];
    let parts = {};
    let rules = ["BYDAY", "BYWEEKNO", "BYMONTHDAY", "BYMONTH", "BYYEARDAY"];
    for (let part of rules) {
      if (part in this.rule.parts) {
        parts[part] = this.rule.parts[part];
      }
    }
    if ("BYMONTH" in parts && "BYWEEKNO" in parts) {
      let valid = 1;
      let validWeeks = {};
      t.year = aYear;
      t.isDate = true;
      for (let monthIdx = 0; monthIdx < this.by_data.BYMONTH.length; monthIdx++) {
        let month = this.by_data.BYMONTH[monthIdx];
        t.month = month;
        t.day = 1;
        let first_week = t.weekNumber(this.rule.wkst);
        t.day = Time.daysInMonth(month, aYear);
        let last_week = t.weekNumber(this.rule.wkst);
        for (monthIdx = first_week; monthIdx < last_week; monthIdx++) {
          validWeeks[monthIdx] = 1;
        }
      }
      for (let weekIdx = 0; weekIdx < this.by_data.BYWEEKNO.length && valid; weekIdx++) {
        let weekno = this.by_data.BYWEEKNO[weekIdx];
        if (weekno < 52) {
          valid &= validWeeks[weekIdx];
        } else {
          valid = 0;
        }
      }
      if (valid) {
        delete parts.BYMONTH;
      } else {
        delete parts.BYWEEKNO;
      }
    }
    let partCount = Object.keys(parts).length;
    if (partCount == 0) {
      let t1 = this.dtstart.clone();
      t1.year = this.last.year;
      this.days.push(t1.dayOfYear());
    } else if (partCount == 1 && "BYMONTH" in parts) {
      for (let month of this.by_data.BYMONTH) {
        let t2 = this.dtstart.clone();
        t2.year = aYear;
        t2.month = month;
        t2.isDate = true;
        this.days.push(t2.dayOfYear());
      }
    } else if (partCount == 1 && "BYMONTHDAY" in parts) {
      for (let monthday of this.by_data.BYMONTHDAY) {
        let t3 = this.dtstart.clone();
        if (monthday < 0) {
          let daysInMonth = Time.daysInMonth(t3.month, aYear);
          monthday = monthday + daysInMonth + 1;
        }
        t3.day = monthday;
        t3.year = aYear;
        t3.isDate = true;
        this.days.push(t3.dayOfYear());
      }
    } else if (partCount == 2 && "BYMONTHDAY" in parts && "BYMONTH" in parts) {
      for (let month of this.by_data.BYMONTH) {
        let daysInMonth = Time.daysInMonth(month, aYear);
        for (let monthday of this.by_data.BYMONTHDAY) {
          if (monthday < 0) {
            monthday = monthday + daysInMonth + 1;
          }
          t.day = monthday;
          t.month = month;
          t.year = aYear;
          t.isDate = true;
          this.days.push(t.dayOfYear());
        }
      }
    } else if (partCount == 1 && "BYWEEKNO" in parts) ;
    else if (partCount == 2 && "BYWEEKNO" in parts && "BYMONTHDAY" in parts) ;
    else if (partCount == 1 && "BYDAY" in parts) {
      this.days = this.days.concat(this.expand_by_day(aYear));
    } else if (partCount == 2 && "BYDAY" in parts && "BYMONTH" in parts) {
      for (let month of this.by_data.BYMONTH) {
        let daysInMonth = Time.daysInMonth(month, aYear);
        t.year = aYear;
        t.month = month;
        t.day = 1;
        t.isDate = true;
        let first_dow = t.dayOfWeek();
        let doy_offset = t.dayOfYear() - 1;
        t.day = daysInMonth;
        let last_dow = t.dayOfWeek();
        if (this.has_by_data("BYSETPOS")) {
          let by_month_day = [];
          for (let day = 1; day <= daysInMonth; day++) {
            t.day = day;
            if (this.is_day_in_byday(t)) {
              by_month_day.push(day);
            }
          }
          for (let spIndex = 0; spIndex < by_month_day.length; spIndex++) {
            if (this.check_set_position(spIndex + 1) || this.check_set_position(spIndex - by_month_day.length)) {
              this.days.push(doy_offset + by_month_day[spIndex]);
            }
          }
        } else {
          for (let coded_day of this.by_data.BYDAY) {
            let bydayParts = this.ruleDayOfWeek(coded_day);
            let pos = bydayParts[0];
            let dow = bydayParts[1];
            let month_day;
            let first_matching_day = (dow + 7 - first_dow) % 7 + 1;
            let last_matching_day = daysInMonth - (last_dow + 7 - dow) % 7;
            if (pos == 0) {
              for (let day = first_matching_day; day <= daysInMonth; day += 7) {
                this.days.push(doy_offset + day);
              }
            } else if (pos > 0) {
              month_day = first_matching_day + (pos - 1) * 7;
              if (month_day <= daysInMonth) {
                this.days.push(doy_offset + month_day);
              }
            } else {
              month_day = last_matching_day + (pos + 1) * 7;
              if (month_day > 0) {
                this.days.push(doy_offset + month_day);
              }
            }
          }
        }
      }
      this.days.sort(function(a, b) {
        return a - b;
      });
    } else if (partCount == 2 && "BYDAY" in parts && "BYMONTHDAY" in parts) {
      let expandedDays = this.expand_by_day(aYear);
      for (let day of expandedDays) {
        let tt = Time.fromDayOfYear(day, aYear);
        if (this.by_data.BYMONTHDAY.indexOf(tt.day) >= 0) {
          this.days.push(day);
        }
      }
    } else if (partCount == 3 && "BYDAY" in parts && "BYMONTHDAY" in parts && "BYMONTH" in parts) {
      let expandedDays = this.expand_by_day(aYear);
      for (let day of expandedDays) {
        let tt = Time.fromDayOfYear(day, aYear);
        if (this.by_data.BYMONTH.indexOf(tt.month) >= 0 && this.by_data.BYMONTHDAY.indexOf(tt.day) >= 0) {
          this.days.push(day);
        }
      }
    } else if (partCount == 2 && "BYDAY" in parts && "BYWEEKNO" in parts) {
      let expandedDays = this.expand_by_day(aYear);
      for (let day of expandedDays) {
        let tt = Time.fromDayOfYear(day, aYear);
        let weekno = tt.weekNumber(this.rule.wkst);
        if (this.by_data.BYWEEKNO.indexOf(weekno)) {
          this.days.push(day);
        }
      }
    } else if (partCount == 3 && "BYDAY" in parts && "BYWEEKNO" in parts && "BYMONTHDAY" in parts) ;
    else if (partCount == 1 && "BYYEARDAY" in parts) {
      this.days = this.days.concat(this.by_data.BYYEARDAY);
    } else if (partCount == 2 && "BYYEARDAY" in parts && "BYDAY" in parts) {
      let daysInYear2 = Time.isLeapYear(aYear) ? 366 : 365;
      let expandedDays = new Set(this.expand_by_day(aYear));
      for (let doy of this.by_data.BYYEARDAY) {
        if (doy < 0) {
          doy += daysInYear2 + 1;
        }
        if (expandedDays.has(doy)) {
          this.days.push(doy);
        }
      }
    } else {
      this.days = [];
    }
    let daysInYear = Time.isLeapYear(aYear) ? 366 : 365;
    this.days.sort((a, b) => {
      if (a < 0) a += daysInYear + 1;
      if (b < 0) b += daysInYear + 1;
      return a - b;
    });
    return 0;
  }
  expand_by_day(aYear) {
    let days_list = [];
    let tmp = this.last.clone();
    tmp.year = aYear;
    tmp.month = 1;
    tmp.day = 1;
    tmp.isDate = true;
    let start_dow = tmp.dayOfWeek();
    tmp.month = 12;
    tmp.day = 31;
    tmp.isDate = true;
    let end_dow = tmp.dayOfWeek();
    let end_year_day = tmp.dayOfYear();
    for (let day of this.by_data.BYDAY) {
      let parts = this.ruleDayOfWeek(day);
      let pos = parts[0];
      let dow = parts[1];
      if (pos == 0) {
        let tmp_start_doy = (dow + 7 - start_dow) % 7 + 1;
        for (let doy = tmp_start_doy; doy <= end_year_day; doy += 7) {
          days_list.push(doy);
        }
      } else if (pos > 0) {
        let first;
        if (dow >= start_dow) {
          first = dow - start_dow + 1;
        } else {
          first = dow - start_dow + 8;
        }
        days_list.push(first + (pos - 1) * 7);
      } else {
        let last;
        pos = -pos;
        if (dow <= end_dow) {
          last = end_year_day - end_dow + dow;
        } else {
          last = end_year_day - end_dow + dow - 7;
        }
        days_list.push(last - (pos - 1) * 7);
      }
    }
    return days_list;
  }
  is_day_in_byday(tt) {
    if (this.by_data.BYDAY) {
      for (let day of this.by_data.BYDAY) {
        let parts = this.ruleDayOfWeek(day);
        let pos = parts[0];
        let dow = parts[1];
        let this_dow = tt.dayOfWeek();
        if (pos == 0 && dow == this_dow || tt.nthWeekDay(dow, pos) == tt.day) {
          return 1;
        }
      }
    }
    return 0;
  }
  /**
   * Checks if given value is in BYSETPOS.
   *
   * @private
   * @param {Numeric} aPos position to check for.
   * @return {Boolean} false unless BYSETPOS rules exist
   *                   and the given value is present in rules.
   */
  check_set_position(aPos) {
    if (this.has_by_data("BYSETPOS")) {
      let idx = this.by_data.BYSETPOS.indexOf(aPos);
      return idx !== -1;
    }
    return false;
  }
  sort_byday_rules(aRules) {
    for (let i = 0; i < aRules.length; i++) {
      for (let j = 0; j < i; j++) {
        let one = this.ruleDayOfWeek(aRules[j], this.rule.wkst)[1];
        let two = this.ruleDayOfWeek(aRules[i], this.rule.wkst)[1];
        if (one > two) {
          let tmp = aRules[i];
          aRules[i] = aRules[j];
          aRules[j] = tmp;
        }
      }
    }
  }
  check_contract_restriction(aRuleType, v) {
    let indexMapValue = _RecurIterator._indexMap[aRuleType];
    let ruleMapValue = _RecurIterator._expandMap[this.rule.freq][indexMapValue];
    let pass = false;
    if (aRuleType in this.by_data && ruleMapValue == _RecurIterator.CONTRACT) {
      let ruleType = this.by_data[aRuleType];
      for (let bydata of ruleType) {
        if (bydata == v) {
          pass = true;
          break;
        }
      }
    } else {
      pass = true;
    }
    return pass;
  }
  check_contracting_rules() {
    let dow = this.last.dayOfWeek();
    let weekNo = this.last.weekNumber(this.rule.wkst);
    let doy = this.last.dayOfYear();
    return this.check_contract_restriction("BYSECOND", this.last.second) && this.check_contract_restriction("BYMINUTE", this.last.minute) && this.check_contract_restriction("BYHOUR", this.last.hour) && this.check_contract_restriction("BYDAY", Recur.numericDayToIcalDay(dow)) && this.check_contract_restriction("BYWEEKNO", weekNo) && this.check_contract_restriction("BYMONTHDAY", this.last.day) && this.check_contract_restriction("BYMONTH", this.last.month) && this.check_contract_restriction("BYYEARDAY", doy);
  }
  setup_defaults(aRuleType, req, deftime) {
    let indexMapValue = _RecurIterator._indexMap[aRuleType];
    let ruleMapValue = _RecurIterator._expandMap[this.rule.freq][indexMapValue];
    if (ruleMapValue != _RecurIterator.CONTRACT) {
      if (!(aRuleType in this.by_data)) {
        this.by_data[aRuleType] = [deftime];
      }
      if (this.rule.freq != req) {
        return this.by_data[aRuleType][0];
      }
    }
    return deftime;
  }
  /**
   * Convert iterator into a serialize-able object.  Will preserve current
   * iteration sequence to ensure the seamless continuation of the recurrence
   * rule.
   * @return {Object}
   */
  toJSON() {
    let result = /* @__PURE__ */ Object.create(null);
    result.initialized = this.initialized;
    result.rule = this.rule.toJSON();
    result.dtstart = this.dtstart.toJSON();
    result.by_data = this.by_data;
    result.days = this.days;
    result.last = this.last.toJSON();
    result.by_indices = this.by_indices;
    result.occurrence_number = this.occurrence_number;
    return result;
  }
};
__publicField(_RecurIterator, "_indexMap", {
  "BYSECOND": 0,
  "BYMINUTE": 1,
  "BYHOUR": 2,
  "BYDAY": 3,
  "BYMONTHDAY": 4,
  "BYYEARDAY": 5,
  "BYWEEKNO": 6,
  "BYMONTH": 7,
  "BYSETPOS": 8
});
__publicField(_RecurIterator, "_expandMap", {
  "SECONDLY": [1, 1, 1, 1, 1, 1, 1, 1],
  "MINUTELY": [2, 1, 1, 1, 1, 1, 1, 1],
  "HOURLY": [2, 2, 1, 1, 1, 1, 1, 1],
  "DAILY": [2, 2, 2, 1, 1, 1, 1, 1],
  "WEEKLY": [2, 2, 2, 2, 3, 3, 1, 1],
  "MONTHLY": [2, 2, 2, 2, 2, 3, 3, 1],
  "YEARLY": [2, 2, 2, 2, 2, 2, 2, 2]
});
__publicField(_RecurIterator, "UNKNOWN", 0);
__publicField(_RecurIterator, "CONTRACT", 1);
__publicField(_RecurIterator, "EXPAND", 2);
__publicField(_RecurIterator, "ILLEGAL", 3);
var RecurIterator = _RecurIterator;
var InvalidRecurrenceRuleError = class extends Error {
  constructor() {
    super("Recurrence rule has no valid occurrences");
  }
};
var VALID_DAY_NAMES = /^(SU|MO|TU|WE|TH|FR|SA)$/;
var VALID_BYDAY_PART = /^([+-])?(5[0-3]|[1-4][0-9]|[1-9])?(SU|MO|TU|WE|TH|FR|SA)$/;
var DOW_MAP = {
  SU: Time.SUNDAY,
  MO: Time.MONDAY,
  TU: Time.TUESDAY,
  WE: Time.WEDNESDAY,
  TH: Time.THURSDAY,
  FR: Time.FRIDAY,
  SA: Time.SATURDAY
};
var REVERSE_DOW_MAP = Object.fromEntries(Object.entries(DOW_MAP).map((entry) => entry.reverse()));
var ALLOWED_FREQ = [
  "SECONDLY",
  "MINUTELY",
  "HOURLY",
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "YEARLY"
];
var Recur = class _Recur {
  /**
   * Create a new instance of the Recur class.
   *
   * @param {Object} data                               An object with members of the recurrence
   * @param {frequencyValues=} data.freq                The frequency value
   * @param {Number=} data.interval                     The INTERVAL value
   * @param {weekDay=} data.wkst                        The week start value
   * @param {Time=} data.until                          The end of the recurrence set
   * @param {Number=} data.count                        The number of occurrences
   * @param {Array.<Number>=} data.bysecond             The seconds for the BYSECOND part
   * @param {Array.<Number>=} data.byminute             The minutes for the BYMINUTE part
   * @param {Array.<Number>=} data.byhour               The hours for the BYHOUR part
   * @param {Array.<String>=} data.byday                The BYDAY values
   * @param {Array.<Number>=} data.bymonthday           The days for the BYMONTHDAY part
   * @param {Array.<Number>=} data.byyearday            The days for the BYYEARDAY part
   * @param {Array.<Number>=} data.byweekno             The weeks for the BYWEEKNO part
   * @param {Array.<Number>=} data.bymonth              The month for the BYMONTH part
   * @param {Array.<Number>=} data.bysetpos             The positionals for the BYSETPOS part
   */
  constructor(data) {
    /**
     * An object holding the BY-parts of the recurrence rule
     * @memberof ICAL.Recur
     * @typedef {Object} byParts
     * @property {Array.<Number>=} BYSECOND            The seconds for the BYSECOND part
     * @property {Array.<Number>=} BYMINUTE            The minutes for the BYMINUTE part
     * @property {Array.<Number>=} BYHOUR              The hours for the BYHOUR part
     * @property {Array.<String>=} BYDAY               The BYDAY values
     * @property {Array.<Number>=} BYMONTHDAY          The days for the BYMONTHDAY part
     * @property {Array.<Number>=} BYYEARDAY           The days for the BYYEARDAY part
     * @property {Array.<Number>=} BYWEEKNO            The weeks for the BYWEEKNO part
     * @property {Array.<Number>=} BYMONTH             The month for the BYMONTH part
     * @property {Array.<Number>=} BYSETPOS            The positionals for the BYSETPOS part
     */
    /**
     * An object holding the BY-parts of the recurrence rule
     * @type {byParts}
     */
    __publicField(this, "parts", null);
    /**
     * The interval value for the recurrence rule.
     * @type {Number}
     */
    __publicField(this, "interval", 1);
    /**
     * The week start day
     *
     * @type {weekDay}
     * @default ICAL.Time.MONDAY
     */
    __publicField(this, "wkst", Time.MONDAY);
    /**
     * The end of the recurrence
     * @type {?Time}
     */
    __publicField(this, "until", null);
    /**
     * The maximum number of occurrences
     * @type {?Number}
     */
    __publicField(this, "count", null);
    /**
     * The frequency value.
     * @type {frequencyValues}
     */
    __publicField(this, "freq", null);
    /**
     * The class identifier.
     * @constant
     * @type {String}
     * @default "icalrecur"
     */
    __publicField(this, "icalclass", "icalrecur");
    /**
     * The type name, to be used in the jCal object.
     * @constant
     * @type {String}
     * @default "recur"
     */
    __publicField(this, "icaltype", "recur");
    this.wrappedJSObject = this;
    this.parts = {};
    if (data && typeof data === "object") {
      this.fromData(data);
    }
  }
  /**
   * Creates a new {@link ICAL.Recur} instance from the passed string.
   *
   * @param {String} string         The string to parse
   * @return {Recur}                The created recurrence instance
   */
  static fromString(string) {
    let data = this._stringToData(string, false);
    return new _Recur(data);
  }
  /**
   * Creates a new {@link ICAL.Recur} instance using members from the passed
   * data object.
   *
   * @param {Object} aData                              An object with members of the recurrence
   * @param {frequencyValues=} aData.freq               The frequency value
   * @param {Number=} aData.interval                    The INTERVAL value
   * @param {weekDay=} aData.wkst                       The week start value
   * @param {Time=} aData.until                         The end of the recurrence set
   * @param {Number=} aData.count                       The number of occurrences
   * @param {Array.<Number>=} aData.bysecond            The seconds for the BYSECOND part
   * @param {Array.<Number>=} aData.byminute            The minutes for the BYMINUTE part
   * @param {Array.<Number>=} aData.byhour              The hours for the BYHOUR part
   * @param {Array.<String>=} aData.byday               The BYDAY values
   * @param {Array.<Number>=} aData.bymonthday          The days for the BYMONTHDAY part
   * @param {Array.<Number>=} aData.byyearday           The days for the BYYEARDAY part
   * @param {Array.<Number>=} aData.byweekno            The weeks for the BYWEEKNO part
   * @param {Array.<Number>=} aData.bymonth             The month for the BYMONTH part
   * @param {Array.<Number>=} aData.bysetpos            The positionals for the BYSETPOS part
   */
  static fromData(aData) {
    return new _Recur(aData);
  }
  /**
   * Converts a recurrence string to a data object, suitable for the fromData
   * method.
   *
   * @private
   * @param {String} string     The string to parse
   * @param {Boolean} fmtIcal   If true, the string is considered to be an
   *                              iCalendar string
   * @return {Recur}            The recurrence instance
   */
  static _stringToData(string, fmtIcal) {
    let dict = /* @__PURE__ */ Object.create(null);
    let values = string.split(";");
    let len = values.length;
    for (let i = 0; i < len; i++) {
      let parts = values[i].split("=");
      let ucname = parts[0].toUpperCase();
      let lcname = parts[0].toLowerCase();
      let name = fmtIcal ? lcname : ucname;
      let value = parts[1];
      if (ucname in partDesign) {
        let partArr = value.split(",");
        let partSet = /* @__PURE__ */ new Set();
        for (let part of partArr) {
          partSet.add(partDesign[ucname](part));
        }
        partArr = [...partSet];
        dict[name] = partArr.length == 1 ? partArr[0] : partArr;
      } else if (ucname in optionDesign) {
        optionDesign[ucname](value, dict, fmtIcal);
      } else {
        dict[lcname] = value;
      }
    }
    return dict;
  }
  /**
   * Convert an ical representation of a day (SU, MO, etc..)
   * into a numeric value of that day.
   *
   * @param {String} string     The iCalendar day name
   * @param {weekDay=} aWeekStart
   *        The week start weekday, defaults to SUNDAY
   * @return {Number}           Numeric value of given day
   */
  static icalDayToNumericDay(string, aWeekStart) {
    let firstDow = aWeekStart || Time.SUNDAY;
    return (DOW_MAP[string] - firstDow + 7) % 7 + 1;
  }
  /**
   * Convert a numeric day value into its ical representation (SU, MO, etc..)
   *
   * @param {Number} num        Numeric value of given day
   * @param {weekDay=} aWeekStart
   *        The week start weekday, defaults to SUNDAY
   * @return {String}           The ICAL day value, e.g SU,MO,...
   */
  static numericDayToIcalDay(num, aWeekStart) {
    let firstDow = aWeekStart || Time.SUNDAY;
    let dow = num + firstDow - Time.SUNDAY;
    if (dow > 7) {
      dow -= 7;
    }
    return REVERSE_DOW_MAP[dow];
  }
  /**
   * Create a new iterator for this recurrence rule. The passed start date
   * must be the start date of the event, not the start of the range to
   * search in.
   *
   * @example
   * let recur = comp.getFirstPropertyValue('rrule');
   * let dtstart = comp.getFirstPropertyValue('dtstart');
   * let iter = recur.iterator(dtstart);
   * for (let next = iter.next(); next; next = iter.next()) {
   *   if (next.compare(rangeStart) < 0) {
   *     continue;
   *   }
   *   console.log(next.toString());
   * }
   *
   * @param {Time} aStart        The item's start date
   * @return {RecurIterator}     The recurrence iterator
   */
  iterator(aStart) {
    return new RecurIterator({
      rule: this,
      dtstart: aStart
    });
  }
  /**
   * Returns a clone of the recurrence object.
   *
   * @return {Recur}      The cloned object
   */
  clone() {
    return new _Recur(this.toJSON());
  }
  /**
   * Checks if the current rule is finite, i.e. has a count or until part.
   *
   * @return {Boolean}        True, if the rule is finite
   */
  isFinite() {
    return !!(this.count || this.until);
  }
  /**
   * Checks if the current rule has a count part, and not limited by an until
   * part.
   *
   * @return {Boolean}        True, if the rule is by count
   */
  isByCount() {
    return !!(this.count && !this.until);
  }
  /**
   * Adds a component (part) to the recurrence rule. This is not a component
   * in the sense of {@link ICAL.Component}, but a part of the recurrence
   * rule, i.e. BYMONTH.
   *
   * @param {String} aType            The name of the component part
   * @param {Array|String} aValue     The component value
   */
  addComponent(aType, aValue) {
    let ucname = aType.toUpperCase();
    if (ucname in this.parts) {
      this.parts[ucname].push(aValue);
    } else {
      this.parts[ucname] = [aValue];
    }
  }
  /**
   * Sets the component value for the given by-part.
   *
   * @param {String} aType        The component part name
   * @param {Array} aValues       The component values
   */
  setComponent(aType, aValues) {
    this.parts[aType.toUpperCase()] = aValues.slice();
  }
  /**
   * Gets (a copy) of the requested component value.
   *
   * @param {String} aType        The component part name
   * @return {Array}              The component part value
   */
  getComponent(aType) {
    let ucname = aType.toUpperCase();
    return ucname in this.parts ? this.parts[ucname].slice() : [];
  }
  /**
   * Retrieves the next occurrence after the given recurrence id. See the
   * guide on {@tutorial terminology} for more details.
   *
   * NOTE: Currently, this method iterates all occurrences from the start
   * date. It should not be called in a loop for performance reasons. If you
   * would like to get more than one occurrence, you can iterate the
   * occurrences manually, see the example on the
   * {@link ICAL.Recur#iterator iterator} method.
   *
   * @param {Time} aStartTime        The start of the event series
   * @param {Time} aRecurrenceId     The date of the last occurrence
   * @return {Time}                  The next occurrence after
   */
  getNextOccurrence(aStartTime, aRecurrenceId) {
    let iter = this.iterator(aStartTime);
    let next;
    do {
      next = iter.next();
    } while (next && next.compare(aRecurrenceId) <= 0);
    if (next && aRecurrenceId.zone) {
      next.zone = aRecurrenceId.zone;
    }
    return next;
  }
  /**
   * Sets up the current instance using members from the passed data object.
   *
   * @param {Object} data                               An object with members of the recurrence
   * @param {frequencyValues=} data.freq                The frequency value
   * @param {Number=} data.interval                     The INTERVAL value
   * @param {weekDay=} data.wkst                        The week start value
   * @param {Time=} data.until                          The end of the recurrence set
   * @param {Number=} data.count                        The number of occurrences
   * @param {Array.<Number>=} data.bysecond             The seconds for the BYSECOND part
   * @param {Array.<Number>=} data.byminute             The minutes for the BYMINUTE part
   * @param {Array.<Number>=} data.byhour               The hours for the BYHOUR part
   * @param {Array.<String>=} data.byday                The BYDAY values
   * @param {Array.<Number>=} data.bymonthday           The days for the BYMONTHDAY part
   * @param {Array.<Number>=} data.byyearday            The days for the BYYEARDAY part
   * @param {Array.<Number>=} data.byweekno             The weeks for the BYWEEKNO part
   * @param {Array.<Number>=} data.bymonth              The month for the BYMONTH part
   * @param {Array.<Number>=} data.bysetpos             The positionals for the BYSETPOS part
   */
  fromData(data) {
    for (let key2 in data) {
      let uckey = key2.toUpperCase();
      if (uckey in partDesign) {
        if (Array.isArray(data[key2])) {
          this.parts[uckey] = data[key2];
        } else {
          this.parts[uckey] = [data[key2]];
        }
      } else {
        this[key2] = data[key2];
      }
    }
    if (this.interval && typeof this.interval != "number") {
      optionDesign.INTERVAL(this.interval, this);
    }
    if (this.wkst && typeof this.wkst != "number") {
      this.wkst = _Recur.icalDayToNumericDay(this.wkst);
    }
    if (this.until && !(this.until instanceof Time)) {
      this.until = Time.fromString(this.until);
    }
  }
  /**
   * The jCal representation of this recurrence type.
   * @return {Object}
   */
  toJSON() {
    let res = /* @__PURE__ */ Object.create(null);
    res.freq = this.freq;
    if (this.count) {
      res.count = this.count;
    }
    if (this.interval > 1) {
      res.interval = this.interval;
    }
    for (let [k, kparts] of Object.entries(this.parts)) {
      if (Array.isArray(kparts) && kparts.length == 1) {
        res[k.toLowerCase()] = kparts[0];
      } else {
        res[k.toLowerCase()] = clone(kparts);
      }
    }
    if (this.until) {
      res.until = this.until.toString();
    }
    if ("wkst" in this && this.wkst !== Time.DEFAULT_WEEK_START) {
      res.wkst = _Recur.numericDayToIcalDay(this.wkst);
    }
    return res;
  }
  /**
   * The string representation of this recurrence rule.
   * @return {String}
   */
  toString() {
    let str = "FREQ=" + this.freq;
    if (this.count) {
      str += ";COUNT=" + this.count;
    }
    if (this.interval > 1) {
      str += ";INTERVAL=" + this.interval;
    }
    for (let [k, v] of Object.entries(this.parts)) {
      str += ";" + k + "=" + v;
    }
    if (this.until) {
      str += ";UNTIL=" + this.until.toICALString();
    }
    if ("wkst" in this && this.wkst !== Time.DEFAULT_WEEK_START) {
      str += ";WKST=" + _Recur.numericDayToIcalDay(this.wkst);
    }
    return str;
  }
};
function parseNumericValue(type, min, max, value) {
  let result = value;
  if (value[0] === "+") {
    result = value.slice(1);
  }
  result = strictParseInt(result);
  if (min !== void 0 && value < min) {
    throw new Error(
      type + ': invalid value "' + value + '" must be > ' + min
    );
  }
  if (max !== void 0 && value > max) {
    throw new Error(
      type + ': invalid value "' + value + '" must be < ' + min
    );
  }
  return result;
}
var optionDesign = {
  FREQ: function(value, dict, fmtIcal) {
    if (ALLOWED_FREQ.indexOf(value) !== -1) {
      dict.freq = value;
    } else {
      throw new Error(
        'invalid frequency "' + value + '" expected: "' + ALLOWED_FREQ.join(", ") + '"'
      );
    }
  },
  COUNT: function(value, dict, fmtIcal) {
    dict.count = strictParseInt(value);
  },
  INTERVAL: function(value, dict, fmtIcal) {
    dict.interval = strictParseInt(value);
    if (dict.interval < 1) {
      dict.interval = 1;
    }
  },
  UNTIL: function(value, dict, fmtIcal) {
    if (value.length > 10) {
      dict.until = design.icalendar.value["date-time"].fromICAL(value);
    } else {
      dict.until = design.icalendar.value.date.fromICAL(value);
    }
    if (!fmtIcal) {
      dict.until = Time.fromString(dict.until);
    }
  },
  WKST: function(value, dict, fmtIcal) {
    if (VALID_DAY_NAMES.test(value)) {
      dict.wkst = Recur.icalDayToNumericDay(value);
    } else {
      throw new Error('invalid WKST value "' + value + '"');
    }
  }
};
var partDesign = {
  BYSECOND: parseNumericValue.bind(void 0, "BYSECOND", 0, 60),
  BYMINUTE: parseNumericValue.bind(void 0, "BYMINUTE", 0, 59),
  BYHOUR: parseNumericValue.bind(void 0, "BYHOUR", 0, 23),
  BYDAY: function(value) {
    if (VALID_BYDAY_PART.test(value)) {
      return value;
    } else {
      throw new Error('invalid BYDAY value "' + value + '"');
    }
  },
  BYMONTHDAY: parseNumericValue.bind(void 0, "BYMONTHDAY", -31, 31),
  BYYEARDAY: parseNumericValue.bind(void 0, "BYYEARDAY", -366, 366),
  BYWEEKNO: parseNumericValue.bind(void 0, "BYWEEKNO", -53, 53),
  BYMONTH: parseNumericValue.bind(void 0, "BYMONTH", 1, 12),
  BYSETPOS: parseNumericValue.bind(void 0, "BYSETPOS", -366, 366)
};
var FROM_ICAL_NEWLINE = /\\\\|\\;|\\,|\\[Nn]/g;
var TO_ICAL_NEWLINE = /\\|;|,|\n/g;
var FROM_VCARD_NEWLINE = /\\\\|\\,|\\[Nn]/g;
var TO_VCARD_NEWLINE = /\\|,|\n/g;
function createTextType(fromNewline, toNewline) {
  let result = {
    matches: /.*/,
    fromICAL: function(aValue, structuredEscape) {
      return replaceNewline(aValue, fromNewline, structuredEscape);
    },
    toICAL: function(aValue, structuredEscape) {
      let regEx = toNewline;
      if (structuredEscape)
        regEx = new RegExp(regEx.source + "|" + structuredEscape, regEx.flags);
      return aValue.replace(regEx, function(str) {
        switch (str) {
          case "\\":
            return "\\\\";
          case ";":
            return "\\;";
          case ",":
            return "\\,";
          case "\n":
            return "\\n";
          /* c8 ignore next 2 */
          default:
            return str;
        }
      });
    }
  };
  return result;
}
var DEFAULT_TYPE_TEXT = { defaultType: "text" };
var DEFAULT_TYPE_TEXT_MULTI = { defaultType: "text", multiValue: "," };
var DEFAULT_TYPE_TEXT_STRUCTURED = { defaultType: "text", structuredValue: ";" };
var DEFAULT_TYPE_INTEGER = { defaultType: "integer" };
var DEFAULT_TYPE_DATETIME_DATE = { defaultType: "date-time", allowedTypes: ["date-time", "date"] };
var DEFAULT_TYPE_DATETIME = { defaultType: "date-time" };
var DEFAULT_TYPE_URI = { defaultType: "uri" };
var DEFAULT_TYPE_UTCOFFSET = { defaultType: "utc-offset" };
var DEFAULT_TYPE_RECUR = { defaultType: "recur" };
var DEFAULT_TYPE_DATE_ANDOR_TIME = { defaultType: "date-and-or-time", allowedTypes: ["date-time", "date", "text"] };
function replaceNewlineReplace(string) {
  switch (string) {
    case "\\\\":
      return "\\";
    case "\\;":
      return ";";
    case "\\,":
      return ",";
    case "\\n":
    case "\\N":
      return "\n";
    /* c8 ignore next 2 */
    default:
      return string;
  }
}
function replaceNewline(value, newline, structuredEscape) {
  if (value.indexOf("\\") === -1) {
    return value;
  }
  if (structuredEscape)
    newline = new RegExp(newline.source + "|\\\\" + structuredEscape, newline.flags);
  return value.replace(newline, replaceNewlineReplace);
}
var commonProperties = {
  "categories": DEFAULT_TYPE_TEXT_MULTI,
  "url": DEFAULT_TYPE_URI,
  "version": DEFAULT_TYPE_TEXT,
  "uid": DEFAULT_TYPE_TEXT
};
var commonValues = {
  "boolean": {
    values: ["TRUE", "FALSE"],
    fromICAL: function(aValue) {
      switch (aValue) {
        case "TRUE":
          return true;
        case "FALSE":
          return false;
        default:
          return false;
      }
    },
    toICAL: function(aValue) {
      if (aValue) {
        return "TRUE";
      }
      return "FALSE";
    }
  },
  float: {
    matches: /^[+-]?\d+\.\d+$/,
    fromICAL: function(aValue) {
      let parsed = parseFloat(aValue);
      if (isStrictlyNaN(parsed)) {
        return 0;
      }
      return parsed;
    },
    toICAL: function(aValue) {
      return String(aValue);
    }
  },
  integer: {
    fromICAL: function(aValue) {
      let parsed = parseInt(aValue);
      if (isStrictlyNaN(parsed)) {
        return 0;
      }
      return parsed;
    },
    toICAL: function(aValue) {
      return String(aValue);
    }
  },
  "utc-offset": {
    toICAL: function(aValue) {
      if (aValue.length < 7) {
        return aValue.slice(0, 3) + aValue.slice(4, 6);
      } else {
        return aValue.slice(0, 3) + aValue.slice(4, 6) + aValue.slice(7, 9);
      }
    },
    fromICAL: function(aValue) {
      if (aValue.length < 6) {
        return aValue.slice(0, 3) + ":" + aValue.slice(3, 5);
      } else {
        return aValue.slice(0, 3) + ":" + aValue.slice(3, 5) + ":" + aValue.slice(5, 7);
      }
    },
    decorate: function(aValue) {
      return UtcOffset.fromString(aValue);
    },
    undecorate: function(aValue) {
      return aValue.toString();
    }
  }
};
var icalParams = {
  // Although the syntax is DQUOTE uri DQUOTE, I don't think we should
  // enforce anything aside from it being a valid content line.
  //
  // At least some params require - if multi values are used - DQUOTEs
  // for each of its values - e.g. delegated-from="uri1","uri2"
  // To indicate this, I introduced the new k/v pair
  // multiValueSeparateDQuote: true
  //
  // "ALTREP": { ... },
  // CN just wants a param-value
  // "CN": { ... }
  "cutype": {
    values: ["INDIVIDUAL", "GROUP", "RESOURCE", "ROOM", "UNKNOWN"],
    allowXName: true,
    allowIanaToken: true
  },
  "delegated-from": {
    valueType: "cal-address",
    multiValue: ",",
    multiValueSeparateDQuote: true
  },
  "delegated-to": {
    valueType: "cal-address",
    multiValue: ",",
    multiValueSeparateDQuote: true
  },
  // "DIR": { ... }, // See ALTREP
  "encoding": {
    values: ["8BIT", "BASE64"]
  },
  // "FMTTYPE": { ... }, // See ALTREP
  "fbtype": {
    values: ["FREE", "BUSY", "BUSY-UNAVAILABLE", "BUSY-TENTATIVE"],
    allowXName: true,
    allowIanaToken: true
  },
  // "LANGUAGE": { ... }, // See ALTREP
  "member": {
    valueType: "cal-address",
    multiValue: ",",
    multiValueSeparateDQuote: true
  },
  "partstat": {
    // TODO These values are actually different per-component
    values: [
      "NEEDS-ACTION",
      "ACCEPTED",
      "DECLINED",
      "TENTATIVE",
      "DELEGATED",
      "COMPLETED",
      "IN-PROCESS"
    ],
    allowXName: true,
    allowIanaToken: true
  },
  "range": {
    values: ["THISANDFUTURE"]
  },
  "related": {
    values: ["START", "END"]
  },
  "reltype": {
    values: ["PARENT", "CHILD", "SIBLING"],
    allowXName: true,
    allowIanaToken: true
  },
  "role": {
    values: [
      "REQ-PARTICIPANT",
      "CHAIR",
      "OPT-PARTICIPANT",
      "NON-PARTICIPANT"
    ],
    allowXName: true,
    allowIanaToken: true
  },
  "rsvp": {
    values: ["TRUE", "FALSE"]
  },
  "sent-by": {
    valueType: "cal-address"
  },
  "tzid": {
    matches: /^\//
  },
  "value": {
    // since the value here is a 'type' lowercase is used.
    values: [
      "binary",
      "boolean",
      "cal-address",
      "date",
      "date-time",
      "duration",
      "float",
      "integer",
      "period",
      "recur",
      "text",
      "time",
      "uri",
      "utc-offset"
    ],
    allowXName: true,
    allowIanaToken: true
  }
};
var icalValues = extend(commonValues, {
  text: createTextType(FROM_ICAL_NEWLINE, TO_ICAL_NEWLINE),
  uri: {
    // TODO
    /* ... */
  },
  "binary": {
    decorate: function(aString) {
      return Binary.fromString(aString);
    },
    undecorate: function(aBinary) {
      return aBinary.toString();
    }
  },
  "cal-address": {
    // needs to be an uri
  },
  "date": {
    decorate: function(aValue, aProp) {
      if (design.strict) {
        return Time.fromDateString(aValue, aProp);
      } else {
        return Time.fromString(aValue, aProp);
      }
    },
    /**
     * undecorates a time object.
     */
    undecorate: function(aValue) {
      return aValue.toString();
    },
    fromICAL: function(aValue) {
      if (!design.strict && aValue.length >= 15) {
        return icalValues["date-time"].fromICAL(aValue);
      } else {
        return aValue.slice(0, 4) + "-" + aValue.slice(4, 6) + "-" + aValue.slice(6, 8);
      }
    },
    toICAL: function(aValue) {
      let len = aValue.length;
      if (len == 10) {
        return aValue.slice(0, 4) + aValue.slice(5, 7) + aValue.slice(8, 10);
      } else if (len >= 19) {
        return icalValues["date-time"].toICAL(aValue);
      } else {
        return aValue;
      }
    }
  },
  "date-time": {
    fromICAL: function(aValue) {
      if (!design.strict && aValue.length == 8) {
        return icalValues.date.fromICAL(aValue);
      } else {
        let result = aValue.slice(0, 4) + "-" + aValue.slice(4, 6) + "-" + aValue.slice(6, 8) + "T" + aValue.slice(9, 11) + ":" + aValue.slice(11, 13) + ":" + aValue.slice(13, 15);
        if (aValue[15] && aValue[15] === "Z") {
          result += "Z";
        }
        return result;
      }
    },
    toICAL: function(aValue) {
      let len = aValue.length;
      if (len == 10 && !design.strict) {
        return icalValues.date.toICAL(aValue);
      } else if (len >= 19) {
        let result = aValue.slice(0, 4) + aValue.slice(5, 7) + // grab the (DDTHH) segment
        aValue.slice(8, 13) + // MM
        aValue.slice(14, 16) + // SS
        aValue.slice(17, 19);
        if (aValue[19] && aValue[19] === "Z") {
          result += "Z";
        }
        return result;
      } else {
        return aValue;
      }
    },
    decorate: function(aValue, aProp) {
      if (design.strict) {
        return Time.fromDateTimeString(aValue, aProp);
      } else {
        return Time.fromString(aValue, aProp);
      }
    },
    undecorate: function(aValue) {
      return aValue.toString();
    }
  },
  duration: {
    decorate: function(aValue) {
      return Duration.fromString(aValue);
    },
    undecorate: function(aValue) {
      return aValue.toString();
    }
  },
  period: {
    fromICAL: function(string) {
      let parts = string.split("/");
      parts[0] = icalValues["date-time"].fromICAL(parts[0]);
      if (!Duration.isValueString(parts[1])) {
        parts[1] = icalValues["date-time"].fromICAL(parts[1]);
      }
      return parts;
    },
    toICAL: function(parts) {
      parts = parts.slice();
      if (!design.strict && parts[0].length == 10) {
        parts[0] = icalValues.date.toICAL(parts[0]);
      } else {
        parts[0] = icalValues["date-time"].toICAL(parts[0]);
      }
      if (!Duration.isValueString(parts[1])) {
        if (!design.strict && parts[1].length == 10) {
          parts[1] = icalValues.date.toICAL(parts[1]);
        } else {
          parts[1] = icalValues["date-time"].toICAL(parts[1]);
        }
      }
      return parts.join("/");
    },
    decorate: function(aValue, aProp) {
      return Period.fromJSON(aValue, aProp, !design.strict);
    },
    undecorate: function(aValue) {
      return aValue.toJSON();
    }
  },
  recur: {
    fromICAL: function(string) {
      return Recur._stringToData(string, true);
    },
    toICAL: function(data) {
      let str = "";
      for (let [k, val] of Object.entries(data)) {
        if (k == "until") {
          if (val.length > 10) {
            val = icalValues["date-time"].toICAL(val);
          } else {
            val = icalValues.date.toICAL(val);
          }
        } else if (k == "wkst") {
          if (typeof val === "number") {
            val = Recur.numericDayToIcalDay(val);
          }
        } else if (Array.isArray(val)) {
          val = val.join(",");
        }
        str += k.toUpperCase() + "=" + val + ";";
      }
      return str.slice(0, Math.max(0, str.length - 1));
    },
    decorate: function decorate(aValue) {
      return Recur.fromData(aValue);
    },
    undecorate: function(aRecur) {
      return aRecur.toJSON();
    }
  },
  time: {
    fromICAL: function(aValue) {
      if (aValue.length < 6) {
        return aValue;
      }
      let result = aValue.slice(0, 2) + ":" + aValue.slice(2, 4) + ":" + aValue.slice(4, 6);
      if (aValue[6] === "Z") {
        result += "Z";
      }
      return result;
    },
    toICAL: function(aValue) {
      if (aValue.length < 8) {
        return aValue;
      }
      let result = aValue.slice(0, 2) + aValue.slice(3, 5) + aValue.slice(6, 8);
      if (aValue[8] === "Z") {
        result += "Z";
      }
      return result;
    }
  }
});
var icalProperties = extend(commonProperties, {
  "action": DEFAULT_TYPE_TEXT,
  "attach": { defaultType: "uri" },
  "attendee": { defaultType: "cal-address" },
  "calscale": DEFAULT_TYPE_TEXT,
  "class": DEFAULT_TYPE_TEXT,
  "comment": DEFAULT_TYPE_TEXT,
  "completed": DEFAULT_TYPE_DATETIME,
  "contact": DEFAULT_TYPE_TEXT,
  "created": DEFAULT_TYPE_DATETIME,
  "description": DEFAULT_TYPE_TEXT,
  "dtend": DEFAULT_TYPE_DATETIME_DATE,
  "dtstamp": DEFAULT_TYPE_DATETIME,
  "dtstart": DEFAULT_TYPE_DATETIME_DATE,
  "due": DEFAULT_TYPE_DATETIME_DATE,
  "duration": { defaultType: "duration" },
  "exdate": {
    defaultType: "date-time",
    allowedTypes: ["date-time", "date"],
    multiValue: ","
  },
  "exrule": DEFAULT_TYPE_RECUR,
  "freebusy": { defaultType: "period", multiValue: "," },
  "geo": { defaultType: "float", structuredValue: ";" },
  "last-modified": DEFAULT_TYPE_DATETIME,
  "location": DEFAULT_TYPE_TEXT,
  "method": DEFAULT_TYPE_TEXT,
  "organizer": { defaultType: "cal-address" },
  "percent-complete": DEFAULT_TYPE_INTEGER,
  "priority": DEFAULT_TYPE_INTEGER,
  "prodid": DEFAULT_TYPE_TEXT,
  "related-to": DEFAULT_TYPE_TEXT,
  "repeat": DEFAULT_TYPE_INTEGER,
  "rdate": {
    defaultType: "date-time",
    allowedTypes: ["date-time", "date", "period"],
    multiValue: ",",
    detectType: function(string) {
      if (string.indexOf("/") !== -1) {
        return "period";
      }
      return string.indexOf("T") === -1 ? "date" : "date-time";
    }
  },
  "recurrence-id": DEFAULT_TYPE_DATETIME_DATE,
  "resources": DEFAULT_TYPE_TEXT_MULTI,
  "request-status": DEFAULT_TYPE_TEXT_STRUCTURED,
  "rrule": DEFAULT_TYPE_RECUR,
  "sequence": DEFAULT_TYPE_INTEGER,
  "status": DEFAULT_TYPE_TEXT,
  "summary": DEFAULT_TYPE_TEXT,
  "transp": DEFAULT_TYPE_TEXT,
  "trigger": { defaultType: "duration", allowedTypes: ["duration", "date-time"] },
  "tzoffsetfrom": DEFAULT_TYPE_UTCOFFSET,
  "tzoffsetto": DEFAULT_TYPE_UTCOFFSET,
  "tzurl": DEFAULT_TYPE_URI,
  "tzid": DEFAULT_TYPE_TEXT,
  "tzname": DEFAULT_TYPE_TEXT
});
var vcardValues = extend(commonValues, {
  text: createTextType(FROM_VCARD_NEWLINE, TO_VCARD_NEWLINE),
  uri: createTextType(FROM_VCARD_NEWLINE, TO_VCARD_NEWLINE),
  date: {
    decorate: function(aValue) {
      return VCardTime.fromDateAndOrTimeString(aValue, "date");
    },
    undecorate: function(aValue) {
      return aValue.toString();
    },
    fromICAL: function(aValue) {
      if (aValue.length == 8) {
        return icalValues.date.fromICAL(aValue);
      } else if (aValue[0] == "-" && aValue.length == 6) {
        return aValue.slice(0, 4) + "-" + aValue.slice(4);
      } else {
        return aValue;
      }
    },
    toICAL: function(aValue) {
      if (aValue.length == 10) {
        return icalValues.date.toICAL(aValue);
      } else if (aValue[0] == "-" && aValue.length == 7) {
        return aValue.slice(0, 4) + aValue.slice(5);
      } else {
        return aValue;
      }
    }
  },
  time: {
    decorate: function(aValue) {
      return VCardTime.fromDateAndOrTimeString("T" + aValue, "time");
    },
    undecorate: function(aValue) {
      return aValue.toString();
    },
    fromICAL: function(aValue) {
      let splitzone = vcardValues.time._splitZone(aValue, true);
      let zone = splitzone[0], value = splitzone[1];
      if (value.length == 6) {
        value = value.slice(0, 2) + ":" + value.slice(2, 4) + ":" + value.slice(4, 6);
      } else if (value.length == 4 && value[0] != "-") {
        value = value.slice(0, 2) + ":" + value.slice(2, 4);
      } else if (value.length == 5) {
        value = value.slice(0, 3) + ":" + value.slice(3, 5);
      }
      if (zone.length == 5 && (zone[0] == "-" || zone[0] == "+")) {
        zone = zone.slice(0, 3) + ":" + zone.slice(3);
      }
      return value + zone;
    },
    toICAL: function(aValue) {
      let splitzone = vcardValues.time._splitZone(aValue);
      let zone = splitzone[0], value = splitzone[1];
      if (value.length == 8) {
        value = value.slice(0, 2) + value.slice(3, 5) + value.slice(6, 8);
      } else if (value.length == 5 && value[0] != "-") {
        value = value.slice(0, 2) + value.slice(3, 5);
      } else if (value.length == 6) {
        value = value.slice(0, 3) + value.slice(4, 6);
      }
      if (zone.length == 6 && (zone[0] == "-" || zone[0] == "+")) {
        zone = zone.slice(0, 3) + zone.slice(4);
      }
      return value + zone;
    },
    _splitZone: function(aValue, isFromIcal) {
      let lastChar = aValue.length - 1;
      let signChar = aValue.length - (isFromIcal ? 5 : 6);
      let sign = aValue[signChar];
      let zone, value;
      if (aValue[lastChar] == "Z") {
        zone = aValue[lastChar];
        value = aValue.slice(0, Math.max(0, lastChar));
      } else if (aValue.length > 6 && (sign == "-" || sign == "+")) {
        zone = aValue.slice(signChar);
        value = aValue.slice(0, Math.max(0, signChar));
      } else {
        zone = "";
        value = aValue;
      }
      return [zone, value];
    }
  },
  "date-time": {
    decorate: function(aValue) {
      return VCardTime.fromDateAndOrTimeString(aValue, "date-time");
    },
    undecorate: function(aValue) {
      return aValue.toString();
    },
    fromICAL: function(aValue) {
      return vcardValues["date-and-or-time"].fromICAL(aValue);
    },
    toICAL: function(aValue) {
      return vcardValues["date-and-or-time"].toICAL(aValue);
    }
  },
  "date-and-or-time": {
    decorate: function(aValue) {
      return VCardTime.fromDateAndOrTimeString(aValue, "date-and-or-time");
    },
    undecorate: function(aValue) {
      return aValue.toString();
    },
    fromICAL: function(aValue) {
      let parts = aValue.split("T");
      return (parts[0] ? vcardValues.date.fromICAL(parts[0]) : "") + (parts[1] ? "T" + vcardValues.time.fromICAL(parts[1]) : "");
    },
    toICAL: function(aValue) {
      let parts = aValue.split("T");
      return vcardValues.date.toICAL(parts[0]) + (parts[1] ? "T" + vcardValues.time.toICAL(parts[1]) : "");
    }
  },
  timestamp: icalValues["date-time"],
  "language-tag": {
    matches: /^[a-zA-Z0-9-]+$/
    // Could go with a more strict regex here
  },
  "phone-number": {
    fromICAL: function(aValue) {
      return Array.from(aValue).filter(function(c) {
        return c === "\\" ? void 0 : c;
      }).join("");
    },
    toICAL: function(aValue) {
      return Array.from(aValue).map(function(c) {
        return c === "," || c === ";" ? "\\" + c : c;
      }).join("");
    }
  }
});
var vcardParams = {
  "type": {
    valueType: "text",
    multiValue: ","
  },
  "value": {
    // since the value here is a 'type' lowercase is used.
    values: [
      "text",
      "uri",
      "date",
      "time",
      "date-time",
      "date-and-or-time",
      "timestamp",
      "boolean",
      "integer",
      "float",
      "utc-offset",
      "language-tag"
    ],
    allowXName: true,
    allowIanaToken: true
  }
};
var vcardProperties = extend(commonProperties, {
  "adr": { defaultType: "text", structuredValue: ";", multiValue: "," },
  "anniversary": DEFAULT_TYPE_DATE_ANDOR_TIME,
  "bday": DEFAULT_TYPE_DATE_ANDOR_TIME,
  "caladruri": DEFAULT_TYPE_URI,
  "caluri": DEFAULT_TYPE_URI,
  "clientpidmap": DEFAULT_TYPE_TEXT_STRUCTURED,
  "email": DEFAULT_TYPE_TEXT,
  "fburl": DEFAULT_TYPE_URI,
  "fn": DEFAULT_TYPE_TEXT,
  "gender": DEFAULT_TYPE_TEXT_STRUCTURED,
  "geo": DEFAULT_TYPE_URI,
  "impp": DEFAULT_TYPE_URI,
  "key": DEFAULT_TYPE_URI,
  "kind": DEFAULT_TYPE_TEXT,
  "lang": { defaultType: "language-tag" },
  "logo": DEFAULT_TYPE_URI,
  "member": DEFAULT_TYPE_URI,
  "n": { defaultType: "text", structuredValue: ";", multiValue: "," },
  "nickname": DEFAULT_TYPE_TEXT_MULTI,
  "note": DEFAULT_TYPE_TEXT,
  "org": { defaultType: "text", structuredValue: ";" },
  "photo": DEFAULT_TYPE_URI,
  "related": DEFAULT_TYPE_URI,
  "rev": { defaultType: "timestamp" },
  "role": DEFAULT_TYPE_TEXT,
  "sound": DEFAULT_TYPE_URI,
  "source": DEFAULT_TYPE_URI,
  "tel": { defaultType: "uri", allowedTypes: ["uri", "text"] },
  "title": DEFAULT_TYPE_TEXT,
  "tz": { defaultType: "text", allowedTypes: ["text", "utc-offset", "uri"] },
  "xml": DEFAULT_TYPE_TEXT
});
var vcard3Values = extend(commonValues, {
  binary: icalValues.binary,
  date: vcardValues.date,
  "date-time": vcardValues["date-time"],
  "phone-number": vcardValues["phone-number"],
  uri: icalValues.uri,
  text: vcardValues.text,
  time: icalValues.time,
  vcard: icalValues.text,
  "utc-offset": {
    toICAL: function(aValue) {
      return aValue.slice(0, 7);
    },
    fromICAL: function(aValue) {
      return aValue.slice(0, 7);
    },
    decorate: function(aValue) {
      return UtcOffset.fromString(aValue);
    },
    undecorate: function(aValue) {
      return aValue.toString();
    }
  }
});
var vcard3Params = {
  "type": {
    valueType: "text",
    multiValue: ","
  },
  "value": {
    // since the value here is a 'type' lowercase is used.
    values: [
      "text",
      "uri",
      "date",
      "date-time",
      "phone-number",
      "time",
      "boolean",
      "integer",
      "float",
      "utc-offset",
      "vcard",
      "binary"
    ],
    allowXName: true,
    allowIanaToken: true
  }
};
var vcard3Properties = extend(commonProperties, {
  fn: DEFAULT_TYPE_TEXT,
  n: { defaultType: "text", structuredValue: ";", multiValue: "," },
  nickname: DEFAULT_TYPE_TEXT_MULTI,
  photo: { defaultType: "binary", allowedTypes: ["binary", "uri"] },
  bday: {
    defaultType: "date-time",
    allowedTypes: ["date-time", "date"],
    detectType: function(string) {
      return string.indexOf("T") === -1 ? "date" : "date-time";
    }
  },
  adr: { defaultType: "text", structuredValue: ";", multiValue: "," },
  label: DEFAULT_TYPE_TEXT,
  tel: { defaultType: "phone-number" },
  email: DEFAULT_TYPE_TEXT,
  mailer: DEFAULT_TYPE_TEXT,
  tz: { defaultType: "utc-offset", allowedTypes: ["utc-offset", "text"] },
  geo: { defaultType: "float", structuredValue: ";" },
  title: DEFAULT_TYPE_TEXT,
  role: DEFAULT_TYPE_TEXT,
  logo: { defaultType: "binary", allowedTypes: ["binary", "uri"] },
  agent: { defaultType: "vcard", allowedTypes: ["vcard", "text", "uri"] },
  org: DEFAULT_TYPE_TEXT_STRUCTURED,
  note: DEFAULT_TYPE_TEXT_MULTI,
  prodid: DEFAULT_TYPE_TEXT,
  rev: {
    defaultType: "date-time",
    allowedTypes: ["date-time", "date"],
    detectType: function(string) {
      return string.indexOf("T") === -1 ? "date" : "date-time";
    }
  },
  "sort-string": DEFAULT_TYPE_TEXT,
  sound: { defaultType: "binary", allowedTypes: ["binary", "uri"] },
  class: DEFAULT_TYPE_TEXT,
  key: { defaultType: "binary", allowedTypes: ["binary", "text"] }
});
var icalSet = {
  name: "ical",
  value: icalValues,
  param: icalParams,
  property: icalProperties,
  propertyGroups: false
};
var vcardSet = {
  name: "vcard4",
  value: vcardValues,
  param: vcardParams,
  property: vcardProperties,
  propertyGroups: true
};
var vcard3Set = {
  name: "vcard3",
  value: vcard3Values,
  param: vcard3Params,
  property: vcard3Properties,
  propertyGroups: true
};
var design = {
  /**
   * Can be set to false to make the parser more lenient.
   */
  strict: true,
  /**
   * The default set for new properties and components if none is specified.
   * @type {designSet}
   */
  defaultSet: icalSet,
  /**
   * The default type for unknown properties
   * @type {String}
   */
  defaultType: "unknown",
  /**
   * Holds the design set for known top-level components
   *
   * @type {Object}
   * @property {designSet} vcard       vCard VCARD
   * @property {designSet} vevent      iCalendar VEVENT
   * @property {designSet} vtodo       iCalendar VTODO
   * @property {designSet} vjournal    iCalendar VJOURNAL
   * @property {designSet} valarm      iCalendar VALARM
   * @property {designSet} vtimezone   iCalendar VTIMEZONE
   * @property {designSet} daylight    iCalendar DAYLIGHT
   * @property {designSet} standard    iCalendar STANDARD
   *
   * @example
   * let propertyName = 'fn';
   * let componentDesign = ICAL.design.components.vcard;
   * let propertyDetails = componentDesign.property[propertyName];
   * if (propertyDetails.defaultType == 'text') {
   *   // Yep, sure is...
   * }
   */
  components: {
    vcard: vcardSet,
    vcard3: vcard3Set,
    vevent: icalSet,
    vtodo: icalSet,
    vjournal: icalSet,
    valarm: icalSet,
    vtimezone: icalSet,
    daylight: icalSet,
    standard: icalSet
  },
  /**
   * The design set for iCalendar (rfc5545/rfc7265) components.
   * @type {designSet}
   */
  icalendar: icalSet,
  /**
   * The design set for vCard (rfc6350/rfc7095) components.
   * @type {designSet}
   */
  vcard: vcardSet,
  /**
   * The design set for vCard (rfc2425/rfc2426/rfc7095) components.
   * @type {designSet}
   */
  vcard3: vcard3Set,
  /**
   * Gets the design set for the given component name.
   *
   * @param {String} componentName        The name of the component
   * @return {designSet}      The design set for the component
   */
  getDesignSet: function(componentName) {
    let isInDesign = componentName && componentName in design.components;
    return isInDesign ? design.components[componentName] : design.defaultSet;
  }
};
var LINE_ENDING = "\r\n";
var DEFAULT_VALUE_TYPE = "unknown";
var RFC6868_REPLACE_MAP = { '"': "^'", "\n": "^n", "^": "^^" };
function stringify(jCal) {
  if (typeof jCal[0] == "string") {
    jCal = [jCal];
  }
  let i = 0;
  let len = jCal.length;
  let result = "";
  for (; i < len; i++) {
    result += stringify.component(jCal[i]) + LINE_ENDING;
  }
  return result;
}
stringify.component = function(component, designSet) {
  let name = component[0].toUpperCase();
  let result = "BEGIN:" + name + LINE_ENDING;
  let props = component[1];
  let propIdx = 0;
  let propLen = props.length;
  let designSetName = component[0];
  if (designSetName === "vcard" && component[1].length > 0 && !(component[1][0][0] === "version" && component[1][0][3] === "4.0")) {
    designSetName = "vcard3";
  }
  designSet = designSet || design.getDesignSet(designSetName);
  for (; propIdx < propLen; propIdx++) {
    result += stringify.property(props[propIdx], designSet) + LINE_ENDING;
  }
  let comps = component[2] || [];
  let compIdx = 0;
  let compLen = comps.length;
  for (; compIdx < compLen; compIdx++) {
    result += stringify.component(comps[compIdx], designSet) + LINE_ENDING;
  }
  result += "END:" + name;
  return result;
};
stringify.property = function(property, designSet, noFold) {
  let name = property[0].toUpperCase();
  let jsName = property[0];
  let params = property[1];
  if (!designSet) {
    designSet = design.defaultSet;
  }
  let groupName = params.group;
  let line;
  if (designSet.propertyGroups && groupName) {
    line = groupName.toUpperCase() + "." + name;
  } else {
    line = name;
  }
  for (let [paramName, value] of Object.entries(params)) {
    if (designSet.propertyGroups && paramName == "group") {
      continue;
    }
    let paramDesign = designSet.param[paramName];
    let multiValue2 = paramDesign && paramDesign.multiValue;
    if (multiValue2 && Array.isArray(value)) {
      value = value.map(function(val) {
        val = stringify._rfc6868Unescape(val);
        val = stringify.paramPropertyValue(val, paramDesign.multiValueSeparateDQuote);
        return val;
      });
      value = stringify.multiValue(value, multiValue2, "unknown", null, designSet);
    } else {
      value = stringify._rfc6868Unescape(value);
      value = stringify.paramPropertyValue(value);
    }
    line += ";" + paramName.toUpperCase() + "=" + value;
  }
  if (property.length === 3) {
    return line + ":";
  }
  let valueType = property[2];
  let propDetails;
  let multiValue = false;
  let structuredValue = false;
  let isDefault = false;
  if (jsName in designSet.property) {
    propDetails = designSet.property[jsName];
    if ("multiValue" in propDetails) {
      multiValue = propDetails.multiValue;
    }
    if ("structuredValue" in propDetails && Array.isArray(property[3])) {
      structuredValue = propDetails.structuredValue;
    }
    if ("defaultType" in propDetails) {
      if (valueType === propDetails.defaultType) {
        isDefault = true;
      }
    } else {
      if (valueType === DEFAULT_VALUE_TYPE) {
        isDefault = true;
      }
    }
  } else {
    if (valueType === DEFAULT_VALUE_TYPE) {
      isDefault = true;
    }
  }
  if (!isDefault) {
    line += ";VALUE=" + valueType.toUpperCase();
  }
  line += ":";
  if (multiValue && structuredValue) {
    line += stringify.multiValue(
      property[3],
      structuredValue,
      valueType,
      multiValue,
      designSet,
      structuredValue
    );
  } else if (multiValue) {
    line += stringify.multiValue(
      property.slice(3),
      multiValue,
      valueType,
      null,
      designSet,
      false
    );
  } else if (structuredValue) {
    line += stringify.multiValue(
      property[3],
      structuredValue,
      valueType,
      null,
      designSet,
      structuredValue
    );
  } else {
    line += stringify.value(property[3], valueType, designSet, false);
  }
  return noFold ? line : foldline(line);
};
stringify.paramPropertyValue = function(value, force) {
  if (!force && value.indexOf(",") === -1 && value.indexOf(":") === -1 && value.indexOf(";") === -1) {
    return value;
  }
  return '"' + value + '"';
};
stringify.multiValue = function(values, delim, type, innerMulti, designSet, structuredValue) {
  let result = "";
  let len = values.length;
  let i = 0;
  for (; i < len; i++) {
    if (innerMulti && Array.isArray(values[i])) {
      result += stringify.multiValue(values[i], innerMulti, type, null, designSet, structuredValue);
    } else {
      result += stringify.value(values[i], type, designSet, structuredValue);
    }
    if (i !== len - 1) {
      result += delim;
    }
  }
  return result;
};
stringify.value = function(value, type, designSet, structuredValue) {
  if (type in designSet.value && "toICAL" in designSet.value[type]) {
    return designSet.value[type].toICAL(value, structuredValue);
  }
  return value;
};
stringify._rfc6868Unescape = function(val) {
  return val.replace(/[\n^"]/g, function(x) {
    return RFC6868_REPLACE_MAP[x];
  });
};
var NAME_INDEX$1 = 0;
var PROP_INDEX = 1;
var TYPE_INDEX = 2;
var VALUE_INDEX = 3;
var Property = class _Property {
  /**
   * Create an {@link ICAL.Property} by parsing the passed iCalendar string.
   *
   * @param {String} str            The iCalendar string to parse
   * @param {designSet=} designSet  The design data to use for this property
   * @return {Property}             The created iCalendar property
   */
  static fromString(str, designSet) {
    return new _Property(parse.property(str, designSet));
  }
  /**
   * Creates a new ICAL.Property instance.
   *
   * It is important to note that mutations done in the wrapper directly mutate the jCal object used
   * to initialize.
   *
   * Can also be used to create new properties by passing the name of the property (as a String).
   *
   * @param {Array|String} jCal         Raw jCal representation OR the new name of the property
   * @param {Component=} parent         Parent component
   */
  constructor(jCal, parent) {
    this._parent = parent || null;
    if (typeof jCal === "string") {
      this.jCal = [jCal, {}, design.defaultType];
      this.jCal[TYPE_INDEX] = this.getDefaultType();
    } else {
      this.jCal = jCal;
    }
    this._updateType();
  }
  /**
   * The value type for this property
   * @type {String}
   */
  get type() {
    return this.jCal[TYPE_INDEX];
  }
  /**
   * The name of this property, in lowercase.
   * @type {String}
   */
  get name() {
    return this.jCal[NAME_INDEX$1];
  }
  /**
   * The parent component for this property.
   * @type {Component}
   */
  get parent() {
    return this._parent;
  }
  set parent(p) {
    let designSetChanged = !this._parent || p && p._designSet != this._parent._designSet;
    this._parent = p;
    if (this.type == design.defaultType && designSetChanged) {
      this.jCal[TYPE_INDEX] = this.getDefaultType();
      this._updateType();
    }
  }
  /**
   * The design set for this property, e.g. icalendar vs vcard
   *
   * @type {designSet}
   * @private
   */
  get _designSet() {
    return this.parent ? this.parent._designSet : design.defaultSet;
  }
  /**
   * Updates the type metadata from the current jCal type and design set.
   *
   * @private
   */
  _updateType() {
    let designSet = this._designSet;
    if (this.type in designSet.value) {
      if ("decorate" in designSet.value[this.type]) {
        this.isDecorated = true;
      } else {
        this.isDecorated = false;
      }
      if (this.name in designSet.property) {
        this.isMultiValue = "multiValue" in designSet.property[this.name];
        this.isStructuredValue = "structuredValue" in designSet.property[this.name];
      }
    }
  }
  /**
   * Hydrate a single value. The act of hydrating means turning the raw jCal
   * value into a potentially wrapped object, for example {@link ICAL.Time}.
   *
   * @private
   * @param {Number} index        The index of the value to hydrate
   * @return {?Object}             The decorated value.
   */
  _hydrateValue(index) {
    if (this._values && this._values[index]) {
      return this._values[index];
    }
    if (this.jCal.length <= VALUE_INDEX + index) {
      return null;
    }
    if (this.isDecorated) {
      if (!this._values) {
        this._values = [];
      }
      return this._values[index] = this._decorate(
        this.jCal[VALUE_INDEX + index]
      );
    } else {
      return this.jCal[VALUE_INDEX + index];
    }
  }
  /**
   * Decorate a single value, returning its wrapped object. This is used by
   * the hydrate function to actually wrap the value.
   *
   * @private
   * @param {?} value         The value to decorate
   * @return {Object}         The decorated value
   */
  _decorate(value) {
    return this._designSet.value[this.type].decorate(value, this);
  }
  /**
   * Undecorate a single value, returning its raw jCal data.
   *
   * @private
   * @param {Object} value         The value to undecorate
   * @return {?}                   The undecorated value
   */
  _undecorate(value) {
    return this._designSet.value[this.type].undecorate(value, this);
  }
  /**
   * Sets the value at the given index while also hydrating it. The passed
   * value can either be a decorated or undecorated value.
   *
   * @private
   * @param {?} value             The value to set
   * @param {Number} index        The index to set it at
   */
  _setDecoratedValue(value, index) {
    if (!this._values) {
      this._values = [];
    }
    if (typeof value === "object" && "icaltype" in value) {
      this.jCal[VALUE_INDEX + index] = this._undecorate(value);
      this._values[index] = value;
    } else {
      this.jCal[VALUE_INDEX + index] = value;
      this._values[index] = this._decorate(value);
    }
  }
  /**
   * Gets a parameter on the property.
   *
   * @param {String}        name   Parameter name (lowercase)
   * @return {Array|String}        Parameter value
   */
  getParameter(name) {
    if (name in this.jCal[PROP_INDEX]) {
      return this.jCal[PROP_INDEX][name];
    } else {
      return void 0;
    }
  }
  /**
   * Gets first parameter on the property.
   *
   * @param {String}        name   Parameter name (lowercase)
   * @return {String}        Parameter value
   */
  getFirstParameter(name) {
    let parameters = this.getParameter(name);
    if (Array.isArray(parameters)) {
      return parameters[0];
    }
    return parameters;
  }
  /**
   * Sets a parameter on the property.
   *
   * @param {String}       name     The parameter name
   * @param {Array|String} value    The parameter value
   */
  setParameter(name, value) {
    let lcname = name.toLowerCase();
    if (typeof value === "string" && lcname in this._designSet.param && "multiValue" in this._designSet.param[lcname]) {
      value = [value];
    }
    this.jCal[PROP_INDEX][name] = value;
  }
  /**
   * Removes a parameter
   *
   * @param {String} name     The parameter name
   */
  removeParameter(name) {
    delete this.jCal[PROP_INDEX][name];
  }
  /**
   * Get the default type based on this property's name.
   *
   * @return {String}     The default type for this property
   */
  getDefaultType() {
    let name = this.jCal[NAME_INDEX$1];
    let designSet = this._designSet;
    if (name in designSet.property) {
      let details = designSet.property[name];
      if ("defaultType" in details) {
        return details.defaultType;
      }
    }
    return design.defaultType;
  }
  /**
   * Sets type of property and clears out any existing values of the current
   * type.
   *
   * @param {String} type     New iCAL type (see design.*.values)
   */
  resetType(type) {
    this.removeAllValues();
    this.jCal[TYPE_INDEX] = type;
    this._updateType();
  }
  /**
   * Finds the first property value.
   *
   * @return {Binary | Duration | Period |
   * Recur | Time | UtcOffset | Geo | string | null}         First property value
   */
  getFirstValue() {
    return this._hydrateValue(0);
  }
  /**
   * Gets all values on the property.
   *
   * NOTE: this creates an array during each call.
   *
   * @return {Array}          List of values
   */
  getValues() {
    let len = this.jCal.length - VALUE_INDEX;
    if (len < 1) {
      return [];
    }
    let i = 0;
    let result = [];
    for (; i < len; i++) {
      result[i] = this._hydrateValue(i);
    }
    return result;
  }
  /**
   * Removes all values from this property
   */
  removeAllValues() {
    if (this._values) {
      this._values.length = 0;
    }
    this.jCal.length = 3;
  }
  /**
   * Sets the values of the property.  Will overwrite the existing values.
   * This can only be used for multi-value properties.
   *
   * @param {Array} values    An array of values
   */
  setValues(values) {
    if (!this.isMultiValue) {
      throw new Error(
        this.name + ": does not not support mulitValue.\noverride isMultiValue"
      );
    }
    let len = values.length;
    let i = 0;
    this.removeAllValues();
    if (len > 0 && typeof values[0] === "object" && "icaltype" in values[0]) {
      this.resetType(values[0].icaltype);
    }
    if (this.isDecorated) {
      for (; i < len; i++) {
        this._setDecoratedValue(values[i], i);
      }
    } else {
      for (; i < len; i++) {
        this.jCal[VALUE_INDEX + i] = values[i];
      }
    }
  }
  /**
   * Sets the current value of the property. If this is a multi-value
   * property, all other values will be removed.
   *
   * @param {String|Object} value     New property value.
   */
  setValue(value) {
    this.removeAllValues();
    if (typeof value === "object" && "icaltype" in value) {
      this.resetType(value.icaltype);
    }
    if (this.isDecorated) {
      this._setDecoratedValue(value, 0);
    } else {
      this.jCal[VALUE_INDEX] = value;
    }
  }
  /**
   * Returns the Object representation of this component. The returned object
   * is a live jCal object and should be cloned if modified.
   * @return {Object}
   */
  toJSON() {
    return this.jCal;
  }
  /**
   * The string representation of this component.
   * @return {String}
   */
  toICALString() {
    return stringify.property(
      this.jCal,
      this._designSet,
      true
    );
  }
};
var NAME_INDEX = 0;
var PROPERTY_INDEX = 1;
var COMPONENT_INDEX = 2;
var PROPERTY_NAME_INDEX = 0;
var PROPERTY_VALUE_INDEX = 3;
var Component = class _Component {
  /**
   * Creates a new Component instance.
   *
   * @param {Array|String} jCal         Raw jCal component data OR name of new
   *                                      component
   * @param {Component=} parent     Parent component to associate
   */
  constructor(jCal, parent) {
    /**
     * Hydrated properties are inserted into the _properties array at the same
     * position as in the jCal array, so it is possible that the array contains
     * undefined values for unhydrdated properties. To avoid iterating the
     * array when checking if all properties have been hydrated, we save the
     * count here.
     *
     * @type {Number}
     * @private
     */
    __publicField(this, "_hydratedPropertyCount", 0);
    /**
     * The same count as for _hydratedPropertyCount, but for subcomponents
     *
     * @type {Number}
     * @private
     */
    __publicField(this, "_hydratedComponentCount", 0);
    /**
     * A cache of hydrated time zone objects which may be used by consumers, keyed
     * by time zone ID.
     *
     * @type {Map}
     * @private
     */
    __publicField(this, "_timezoneCache", null);
    /**
     * @private
     */
    __publicField(this, "_components", null);
    /**
     * @private
     */
    __publicField(this, "_properties", null);
    if (typeof jCal === "string") {
      jCal = [jCal, [], []];
    }
    this.jCal = jCal;
    this.parent = parent || null;
    if (!this.parent && this.name === "vcalendar") {
      this._timezoneCache = /* @__PURE__ */ new Map();
    }
  }
  /**
   * Create an {@link ICAL.Component} by parsing the passed iCalendar string.
   *
   * @param {String} str        The iCalendar string to parse
   */
  static fromString(str) {
    return new _Component(parse.component(str));
  }
  /**
   * The name of this component
   *
   * @type {String}
   */
  get name() {
    return this.jCal[NAME_INDEX];
  }
  /**
   * The design set for this component, e.g. icalendar vs vcard
   *
   * @type {designSet}
   * @private
   */
  get _designSet() {
    let parentDesign = this.parent && this.parent._designSet;
    if (!parentDesign && this.name == "vcard") {
      let versionProp = this.jCal[PROPERTY_INDEX]?.[0];
      if (versionProp && versionProp[PROPERTY_NAME_INDEX] == "version" && versionProp[PROPERTY_VALUE_INDEX] == "3.0") {
        return design.getDesignSet("vcard3");
      }
    }
    return parentDesign || design.getDesignSet(this.name);
  }
  /**
   * @private
   */
  _hydrateComponent(index) {
    if (!this._components) {
      this._components = [];
      this._hydratedComponentCount = 0;
    }
    if (this._components[index]) {
      return this._components[index];
    }
    let comp = new _Component(
      this.jCal[COMPONENT_INDEX][index],
      this
    );
    this._hydratedComponentCount++;
    return this._components[index] = comp;
  }
  /**
   * @private
   */
  _hydrateProperty(index) {
    if (!this._properties) {
      this._properties = [];
      this._hydratedPropertyCount = 0;
    }
    if (this._properties[index]) {
      return this._properties[index];
    }
    let prop = new Property(
      this.jCal[PROPERTY_INDEX][index],
      this
    );
    this._hydratedPropertyCount++;
    return this._properties[index] = prop;
  }
  /**
   * Finds first sub component, optionally filtered by name.
   *
   * @param {String=} name        Optional name to filter by
   * @return {?Component}     The found subcomponent
   */
  getFirstSubcomponent(name) {
    if (name) {
      let i = 0;
      let comps = this.jCal[COMPONENT_INDEX];
      let len = comps.length;
      for (; i < len; i++) {
        if (comps[i][NAME_INDEX] === name) {
          let result = this._hydrateComponent(i);
          return result;
        }
      }
    } else {
      if (this.jCal[COMPONENT_INDEX].length) {
        return this._hydrateComponent(0);
      }
    }
    return null;
  }
  /**
   * Finds all sub components, optionally filtering by name.
   *
   * @param {String=} name            Optional name to filter by
   * @return {Component[]}       The found sub components
   */
  getAllSubcomponents(name) {
    let jCalLen = this.jCal[COMPONENT_INDEX].length;
    let i = 0;
    if (name) {
      let comps = this.jCal[COMPONENT_INDEX];
      let result = [];
      for (; i < jCalLen; i++) {
        if (name === comps[i][NAME_INDEX]) {
          result.push(
            this._hydrateComponent(i)
          );
        }
      }
      return result;
    } else {
      if (!this._components || this._hydratedComponentCount !== jCalLen) {
        for (; i < jCalLen; i++) {
          this._hydrateComponent(i);
        }
      }
      return this._components || [];
    }
  }
  /**
   * Returns true when a named property exists.
   *
   * @param {String} name     The property name
   * @return {Boolean}        True, when property is found
   */
  hasProperty(name) {
    let props = this.jCal[PROPERTY_INDEX];
    let len = props.length;
    let i = 0;
    for (; i < len; i++) {
      if (props[i][NAME_INDEX] === name) {
        return true;
      }
    }
    return false;
  }
  /**
   * Finds the first property, optionally with the given name.
   *
   * @param {String=} name        Lowercase property name
   * @return {?Property}     The found property
   */
  getFirstProperty(name) {
    if (name) {
      let i = 0;
      let props = this.jCal[PROPERTY_INDEX];
      let len = props.length;
      for (; i < len; i++) {
        if (props[i][NAME_INDEX] === name) {
          let result = this._hydrateProperty(i);
          return result;
        }
      }
    } else {
      if (this.jCal[PROPERTY_INDEX].length) {
        return this._hydrateProperty(0);
      }
    }
    return null;
  }
  /**
   * Returns first property's value, if available.
   *
   * @param {String=} name                    Lowercase property name
   * @return {Binary | Duration | Period |
   * Recur | Time | UtcOffset | Geo | string | null}         The found property value.
   */
  getFirstPropertyValue(name) {
    let prop = this.getFirstProperty(name);
    if (prop) {
      return prop.getFirstValue();
    }
    return null;
  }
  /**
   * Get all properties in the component, optionally filtered by name.
   *
   * @param {String=} name        Lowercase property name
   * @return {Property[]}    List of properties
   */
  getAllProperties(name) {
    let jCalLen = this.jCal[PROPERTY_INDEX].length;
    let i = 0;
    if (name) {
      let props = this.jCal[PROPERTY_INDEX];
      let result = [];
      for (; i < jCalLen; i++) {
        if (name === props[i][NAME_INDEX]) {
          result.push(
            this._hydrateProperty(i)
          );
        }
      }
      return result;
    } else {
      if (!this._properties || this._hydratedPropertyCount !== jCalLen) {
        for (; i < jCalLen; i++) {
          this._hydrateProperty(i);
        }
      }
      return this._properties || [];
    }
  }
  /**
   * @private
   */
  _removeObjectByIndex(jCalIndex, cache, index) {
    cache = cache || [];
    if (cache[index]) {
      let obj = cache[index];
      if ("parent" in obj) {
        obj.parent = null;
      }
    }
    cache.splice(index, 1);
    this.jCal[jCalIndex].splice(index, 1);
  }
  /**
   * @private
   */
  _removeObject(jCalIndex, cache, nameOrObject) {
    let i = 0;
    let objects = this.jCal[jCalIndex];
    let len = objects.length;
    let cached = this[cache];
    if (typeof nameOrObject === "string") {
      for (; i < len; i++) {
        if (objects[i][NAME_INDEX] === nameOrObject) {
          this._removeObjectByIndex(jCalIndex, cached, i);
          return true;
        }
      }
    } else if (cached) {
      for (; i < len; i++) {
        if (cached[i] && cached[i] === nameOrObject) {
          this._removeObjectByIndex(jCalIndex, cached, i);
          return true;
        }
      }
    }
    return false;
  }
  /**
   * @private
   */
  _removeAllObjects(jCalIndex, cache, name) {
    let cached = this[cache];
    let objects = this.jCal[jCalIndex];
    let i = objects.length - 1;
    for (; i >= 0; i--) {
      if (!name || objects[i][NAME_INDEX] === name) {
        this._removeObjectByIndex(jCalIndex, cached, i);
      }
    }
  }
  /**
   * Adds a single sub component.
   *
   * @param {Component} component        The component to add
   * @return {Component}                 The passed in component
   */
  addSubcomponent(component) {
    if (!this._components) {
      this._components = [];
      this._hydratedComponentCount = 0;
    }
    if (component.parent) {
      component.parent.removeSubcomponent(component);
    }
    let idx = this.jCal[COMPONENT_INDEX].push(component.jCal);
    this._components[idx - 1] = component;
    this._hydratedComponentCount++;
    component.parent = this;
    return component;
  }
  /**
   * Removes a single component by name or the instance of a specific
   * component.
   *
   * @param {Component|String} nameOrComp    Name of component, or component
   * @return {Boolean}                            True when comp is removed
   */
  removeSubcomponent(nameOrComp) {
    let removed = this._removeObject(COMPONENT_INDEX, "_components", nameOrComp);
    if (removed) {
      this._hydratedComponentCount--;
    }
    return removed;
  }
  /**
   * Removes all components or (if given) all components by a particular
   * name.
   *
   * @param {String=} name            Lowercase component name
   */
  removeAllSubcomponents(name) {
    let removed = this._removeAllObjects(COMPONENT_INDEX, "_components", name);
    this._hydratedComponentCount = 0;
    return removed;
  }
  /**
   * Adds an {@link ICAL.Property} to the component.
   *
   * @param {Property} property      The property to add
   * @return {Property}              The passed in property
   */
  addProperty(property) {
    if (!(property instanceof Property)) {
      throw new TypeError("must be instance of ICAL.Property");
    }
    if (!this._properties) {
      this._properties = [];
      this._hydratedPropertyCount = 0;
    }
    if (property.parent) {
      property.parent.removeProperty(property);
    }
    let idx = this.jCal[PROPERTY_INDEX].push(property.jCal);
    this._properties[idx - 1] = property;
    this._hydratedPropertyCount++;
    property.parent = this;
    return property;
  }
  /**
   * Helper method to add a property with a value to the component.
   *
   * @param {String}               name         Property name to add
   * @param {String|Number|Object} value        Property value
   * @return {Property}                    The created property
   */
  addPropertyWithValue(name, value) {
    let prop = new Property(name);
    prop.setValue(value);
    this.addProperty(prop);
    return prop;
  }
  /**
   * Helper method that will update or create a property of the given name
   * and sets its value. If multiple properties with the given name exist,
   * only the first is updated.
   *
   * @param {String}               name         Property name to update
   * @param {String|Number|Object} value        Property value
   * @return {Property}                    The created property
   */
  updatePropertyWithValue(name, value) {
    let prop = this.getFirstProperty(name);
    if (prop) {
      prop.setValue(value);
    } else {
      prop = this.addPropertyWithValue(name, value);
    }
    return prop;
  }
  /**
   * Removes a single property by name or the instance of the specific
   * property.
   *
   * @param {String|Property} nameOrProp     Property name or instance to remove
   * @return {Boolean}                            True, when deleted
   */
  removeProperty(nameOrProp) {
    let removed = this._removeObject(PROPERTY_INDEX, "_properties", nameOrProp);
    if (removed) {
      this._hydratedPropertyCount--;
    }
    return removed;
  }
  /**
   * Removes all properties associated with this component, optionally
   * filtered by name.
   *
   * @param {String=} name        Lowercase property name
   * @return {Boolean}            True, when deleted
   */
  removeAllProperties(name) {
    let removed = this._removeAllObjects(PROPERTY_INDEX, "_properties", name);
    this._hydratedPropertyCount = 0;
    return removed;
  }
  /**
   * Returns the Object representation of this component. The returned object
   * is a live jCal object and should be cloned if modified.
   * @return {Object}
   */
  toJSON() {
    return this.jCal;
  }
  /**
   * The string representation of this component.
   * @return {String}
   */
  toString() {
    return stringify.component(
      this.jCal,
      this._designSet
    );
  }
  /**
   * Retrieve a time zone definition from the component tree, if any is present.
   * If the tree contains no time zone definitions or the TZID cannot be
   * matched, returns null.
   *
   * @param {String} tzid     The ID of the time zone to retrieve
   * @return {Timezone}  The time zone corresponding to the ID, or null
   */
  getTimeZoneByID(tzid) {
    if (this.parent) {
      return this.parent.getTimeZoneByID(tzid);
    }
    if (!this._timezoneCache) {
      return null;
    }
    if (this._timezoneCache.has(tzid)) {
      return this._timezoneCache.get(tzid);
    }
    const zones2 = this.getAllSubcomponents("vtimezone");
    for (const zone of zones2) {
      if (zone.getFirstProperty("tzid").getFirstValue() === tzid) {
        const hydratedZone = new Timezone({
          component: zone,
          tzid
        });
        this._timezoneCache.set(tzid, hydratedZone);
        return hydratedZone;
      }
    }
    return null;
  }
};
var RecurExpansion = class {
  /**
   * Creates a new ICAL.RecurExpansion instance.
   *
   * The options object can be filled with the specified initial values. It can also contain
   * additional members, as a result of serializing a previous expansion state, as shown in the
   * example.
   *
   * @param {Object} options
   *        Recurrence expansion options
   * @param {Time} options.dtstart
   *        Start time of the event
   * @param {Component=} options.component
   *        Component for expansion, required if not resuming.
   */
  constructor(options) {
    /**
     * True when iteration is fully completed.
     * @type {Boolean}
     */
    __publicField(this, "complete", false);
    /**
     * Array of rrule iterators.
     *
     * @type {RecurIterator[]}
     * @private
     */
    __publicField(this, "ruleIterators", null);
    /**
     * Array of rdate instances.
     *
     * @type {Time[]}
     * @private
     */
    __publicField(this, "ruleDates", null);
    /**
     * Array of exdate instances.
     *
     * @type {Time[]}
     * @private
     */
    __publicField(this, "exDates", null);
    /**
     * Current position in ruleDates array.
     * @type {Number}
     * @private
     */
    __publicField(this, "ruleDateInc", 0);
    /**
     * Current position in exDates array
     * @type {Number}
     * @private
     */
    __publicField(this, "exDateInc", 0);
    /**
     * Current negative date.
     *
     * @type {Time}
     * @private
     */
    __publicField(this, "exDate", null);
    /**
     * Current additional date.
     *
     * @type {Time}
     * @private
     */
    __publicField(this, "ruleDate", null);
    /**
     * Start date of recurring rules.
     *
     * @type {Time}
     */
    __publicField(this, "dtstart", null);
    /**
     * Last expanded time
     *
     * @type {Time}
     */
    __publicField(this, "last", null);
    this.ruleDates = [];
    this.exDates = [];
    this.fromData(options);
  }
  /**
   * Initialize the recurrence expansion from the data object. The options
   * object may also contain additional members, see the
   * {@link ICAL.RecurExpansion constructor} for more details.
   *
   * @param {Object} options
   *        Recurrence expansion options
   * @param {Time} options.dtstart
   *        Start time of the event
   * @param {Component=} options.component
   *        Component for expansion, required if not resuming.
   */
  fromData(options) {
    let start = formatClassType(options.dtstart, Time);
    if (!start) {
      throw new Error(".dtstart (ICAL.Time) must be given");
    } else {
      this.dtstart = start;
    }
    if (options.component) {
      this._init(options.component);
    } else {
      this.last = formatClassType(options.last, Time) || start.clone();
      if (!options.ruleIterators) {
        throw new Error(".ruleIterators or .component must be given");
      }
      this.ruleIterators = options.ruleIterators.map(function(item) {
        return formatClassType(item, RecurIterator);
      });
      this.ruleDateInc = options.ruleDateInc;
      this.exDateInc = options.exDateInc;
      if (options.ruleDates) {
        this.ruleDates = options.ruleDates.map((item) => formatClassType(item, Time));
        this.ruleDate = this.ruleDates[this.ruleDateInc];
      }
      if (options.exDates) {
        this.exDates = options.exDates.map((item) => formatClassType(item, Time));
        this.exDate = this.exDates[this.exDateInc];
      }
      if (typeof options.complete !== "undefined") {
        this.complete = options.complete;
      }
    }
  }
  /**
   * Compare two ICAL.Time objects.  When the second parameter is a DATE and the first parameter is
   * DATE-TIME, strip the time and compare only the days.
   *
   * @private
   * @param {Time} a   The one object to compare
   * @param {Time} b   The other object to compare
   */
  _compare_special(a, b) {
    if (!a.isDate && b.isDate)
      return new Time({ year: a.year, month: a.month, day: a.day }).compare(b);
    return a.compare(b);
  }
  /**
   * Retrieve the next occurrence in the series.
   * @return {Time}
   */
  next() {
    let iter;
    let next;
    let compare;
    let maxTries = 500;
    let currentTry = 0;
    while (true) {
      if (currentTry++ > maxTries) {
        throw new Error(
          "max tries have occurred, rule may be impossible to fulfill."
        );
      }
      next = this.ruleDate;
      iter = this._nextRecurrenceIter(this.last);
      if (!next && !iter) {
        this.complete = true;
        break;
      }
      if (!next || iter && next.compare(iter.last) > 0) {
        next = iter.last.clone();
        iter.next();
      }
      if (this.ruleDate === next) {
        this._nextRuleDay();
      }
      this.last = next;
      if (this.exDate) {
        compare = this._compare_special(this.last, this.exDate);
        if (compare > 0) {
          this._nextExDay();
        }
        if (compare === 0) {
          this._nextExDay();
          continue;
        }
      }
      return this.last;
    }
  }
  /**
   * Converts object into a serialize-able format. This format can be passed
   * back into the expansion to resume iteration.
   * @return {Object}
   */
  toJSON() {
    function toJSON(item) {
      return item.toJSON();
    }
    let result = /* @__PURE__ */ Object.create(null);
    result.ruleIterators = this.ruleIterators.map(toJSON);
    if (this.ruleDates) {
      result.ruleDates = this.ruleDates.map(toJSON);
    }
    if (this.exDates) {
      result.exDates = this.exDates.map(toJSON);
    }
    result.ruleDateInc = this.ruleDateInc;
    result.exDateInc = this.exDateInc;
    result.last = this.last.toJSON();
    result.dtstart = this.dtstart.toJSON();
    result.complete = this.complete;
    return result;
  }
  /**
   * Extract all dates from the properties in the given component. The
   * properties will be filtered by the property name.
   *
   * @private
   * @param {Component} component             The component to search in
   * @param {String} propertyName             The property name to search for
   * @return {Time[]}                         The extracted dates.
   */
  _extractDates(component, propertyName) {
    let result = [];
    let props = component.getAllProperties(propertyName);
    for (let i = 0, len = props.length; i < len; i++) {
      for (let prop of props[i].getValues()) {
        let idx = binsearchInsert(
          result,
          prop,
          (a, b) => a.compare(b)
        );
        result.splice(idx, 0, prop);
      }
    }
    return result;
  }
  /**
   * Initialize the recurrence expansion.
   *
   * @private
   * @param {Component} component    The component to initialize from.
   */
  _init(component) {
    this.ruleIterators = [];
    this.last = this.dtstart.clone();
    if (!component.hasProperty("rdate") && !component.hasProperty("rrule") && !component.hasProperty("recurrence-id")) {
      this.ruleDate = this.last.clone();
      this.complete = true;
      return;
    }
    if (component.hasProperty("rdate")) {
      this.ruleDates = this._extractDates(component, "rdate");
      if (this.ruleDates[0] && this.ruleDates[0].compare(this.dtstart) < 0) {
        this.ruleDateInc = 0;
        this.last = this.ruleDates[0].clone();
      } else {
        this.ruleDateInc = binsearchInsert(
          this.ruleDates,
          this.last,
          (a, b) => a.compare(b)
        );
      }
      this.ruleDate = this.ruleDates[this.ruleDateInc];
    }
    if (component.hasProperty("rrule")) {
      let rules = component.getAllProperties("rrule");
      let i = 0;
      let len = rules.length;
      let rule;
      let iter;
      for (; i < len; i++) {
        rule = rules[i].getFirstValue();
        iter = rule.iterator(this.dtstart);
        this.ruleIterators.push(iter);
        iter.next();
      }
    }
    if (component.hasProperty("exdate")) {
      this.exDates = this._extractDates(component, "exdate");
      this.exDateInc = binsearchInsert(
        this.exDates,
        this.last,
        this._compare_special
      );
      this.exDate = this.exDates[this.exDateInc];
    }
  }
  /**
   * Advance to the next exdate
   * @private
   */
  _nextExDay() {
    this.exDate = this.exDates[++this.exDateInc];
  }
  /**
   * Advance to the next rule date
   * @private
   */
  _nextRuleDay() {
    this.ruleDate = this.ruleDates[++this.ruleDateInc];
  }
  /**
   * Find and return the recurrence rule with the most recent event and
   * return it.
   *
   * @private
   * @return {?RecurIterator}    Found iterator.
   */
  _nextRecurrenceIter() {
    let iters = this.ruleIterators;
    if (iters.length === 0) {
      return null;
    }
    let len = iters.length;
    let iter;
    let iterTime;
    let iterIdx = 0;
    let chosenIter;
    for (; iterIdx < len; iterIdx++) {
      iter = iters[iterIdx];
      iterTime = iter.last;
      if (iter.completed) {
        len--;
        if (iterIdx !== 0) {
          iterIdx--;
        }
        iters.splice(iterIdx, 1);
        continue;
      }
      if (!chosenIter || chosenIter.last.compare(iterTime) > 0) {
        chosenIter = iter;
      }
    }
    return chosenIter;
  }
};
var _Event = class _Event {
  /**
   * Creates a new ICAL.Event instance.
   *
   * @param {Component=} component              The ICAL.Component to base this event on
   * @param {Object} [options]                  Options for this event
   * @param {Boolean=} options.strictExceptions  When true, will verify exceptions are related by
   *                                              their UUID
   * @param {Array<Component|Event>=} options.exceptions
   *          Exceptions to this event, either as components or events. If not
   *            specified exceptions will automatically be set in relation of
   *            component's parent
   */
  constructor(component, options) {
    /**
     * List of related event exceptions.
     *
     * @type {Event[]}
     */
    __publicField(this, "exceptions", null);
    /**
     * When true, will verify exceptions are related by their UUID.
     *
     * @type {Boolean}
     */
    __publicField(this, "strictExceptions", false);
    if (!(component instanceof Component)) {
      options = component;
      component = null;
    }
    if (component) {
      this.component = component;
    } else {
      this.component = new Component("vevent");
    }
    this._rangeExceptionCache = /* @__PURE__ */ Object.create(null);
    this.exceptions = /* @__PURE__ */ Object.create(null);
    this.rangeExceptions = [];
    if (options && options.strictExceptions) {
      this.strictExceptions = options.strictExceptions;
    }
    if (options && options.exceptions) {
      options.exceptions.forEach(this.relateException, this);
    } else if (this.component.parent && !this.isRecurrenceException()) {
      this.component.parent.getAllSubcomponents("vevent").forEach(function(event) {
        if (event.hasProperty("recurrence-id")) {
          this.relateException(event);
        }
      }, this);
    }
  }
  /**
   * Relates a given event exception to this object.  If the given component
   * does not share the UID of this event it cannot be related and will throw
   * an exception.
   *
   * If this component is an exception it cannot have other exceptions
   * related to it.
   *
   * @param {Component|Event} obj       Component or event
   */
  relateException(obj) {
    if (this.isRecurrenceException()) {
      throw new Error("cannot relate exception to exceptions");
    }
    if (obj instanceof Component) {
      obj = new _Event(obj);
    }
    if (this.strictExceptions && obj.uid !== this.uid) {
      throw new Error("attempted to relate unrelated exception");
    }
    let id = obj.recurrenceId.toString();
    this.exceptions[id] = obj;
    if (obj.modifiesFuture()) {
      let item = [
        obj.recurrenceId.toUnixTime(),
        id
      ];
      let idx = binsearchInsert(
        this.rangeExceptions,
        item,
        compareRangeException
      );
      this.rangeExceptions.splice(idx, 0, item);
    }
  }
  /**
   * Checks if this record is an exception and has the RANGE=THISANDFUTURE
   * value.
   *
   * @return {Boolean}        True, when exception is within range
   */
  modifiesFuture() {
    if (!this.component.hasProperty("recurrence-id")) {
      return false;
    }
    let range2 = this.component.getFirstProperty("recurrence-id").getParameter("range");
    return range2 === _Event.THISANDFUTURE;
  }
  /**
   * Finds the range exception nearest to the given date.
   *
   * @param {Time} time   usually an occurrence time of an event
   * @return {?Event}     the related event/exception or null
   */
  findRangeException(time2) {
    if (!this.rangeExceptions.length) {
      return null;
    }
    let utc = time2.toUnixTime();
    let idx = binsearchInsert(
      this.rangeExceptions,
      [utc],
      compareRangeException
    );
    idx -= 1;
    if (idx < 0) {
      return null;
    }
    let rangeItem = this.rangeExceptions[idx];
    if (utc < rangeItem[0]) {
      return null;
    }
    return rangeItem[1];
  }
  /**
   * Returns the occurrence details based on its start time.  If the
   * occurrence has an exception will return the details for that exception.
   *
   * NOTE: this method is intend to be used in conjunction
   *       with the {@link ICAL.Event#iterator iterator} method.
   *
   * @param {Time} occurrence               time occurrence
   * @return {occurrenceDetails}            Information about the occurrence
   */
  getOccurrenceDetails(occurrence) {
    let id = occurrence.toString();
    let utcId = occurrence.convertToZone(Timezone.utcTimezone).toString();
    let item;
    let result = {
      //XXX: Clone?
      recurrenceId: occurrence
    };
    if (id in this.exceptions) {
      item = result.item = this.exceptions[id];
      result.startDate = item.startDate;
      result.endDate = item.endDate;
      result.item = item;
    } else if (utcId in this.exceptions) {
      item = this.exceptions[utcId];
      result.startDate = item.startDate;
      result.endDate = item.endDate;
      result.item = item;
    } else {
      let rangeExceptionId = this.findRangeException(
        occurrence
      );
      let end;
      if (rangeExceptionId) {
        let exception = this.exceptions[rangeExceptionId];
        result.item = exception;
        let startDiff = this._rangeExceptionCache[rangeExceptionId];
        if (!startDiff) {
          let original = exception.recurrenceId.clone();
          let newStart = exception.startDate.clone();
          original.zone = newStart.zone;
          startDiff = newStart.subtractDate(original);
          this._rangeExceptionCache[rangeExceptionId] = startDiff;
        }
        let start = occurrence.clone();
        start.zone = exception.startDate.zone;
        start.addDuration(startDiff);
        end = start.clone();
        end.addDuration(exception.duration);
        result.startDate = start;
        result.endDate = end;
      } else {
        end = occurrence.clone();
        end.addDuration(this.duration);
        result.endDate = end;
        result.startDate = occurrence;
        result.item = this;
      }
    }
    return result;
  }
  /**
   * Builds a recur expansion instance for a specific point in time (defaults
   * to startDate).
   *
   * @param {Time=} startTime     Starting point for expansion
   * @return {RecurExpansion}    Expansion object
   */
  iterator(startTime) {
    return new RecurExpansion({
      component: this.component,
      dtstart: startTime || this.startDate
    });
  }
  /**
   * Checks if the event is recurring
   *
   * @return {Boolean}        True, if event is recurring
   */
  isRecurring() {
    let comp = this.component;
    return comp.hasProperty("rrule") || comp.hasProperty("rdate");
  }
  /**
   * Checks if the event describes a recurrence exception. See
   * {@tutorial terminology} for details.
   *
   * @return {Boolean}    True, if the event describes a recurrence exception
   */
  isRecurrenceException() {
    return this.component.hasProperty("recurrence-id");
  }
  /**
   * Returns the types of recurrences this event may have.
   *
   * Returned as an object with the following possible keys:
   *
   *    - YEARLY
   *    - MONTHLY
   *    - WEEKLY
   *    - DAILY
   *    - MINUTELY
   *    - SECONDLY
   *
   * @return {Object.<frequencyValues, Boolean>}
   *          Object of recurrence flags
   */
  getRecurrenceTypes() {
    let rules = this.component.getAllProperties("rrule");
    let i = 0;
    let len = rules.length;
    let result = /* @__PURE__ */ Object.create(null);
    for (; i < len; i++) {
      let value = rules[i].getFirstValue();
      result[value.freq] = true;
    }
    return result;
  }
  /**
   * The uid of this event
   * @type {String}
   */
  get uid() {
    return this._firstProp("uid");
  }
  set uid(value) {
    this._setProp("uid", value);
  }
  /**
   * The start date
   * @type {Time}
   */
  get startDate() {
    return this._firstProp("dtstart");
  }
  set startDate(value) {
    this._setTime("dtstart", value);
  }
  /**
   * The end date. This can be the result directly from the property, or the
   * end date calculated from start date and duration. Setting the property
   * will remove any duration properties.
   * @type {Time}
   */
  get endDate() {
    let endDate = this._firstProp("dtend");
    if (!endDate) {
      let duration2 = this._firstProp("duration");
      endDate = this.startDate.clone();
      if (duration2) {
        endDate.addDuration(duration2);
      } else if (endDate.isDate) {
        endDate.day += 1;
      }
    }
    return endDate;
  }
  set endDate(value) {
    if (this.component.hasProperty("duration")) {
      this.component.removeProperty("duration");
    }
    this._setTime("dtend", value);
  }
  /**
   * The duration. This can be the result directly from the property, or the
   * duration calculated from start date and end date. Setting the property
   * will remove any `dtend` properties.
   * @type {Duration}
   */
  get duration() {
    let duration2 = this._firstProp("duration");
    if (!duration2) {
      return this.endDate.subtractDateTz(this.startDate);
    }
    return duration2;
  }
  set duration(value) {
    if (this.component.hasProperty("dtend")) {
      this.component.removeProperty("dtend");
    }
    this._setProp("duration", value);
  }
  /**
   * The location of the event.
   * @type {String}
   */
  get location() {
    return this._firstProp("location");
  }
  set location(value) {
    this._setProp("location", value);
  }
  /**
   * The attendees in the event
   * @type {Property[]}
   */
  get attendees() {
    return this.component.getAllProperties("attendee");
  }
  /**
   * The event summary
   * @type {String}
   */
  get summary() {
    return this._firstProp("summary");
  }
  set summary(value) {
    this._setProp("summary", value);
  }
  /**
   * The event description.
   * @type {String}
   */
  get description() {
    return this._firstProp("description");
  }
  set description(value) {
    this._setProp("description", value);
  }
  /**
   * The event color from [rfc7986](https://datatracker.ietf.org/doc/html/rfc7986)
   * @type {String}
   */
  get color() {
    return this._firstProp("color");
  }
  set color(value) {
    this._setProp("color", value);
  }
  /**
   * The organizer value as an uri. In most cases this is a mailto: uri, but
   * it can also be something else, like urn:uuid:...
   * @type {String}
   */
  get organizer() {
    return this._firstProp("organizer");
  }
  set organizer(value) {
    this._setProp("organizer", value);
  }
  /**
   * The sequence value for this event. Used for scheduling
   * see {@tutorial terminology}.
   * @type {Number}
   */
  get sequence() {
    return this._firstProp("sequence");
  }
  set sequence(value) {
    this._setProp("sequence", value);
  }
  /**
   * The recurrence id for this event. See {@tutorial terminology} for details.
   * @type {Time}
   */
  get recurrenceId() {
    return this._firstProp("recurrence-id");
  }
  set recurrenceId(value) {
    this._setTime("recurrence-id", value);
  }
  /**
   * Set/update a time property's value.
   * This will also update the TZID of the property.
   *
   * TODO: this method handles the case where we are switching
   * from a known timezone to an implied timezone (one without TZID).
   * This does _not_ handle the case of moving between a known
   *  (by TimezoneService) timezone to an unknown timezone...
   *
   * We will not add/remove/update the VTIMEZONE subcomponents
   *  leading to invalid ICAL data...
   * @private
   * @param {String} propName     The property name
   * @param {Time} time           The time to set
   */
  _setTime(propName, time2) {
    let prop = this.component.getFirstProperty(propName);
    if (!prop) {
      prop = new Property(propName);
      this.component.addProperty(prop);
    }
    if (time2.zone === Timezone.localTimezone || time2.zone === Timezone.utcTimezone) {
      prop.removeParameter("tzid");
    } else {
      prop.setParameter("tzid", time2.zone.tzid);
    }
    prop.setValue(time2);
  }
  _setProp(name, value) {
    this.component.updatePropertyWithValue(name, value);
  }
  _firstProp(name) {
    return this.component.getFirstPropertyValue(name);
  }
  /**
   * The string representation of this event.
   * @return {String}
   */
  toString() {
    return this.component.toString();
  }
};
__publicField(_Event, "THISANDFUTURE", "THISANDFUTURE");
var Event = _Event;
function compareRangeException(a, b) {
  if (a[0] > b[0]) return 1;
  if (b[0] > a[0]) return -1;
  return 0;
}
var ComponentParser = class {
  /**
   * Creates a new ICAL.ComponentParser instance.
   *
   * @param {Object=} options                   Component parser options
   * @param {Boolean} options.parseEvent        Whether events should be parsed
   * @param {Boolean} options.parseTimezeone    Whether timezones should be parsed
   */
  constructor(options) {
    /**
     * When true, parse events
     *
     * @type {Boolean}
     */
    __publicField(this, "parseEvent", true);
    /**
     * When true, parse timezones
     *
     * @type {Boolean}
     */
    __publicField(this, "parseTimezone", true);
    /* SAX like events here for reference */
    /**
     * Fired when parsing is complete
     * @callback
     */
    __publicField(
      this,
      "oncomplete",
      /* c8 ignore next */
      function() {
      }
    );
    /**
     * Fired if an error occurs during parsing.
     *
     * @callback
     * @param {Error} err details of error
     */
    __publicField(
      this,
      "onerror",
      /* c8 ignore next */
      function(err) {
      }
    );
    /**
     * Fired when a top level component (VTIMEZONE) is found
     *
     * @callback
     * @param {Timezone} component     Timezone object
     */
    __publicField(
      this,
      "ontimezone",
      /* c8 ignore next */
      function(component) {
      }
    );
    /**
     * Fired when a top level component (VEVENT) is found.
     *
     * @callback
     * @param {Event} component    Top level component
     */
    __publicField(
      this,
      "onevent",
      /* c8 ignore next */
      function(component) {
      }
    );
    if (typeof options === "undefined") {
      options = {};
    }
    for (let [key2, value] of Object.entries(options)) {
      this[key2] = value;
    }
  }
  /**
   * Process a string or parse ical object.  This function itself will return
   * nothing but will start the parsing process.
   *
   * Events must be registered prior to calling this method.
   *
   * @param {Component|String|Object} ical      The component to process,
   *        either in its final form, as a jCal Object, or string representation
   */
  process(ical) {
    if (typeof ical === "string") {
      ical = parse(ical);
    }
    if (!(ical instanceof Component)) {
      ical = new Component(ical);
    }
    let components = ical.getAllSubcomponents();
    let i = 0;
    let len = components.length;
    let component;
    for (; i < len; i++) {
      component = components[i];
      switch (component.name) {
        case "vtimezone":
          if (this.parseTimezone) {
            let tzid = component.getFirstPropertyValue("tzid");
            if (tzid) {
              this.ontimezone(new Timezone({
                tzid,
                component
              }));
            }
          }
          break;
        case "vevent":
          if (this.parseEvent) {
            this.onevent(new Event(component));
          }
          break;
        default:
          continue;
      }
    }
    this.oncomplete();
  }
};
var ICALmodule = {
  /**
   * The number of characters before iCalendar line folding should occur
   * @type {Number}
   * @default 75
   */
  foldLength: 75,
  debug: false,
  /**
   * The character(s) to be used for a newline. The default value is provided by
   * rfc5545.
   * @type {String}
   * @default "\r\n"
   */
  newLineChar: "\r\n",
  Binary,
  Component,
  ComponentParser,
  Duration,
  Event,
  Period,
  Property,
  Recur,
  RecurExpansion,
  RecurIterator,
  Time,
  Timezone,
  TimezoneService,
  UtcOffset,
  VCardTime,
  parse,
  stringify,
  design,
  helpers
};

// obsidian/plain-syntax.js
var activity = /^([^\[\]]+?)\s+(\d+(?:[.,]\d+)?[hms])(?:\s+x(\d+))?(?:\s+(\d\d:\d\d))?\s+((?:\[\[[^\[\]]+\]\](?:\s+|$))+)$/i;
var range = /^([^\[\]]+?)\s+(\d\d:\d\d\s*-\s*\d\d:\d\d)\s+(\d+(?:[.,]\d+)?[hm])(?=\s|$)/i;
var timeRange = /^(\d\d:\d\d\s*-\s*\d\d:\d\d)\s+(\d+(?:[.,]\d+)?[hm])\s+([^\[\]]+?)(\s+\[\[.*)?$/i;
var timedActivity = /^(?:(\d\d:\d\d)\s+)?(\d+(?:[.,]\d+)?[hms])(?:\s+x(\d+))?\s+([^\[\]]+?)\s+((?:\[\[[^\[\]]+\]\](?:\s+|$))+)$/i;
function usesTimeRange(line) {
  return timeRange.test(line.trim());
}
function timeFirstArea(line) {
  const text = line.trim();
  const match = timeRange.exec(text) || timedActivity.exec(text);
  if (!match) return null;
  const name = match.length === 5 ? match[3] : match[4];
  const prefix = text.slice(0, text.indexOf("[[") < 0 ? text.length : text.indexOf("[[")).trimEnd();
  const end = line.indexOf(text) + prefix.length;
  return { from: end - name.length, to: end };
}
function expandRange(line) {
  if (usesTimeRange(line)) return line.replace(timeRange, "$3 +$1 -$2$4");
  return line.replace(range, "$1 +$2 -$3");
}
var isReminder = (line) => /^Calendar · .* <!-- gcal:[\w-]+(?: area:[^ ]+)? -->$/.test(line) || /^\s*\[\[[^\[\]\n|]+(?:\|[^\[\]\n]+)?\]\]\s*$/.test(line);
function flexibleAllocation(line) {
  if (isReminder(line)) return null;
  const links = line.match(/\[\[[^\[\]\n]+\]\]/g) || [];
  if (links.length > 1) return null;
  const fields = (links.length ? line.replace(links[0], " ") : line).trim().split(/\s+/);
  const duration2 = fields.filter((field) => /^\d+(?:[.,]\d+)?[hm]$/i.test(field));
  const clock3 = fields.filter((field) => /^\+?(?:[01]\d|2[0-3]):[0-5]\d$/.test(field));
  if (fields[0]?.startsWith("@") && !links.length && !clock3.length) return null;
  if (duration2.length !== 1 || clock3.length > 1) return null;
  const area = fields.filter((field) => field !== duration2[0] && field !== clock3[0]).join(" ");
  if (!/^@[^@\s\d+\-=[\]]+(?: [^@+\-=[\]]+)*$/u.test(area)) return null;
  return ["-", ...links, "@" + duration2[0], ...clock3.length ? ["+" + clock3[0].replace(/^\+/, "")] : [], area].join(" ");
}
function expandDailyLine(line) {
  const allocation = flexibleAllocation(line);
  if (allocation) return allocation;
  const expanded = expandRange(line);
  if (expanded !== line) return expanded;
  const timed = timedActivity.exec(line);
  if (timed) {
    const [, start2, duration3, count2, area2, links2] = timed;
    line = area2 + " " + duration3 + (count2 ? " x" + count2 : "") + (start2 ? " " + start2 : "") + " " + links2;
  }
  const match = activity.exec(line);
  if (!match) return line;
  const [, area, duration2, count, start, links] = match;
  return "- " + links.trim() + " " + duration2 + (count ? " = " + count : "") + (start ? " +" + start : "") + " @" + area;
}

// core/tempo-estimates.js
var activityStart = /^[ \t]*-[ \t]+\[([ x])\](?=[ \t]+@)/im;
var isActivitySource = (source) => activityStart.test(source);
var isEstimateSource = (source) => /^\s*@/m.test(source) || isActivitySource(source);
function parseNoteEstimate(source, areas) {
  const mark = activityStart.exec(source);
  if (!mark) return { entries: parseEstimate(source, areas) };
  const lines = source.trim().split(/\r?\n/);
  const activity2 = lines[0].replace(activityStart, "").trim();
  if (lines.length !== 1 || !activity2.startsWith("@"))
    throw Error("Usa una sola riga per l\u2019attivit\xE0: - [ ] @Studio 2h.");
  const entries = parseEstimate(activity2, areas);
  if (entries[0].kind !== "budget") throw Error("Indica area e stima di concentrazione: - [ ] @Studio 2h.");
  return { entries, completed: mark[1].toLowerCase() === "x" };
}
var markActivity = (source, completed) => source.replace(activityStart, (mark) => mark.slice(0, -2) + (completed ? "x" : " ") + "]");
function parseEstimate(source, areas) {
  const rows = [];
  for (const [i, line] of source.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    const total = line.trim().match(/^@(\d+(?:[.,]\d+)?)\s*(m|h)$/i);
    if (total) {
      if (rows.length || source.split(/\r?\n/).filter((row3) => row3.trim()).length !== 1)
        throw Error("La durata totale @14h deve essere l\u2019unica riga del blocco TEMPVS.");
      const value = Number(total[1].replace(",", ".")) * (total[2].toLowerCase() === "h" ? 60 : 1);
      if (!Number.isSafeInteger(value) || value < 1 || value > 1e5)
        throw Error("Durata totale lorda non valida: usa @14h oppure @90m (minuti interi).");
      return [{ kind: "total", grossMinutes: value }];
    }
    const budget = line.trim().match(/^@(.+?)\s+(\d+(?:[.,]\d+)?)\s*(m|h)$/i);
    if (budget) {
      const area2 = areas.find((a) => a.name.toLocaleLowerCase() === budget[1].trim().toLocaleLowerCase());
      if (!area2) throw Error("Area sconosciuta: " + budget[1]);
      const targetMinutes = Number(budget[2].replace(",", ".")) * (budget[3].toLowerCase() === "h" ? 60 : 1);
      if (!Number.isSafeInteger(targetMinutes) || targetMinutes < 1 || targetMinutes > 1e5) throw Error("Indica una durata tra 1 e 100000 minuti interi.");
      rows.push({ kind: "budget", area: area2.name, areaId: area2.id, targetMinutes });
      continue;
    }
    const m = line.trim().match(/^@(.+?)\s+(\d+)\s+-\s*(\d+(?:[.,]\d+)?)\s*(m|h)$/i);
    if (!m) throw Error(`Riga ${i + 1}: usa @Studio 10h.`);
    const area = areas.find((a) => a.name.trim().toLocaleLowerCase() === m[1].trim().toLocaleLowerCase());
    if (!area) throw Error(`Riga ${i + 1}: area sconosciuta: ${m[1]}.`);
    const count = Number(m[2]), minutes2 = Number(m[3].replace(",", ".")) * (m[4].toLowerCase() === "h" ? 60 : 1);
    if (!Number.isSafeInteger(count) || count < 1 || count > 1e5 || !Number.isInteger(minutes2) || minutes2 < 1 || minutes2 > 1439) throw Error(`Riga ${i + 1}: indica 1\u2013100000 sessioni da 1\u20131439 minuti lordi interi.`);
    rows.push({ areaId: area.id, area: area.name, count, minutes: minutes2 });
  }
  if (!rows.length) throw Error("Inserisci almeno una stima.");
  return rows;
}
function validateEstimates(value) {
  if (value === void 0) return;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("Stime delle note non valide.");
  for (const [id, n] of Object.entries(value)) {
    if (n?.completion && (!Number.isFinite(n.completion.estimated) || n.completion.estimated <= 0 || !Number.isFinite(n.completion.done) || n.completion.done < 0)) throw Error("Consuntivo della nota non valido.");
    const total = n?.entries?.length === 1 && n.entries[0]?.kind === "total";
    const invalid = total ? !Number.isSafeInteger(n.entries[0].grossMinutes) || n.entries[0].grossMinutes < 1 || n.entries[0].grossMinutes > 1e5 : n?.entries?.some((e) => !e || e.kind === "total" || typeof e.area !== "string" || (e.kind === "budget" ? !Number.isSafeInteger(e.targetMinutes) || e.targetMinutes < 1 || e.targetMinutes > 1e5 : !Number.isInteger(e.count) || e.count < 1 || e.count > 1e5 || !Number.isInteger(e.minutes) || e.minutes < 1 || e.minutes > 1439));
    if (!n || n.id !== id || typeof n.path !== "string" || !n.path || typeof n.title !== "string" || !Array.isArray(n.entries) || !n.entries.length || invalid)
      throw Error("Stima della nota non valida.");
  }
}
var estimatesOf = (state) => Object.values(state.defaults?.simple?.noteEstimates || {});
var matchesArea = (entry, session) => entry.kind === "total" || (entry.areaId && session.areaId ? entry.areaId === session.areaId : entry.area === (session.area || session.title));
var normalizeTarget = (path) => String(path || "").split(/[#^]/)[0].replace(/\\/g, "/").replace(/\.md$/i, "").replace(/^\/+|\/+$/g, "").toLocaleLowerCase();
function isPrimaryLink(record, note, state) {
  const raw = record.linkedNotes?.[0]?.path;
  if (!raw) return false;
  const link = normalizeTarget(raw), full = normalizeTarget(note.path);
  if (link === full) return true;
  if (link.includes("/") || link !== full.split("/").at(-1)) return false;
  const matches = estimatesOf(state).filter((n) => n.vault === note.vault && normalizeTarget(n.path).split("/").at(-1) === link);
  return matches.length === 1 && matches[0].id === note.id;
}
function attributedFocus(record, note, state) {
  const existing = record.noteWork || {};
  const credited = Math.max(0, Number(existing[note.id]) || 0);
  const allocated = Object.values(existing).reduce((sum, v) => sum + (Number(v) || 0), 0);
  const selected = isPrimaryLink(record, note, state) || !record.linkedNotes?.length && record.noteEstimateId === note.id;
  return credited + (selected ? Math.max(0, (record.actualSeconds ?? (record.measured ? (Number(record.minutes) || 0) * 60 : 0)) - allocated) : 0);
}
var estimatedSeconds = (note) => note.entries.reduce((sum, e) => sum + (e.targetMinutes ?? e.grossMinutes ?? e.count * e.minutes) * 60, 0);
function measuredTotals(note, state) {
  const records = /* @__PURE__ */ new Map();
  for (const history of state.history || []) if (history.measured) records.set(history.sessionId, history);
  for (const session of state.sessions || []) records.set(session.id, session);
  let done = 0;
  for (const record of records.values()) {
    if (note.entries.some((entry) => matchesArea(entry, record))) done += attributedFocus(record, note, state);
  }
  return { estimated: estimatedSeconds(note), done };
}
function estimateProgress(note, state, { live } = {}) {
  const { estimated, done } = note.completed && note.completion ? note.completion : live ?? measuredTotals(note, state);
  return { estimated, done, remaining: Math.max(0, estimated - done), difference: done - estimated, percent: estimated ? 100 * done / estimated : 0 };
}
function setEstimateCompleted(note, state, completed, live) {
  if (note.completed === completed) return;
  if (completed) note.completion = live ?? measuredTotals(note, state);
  else delete note.completion;
  note.completed = completed;
}
function estimateResult(note, progress) {
  if (!note.completed) return "Restano " + estimateTime(progress.remaining) + " \xB7 " + Math.floor(progress.percent) + "%";
  if (progress.difference === 0) return "Completato \xB7 stima rispettata";
  return "Completato \xB7 " + estimateTime(Math.abs(progress.difference)) + (progress.difference < 0 ? " sotto la stima" : " oltre la stima");
}
function estimateTime(seconds) {
  const value = Math.max(0, Math.ceil(seconds)), h = Math.floor(value / 3600), m = Math.floor(value % 3600 / 60), s = value % 60;
  return [h ? `${h} h` : "", m ? `${m} min` : "", s ? `${s} s` : ""].filter(Boolean).join(" ") || "0 min";
}
function compactEstimateTime(seconds) {
  return estimateTime(seconds).replaceAll(" min", "m").replaceAll(" h", "h").replaceAll(" s", "s").replaceAll(" ", "");
}

// core/tempo-areas.js
var key = (name) => name.trim().replace(/\s+/g, " ").toLocaleLowerCase();
var legacyId = (name) => "area:" + encodeURIComponent(key(name));
function normalizeAreaLinks(data, areas) {
  const names = /* @__PURE__ */ new Set(), ids = /* @__PURE__ */ new Set();
  const normalized = areas.map((area) => {
    const name = area.name.trim(), id = area.id ?? legacyId(name);
    if (!name || name.length > 80 || names.has(key(name)) || typeof id !== "string" || !id || ids.has(id))
      throw Error("Aree con nomi o identificativi duplicati/non validi.");
    names.add(key(name));
    ids.add(id);
    return { ...area, id, name };
  });
  const collections = { sessions: data.sessions || [], tasks: data.tasks || [], history: data.history || [] };
  const linked = {}, sessionById = new Map((data.sessions || []).map((s) => [s.id, s]));
  for (const [collection, items] of Object.entries(collections)) {
    linked[collection] = items.map((item) => {
      let area = item.areaId ? normalized.find((a) => a.id === item.areaId) : null;
      if (item.areaId && !area) area = normalized.find((a) => a.name === item.area);
      if (item.areaId && !area) throw Error("Associazione area mancante: " + item.areaId + ". Ripristina o risolvi il conflitto tra le aree.");
      const name = item.area || (collection === "sessions" ? item.title : collection === "history" ? sessionById.get(item.sessionId)?.area || (normalized.some((a) => a.name === item.title) ? item.title : "") : "");
      if (!area && name) {
        area = normalized.find((a) => key(a.name) === key(name));
        if (!area) {
          area = { id: legacyId(name), name: name.trim(), description: "" };
          normalized.push(area);
        }
      }
      if (!area) return { ...item };
      return {
        ...item,
        areaId: area.id,
        area: area.name,
        ...item.title === item.area && item.area !== area.name ? { title: area.name } : {}
      };
    });
  }
  return { areas: normalized, ...linked };
}

// core/tempo-core.js
var DEFAULTS = Object.freeze({ workMinutes: 25, breakEnabled: true });
function localDateString(date = /* @__PURE__ */ new Date()) {
  const y = date.getFullYear(), m = String(date.getMonth() + 1).padStart(2, "0"), d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function timeToMinutes(value) {
  if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return NaN;
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}
function dateTime(date, time2) {
  const [y, mo, d] = date.split("-").map(Number), [h, mi] = time2.split(":").map(Number);
  return new Date(y, mo - 1, d, h, mi, 0, 0);
}
function formatTime(date) {
  return new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" }).format(date);
}
function pauseMinutes(work) {
  return work / 5;
}
function normalizeSession(session) {
  if (!session || typeof session !== "object" || Array.isArray(session)) return session;
  return { ...session, breakEnabled: session.breakEnabled !== void 0 ? Boolean(session.breakEnabled) : true };
}
function validSession(session) {
  if (!session || typeof session.id !== "string" || !session.id.trim() || typeof session.title !== "string" || !session.title.trim() || typeof session.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(session.date) || !(session.cycleMinutes !== void 0 && session.workMinutes === session.cycleMinutes * 5 / 6) && (!Number.isInteger(session.workMinutes) || session.workMinutes < 1 || session.workMinutes > 240)) return false;
  if (session.cycleMinutes !== void 0 && (!Number.isInteger(session.cycleMinutes) || session.cycleMinutes < 1 || session.cycleMinutes > 1439 || session.cycleMinutes <= session.workMinutes || session.customBreakMinutes !== void 0)) return false;
  const [year, month, day] = session.date.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return false;
  const start = timeToMinutes(session.start), end = timeToMinutes(session.end);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return false;
  if (session.customBreakMinutes !== void 0 && (!Number.isInteger(session.customBreakMinutes) || session.customBreakMinutes < 0 || session.customBreakMinutes > (sessionBounds(session).end - sessionBounds(session).start) / 6e4)) return false;
  return true;
}
function sessionBounds(session) {
  if (session.timerStartedAt && session.timerEndsAt) {
    const start2 = new Date(session.timerStartedAt), end2 = new Date(session.timerEndsAt);
    if (Number.isFinite(+start2) && Number.isFinite(+end2) && end2 > start2) return { start: start2, end: end2 };
  }
  const start = dateTime(session.date, session.start);
  const end = dateTime(session.date, session.end);
  if (timeToMinutes(session.end) <= timeToMinutes(session.start)) end.setDate(end.getDate() + 1);
  return { start, end };
}
function getSessionStatus(session, now = /* @__PURE__ */ new Date()) {
  const { start, end } = sessionBounds(session);
  if (now < start) return "upcoming";
  if (now >= end) return "finished";
  return "active";
}
function sortSessions(sessions) {
  return [...sessions].sort((a, b) => sessionBounds(a).start - sessionBounds(b).start);
}
function getActiveSession(sessions, now = /* @__PURE__ */ new Date()) {
  return sortSessions(sessions.filter((session) => getSessionStatus(session, now) === "active"))[0] || null;
}
function getNextSession(sessions, now = /* @__PURE__ */ new Date()) {
  return sortSessions(sessions.filter((session) => getSessionStatus(session, now) === "upcoming"))[0] || null;
}
function getPhase(session, now = /* @__PURE__ */ new Date()) {
  const { start, end } = sessionBounds(session);
  if (session.customBreakMinutes !== void 0) {
    const boundary = new Date(+end - session.customBreakMinutes * 6e4);
    const isBreak = session.customBreakMinutes > 0 && now >= boundary;
    const phaseStart2 = isBreak ? boundary : start, phaseEnd2 = isBreak ? end : boundary;
    return {
      kind: isBreak ? "break" : "work",
      label: isBreak ? "Pausa" : "Concentrazione",
      start: phaseStart2,
      end: phaseEnd2,
      remaining: Math.max(0, Math.ceil((phaseEnd2 - now) / 1e3)),
      progress: Math.min(100, Math.max(0, (now - phaseStart2) / Math.max(1, phaseEnd2 - phaseStart2) * 100)),
      sessionEnd: end,
      totalRemaining: Math.max(0, Math.ceil((end - now) / 1e3))
    };
  }
  const workMs = Math.round(session.registerMinutes ? (end - start) * 5 / 6 : session.workMinutes * 6e4);
  const elapsed = Math.max(0, now - start);
  const remainingSession = Math.max(0, end - now);
  if (!session.breakEnabled) {
    return {
      kind: "work",
      label: "Concentrazione",
      start,
      end,
      remaining: Math.max(0, Math.ceil(remainingSession / 1e3)),
      progress: Math.min(100, elapsed / Math.max(1, end - start) * 100),
      sessionEnd: end,
      totalRemaining: Math.ceil(remainingSession / 1e3)
    };
  }
  const breakMs = session.registerMinutes ? end - start - workMs : Math.round((session.cycleMinutes !== void 0 ? session.cycleMinutes - session.workMinutes : pauseMinutes(session.workMinutes)) * 6e4);
  const cycleMs = workMs + breakMs;
  const cycleIndex = Math.floor(elapsed / cycleMs);
  const within = elapsed % cycleMs;
  const isWork = within < workMs;
  const phaseDuration = isWork ? workMs : breakMs;
  const phaseElapsed = isWork ? within : within - workMs;
  const phaseStart = new Date(start.getTime() + cycleIndex * cycleMs + (isWork ? 0 : workMs));
  const theoreticalEnd = new Date(phaseStart.getTime() + phaseDuration);
  const phaseEnd = theoreticalEnd < end ? theoreticalEnd : end;
  return {
    kind: isWork ? "work" : "break",
    label: isWork ? "Concentrazione" : "Pausa",
    start: phaseStart,
    end: phaseEnd,
    remaining: Math.max(0, Math.ceil((phaseEnd - now) / 1e3)),
    progress: Math.min(100, Math.max(0, phaseElapsed / phaseDuration * 100)),
    sessionEnd: end,
    totalRemaining: Math.ceil(remainingSession / 1e3)
  };
}
function mmss(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes2 = Math.floor(total / 60), remainder = total % 60;
  return `${String(minutes2).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}
function sessionsOverlap(a, b) {
  const aa = sessionBounds(a), bb = sessionBounds(b);
  return aa.start < bb.end && aa.end > bb.start;
}
function hasSessionOverlaps(sessions) {
  const sorted = sortSessions(sessions);
  let furthestEnd = -Infinity;
  for (const session of sorted) {
    const { start, end } = sessionBounds(session);
    if (start.getTime() < furthestEnd) return true;
    furthestEnd = Math.max(furthestEnd, end.getTime());
  }
  return false;
}
function getAmbientFocusMode(sessions, now = /* @__PURE__ */ new Date()) {
  const active = getActiveSession(sessions, now);
  if (active) {
    const phase = getPhase(active, now);
    if (phase.kind === "work") return "focus";
    if (phase.end.getTime() < sessionBounds(active).end.getTime()) return "waiting";
  }
  return getNextSession(sessions, now) ? "waiting" : "finished";
}

// core/tempo-simple.js
var DEFAULT_AREA_COLORS = Object.freeze({
  Studio: "#D65B56",
  Lavoro: "#29845C",
  Personale: "#D6A323"
});
function normalizeAreaColor(value, name = "") {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value.toUpperCase() : DEFAULT_AREA_COLORS[name] || "#54769B";
}
function focusCycle(focusMinutes, breakEnabled = true) {
  if (!Number.isInteger(focusMinutes) || focusMinutes < 1 || focusMinutes > 240)
    throw Error("La concentrazione per ciclo deve durare da 1 a 240 minuti.");
  return { focusMinutes, breakMinutes: breakEnabled ? pauseMinutes(focusMinutes) : 0 };
}
function grossCycle(cycleMinutes) {
  if (!Number.isInteger(cycleMinutes) || cycleMinutes < 1 || cycleMinutes > 1439)
    throw Error("Il pomodoro lordo deve durare da 1 a 1439 minuti interi.");
  const focusMinutes = cycleMinutes * 5 / 6;
  return { focusMinutes, breakMinutes: cycleMinutes - focusMinutes };
}
function customPause(minutes2, grossMinutes) {
  if (!Number.isInteger(minutes2) || minutes2 < 0 || minutes2 >= grossMinutes)
    throw Error("La pausa deve essere un numero intero di minuti, da 0 a meno della durata lorda.");
  return minutes2;
}
function normalizeArchive(data) {
  if (!data || !Array.isArray(data.sessions) || data.sessions.some((s) => !validSession(s)) || new Set(data.sessions.map((s) => s.id)).size !== data.sessions.length) throw Error("Archivio sessioni non valido.");
  if (data.sessions.some((s) => s.actualSeconds !== void 0 && (!Number.isFinite(s.actualSeconds) || s.actualSeconds < 0))) throw Error("Tempo registrato non valido.");
  if (data.defaults?.workMinutes !== void 0 && (!Number.isInteger(data.defaults.workMinutes) || data.defaults.workMinutes < 1 || data.defaults.workMinutes > 240)) throw Error("Durata del ciclo non valida.");
  if (data.sessions.some((s) => (s.timerStartedAt || s.timerEndsAt) && (!Number.isFinite(+new Date(s.timerStartedAt)) || !Number.isFinite(+new Date(s.timerEndsAt)) || new Date(s.timerEndsAt) <= new Date(s.timerStartedAt)))) throw Error("Orari timer non validi.");
  const config = data.defaults?.simple || {};
  validateEstimates(config.noteEstimates);
  for (const item of [...data.sessions, ...data.history || []]) if (item.noteWork !== void 0 && (!item.noteWork || typeof item.noteWork !== "object" || Array.isArray(item.noteWork) || Object.values(item.noteWork).some((v) => !Number.isFinite(v) || v < 0))) throw Error("Avanzamento note non valido.");
  if (config.areas && (!Array.isArray(config.areas) || !config.areas.length || config.areas.some((a) => !a || typeof a.name !== "string" || !a.name.trim() || typeof a.description !== "string"))) throw Error("Aree non valide.");
  if (config.windows && (!Array.isArray(config.windows) || config.windows.some((w) => !validSession({ ...w, id: "window", title: "window", workMinutes: 25 })))) throw Error("Fasce non valide.");
  if (data.history && (!Array.isArray(data.history) || data.history.some((h) => !h || typeof h.sessionId !== "string" || !h.sessionId.trim() || !Number.isFinite(h.minutes) || h.minutes < 0))) throw Error("Storico non valido.");
  if (data.tasks !== void 0 && (!Array.isArray(data.tasks) || data.tasks.some((t) => !t || typeof t.id !== "string" || !t.id || t.title !== void 0 && typeof t.title !== "string") || new Set(data.tasks.map((t) => t.id)).size !== data.tasks.length)) throw Error("Attivit\xE0 non valide.");
  if (data.history && new Set(data.history.map((h) => h.sessionId)).size !== data.history.length) throw Error("Storico duplicato.");
  if (data.syncDeleted !== void 0 && (!data.syncDeleted || ["tasks", "sessions", "history"].some((k) => data.syncDeleted[k] !== void 0 && (!Array.isArray(data.syncDeleted[k]) || data.syncDeleted[k].some((id) => typeof id !== "string" || !id))))) throw Error("Cancellazioni non valide.");
  const names = [.../* @__PURE__ */ new Set(["Studio", "Lavoro", "Personale", ...data.sessions.map((s) => s.area || s.title)])];
  const storedAreas = config.areas || names.map((name) => ({ name, description: "" }));
  const areas = storedAreas.map((area) => ({
    ...area,
    color: normalizeAreaColor(area.color ?? data.appearance?.areaColors?.[area.name], area.name)
  }));
  const linked = normalizeAreaLinks(data, areas);
  return { ...data, sessions: linked.sessions.map(normalizeSession), tasks: linked.tasks, history: linked.history, syncDeleted: { tasks: [], sessions: [], ...data.syncDeleted }, defaults: { ...data.defaults, workMinutes: data.defaults?.workMinutes || 25, breakEnabled: data.defaults?.breakEnabled !== false, simple: { ...config, areas: linked.areas.map((a) => ({ ...a, color: normalizeAreaColor(a.color, a.name) })), windows: config.windows || [] } } };
}
function planSessions(requests, windows, existing, defaults, now = /* @__PURE__ */ new Date(), id = () => crypto.randomUUID(), selectedDate = localDateString(now)) {
  if (!Array.isArray(requests) || !Array.isArray(windows) || !Array.isArray(existing)) throw Error("Richieste e fasce non valide.");
  if (!Number.isFinite(+now)) throw Error("Data attuale non valida.");
  const result = [];
  let remainder = 0;
  const cycleFor = (request) => request.cycleMinutes !== void 0 ? grossCycle(request.cycleMinutes).focusMinutes : focusCycle(request.focusMinutes ?? defaults.workMinutes, defaults.breakEnabled).focusMinutes;
  const cycleSettings = (request) => request.cycleMinutes !== void 0 ? { cycleMinutes: request.cycleMinutes, breakEnabled: true } : {};
  for (const request of requests) {
    if (!request || typeof request.area !== "string" || !request.area.trim() || !Number.isInteger(request.minutes) || request.minutes < 1 || request.minutes > 10080)
      throw Error("Indica area e durata lorda da 1 a 10080 minuti interi.");
    if (request.dayOffset !== void 0 && ![0, 1].includes(request.dayOffset))
      throw Error("Il giorno della sessione deve essere quello selezionato o il successivo.");
    if (request.start !== void 0 && !/^([01]\d|2[0-3]):[0-5]\d$/.test(request.start))
      throw Error("Orario fisso non valido: usa HH:MM.");
    cycleFor(request);
    if (request.cycleMinutes !== void 0) {
      if (request.focusMinutes !== void 0 || request.customBreakMinutes !== void 0) throw Error("Usa un solo tipo di ciclo: -minuti, ~focus oppure !pausa finale.");
      continue;
    }
    const pause = request.customBreakMinutes ?? defaults.customBreakMinutes;
    if (pause !== void 0) customPause(pause, request.minutes);
  }
  const applyPause = (request, sessions) => {
    if (request.cycleMinutes !== void 0) return;
    let pause = request.customBreakMinutes ?? defaults.customBreakMinutes;
    if (pause === void 0) return;
    for (const session of [...sessions].reverse()) {
      const gross = Math.round((sessionBounds(session).end - sessionBounds(session).start) / 6e4);
      session.customBreakMinutes = Math.min(pause, gross);
      session.breakEnabled = session.customBreakMinutes > 0;
      pause -= session.customBreakMinutes;
    }
  };
  for (const request of requests.filter((r) => r.start)) {
    if (request.minutes > 1440) throw Error("Una sessione con orario fisso pu\xF2 durare al massimo 24 ore.");
    const start = dateTime(selectedDate, request.start);
    if (request.dayOffset) start.setDate(start.getDate() + request.dayOffset);
    const end = new Date(+start + request.minutes * 6e4);
    const session = { id: id(), title: request.area, area: request.area, ...request.areaId ? { areaId: request.areaId } : {}, date: localDateString(start), start: request.start, end: formatTime(end), workMinutes: cycleFor(request), breakEnabled: defaults.breakEnabled !== false, ...cycleSettings(request), actualSeconds: 0 };
    if (!validSession(session)) throw Error("Data o orario non valido.");
    if (+start < +now) throw Error("L\u2019orario " + request.start + " \xE8 gi\xE0 passato nel giorno scelto. Cambia giorno o orario.");
    applyPause(request, [session]);
    result.push(session);
  }
  if (hasSessionOverlaps([...existing, ...result])) throw Error("Gli orari indicati si sovrappongono a un\u2019altra sessione.");
  for (const request of requests.filter((r) => !r.start)) {
    const first = result.length;
    let left = request.minutes;
    for (const window2 of [...windows].sort((a, b) => sessionBounds(a).start - sessionBounds(b).start)) {
      const bounds = sessionBounds(window2);
      let cursor = Math.max(+bounds.start, Math.ceil(+now / 6e4) * 6e4);
      const occupied = [...existing, ...result].map(sessionBounds).sort((a, b) => a.start - b.start);
      const gaps = [];
      for (const block of occupied) {
        if (+block.end <= cursor || +block.start >= +bounds.end) continue;
        if (+block.start > cursor) gaps.push([cursor, Math.min(+block.start, +bounds.end)]);
        cursor = Math.max(cursor, +block.end);
      }
      if (cursor < +bounds.end) gaps.push([cursor, +bounds.end]);
      for (const [start, end] of gaps) {
        const minutes2 = Math.min(left, Math.floor((end - start) / 6e4), 1439);
        if (minutes2 <= 0) continue;
        const finish = new Date(start + minutes2 * 6e4);
        result.push({ id: id(), title: request.area, area: request.area, ...request.areaId ? { areaId: request.areaId } : {}, date: localDateString(new Date(start)), start: formatTime(new Date(start)), end: formatTime(finish), workMinutes: cycleFor(request), breakEnabled: defaults.breakEnabled !== false, ...cycleSettings(request), actualSeconds: 0 });
        left -= minutes2;
        if (!left) break;
      }
      if (!left) break;
    }
    if (!left) applyPause(request, result.slice(first));
    remainder += left;
  }
  if (hasSessionOverlaps([...existing, ...result])) throw Error("Le sessioni si sovrappongono.");
  return { sessions: result, remainder, unusedMinutes: requests.reduce((n, r) => n + (r.unusedMinutes || 0), 0) };
}
function parseQuick(text, areas) {
  return text.split("\n").flatMap((line, index) => {
    if (!line.trim()) return [];
    try {
      const input = line.trim();
      const range2 = input.match(/^(.+?)\s+\+\s*((?:[01]\d|2[0-3]):[0-5]\d)\s*-\s*((?:[01]\d|2[0-3]):[0-5]\d)\s+-\s*(\d+(?:[.,]\d+)?)\s*(m|h)$/i);
      if (range2) {
        const area2 = areas.find((a) => a.name.trim().replace(/\s+/g, " ").toLocaleLowerCase() === range2[1].trim().replace(/\s+/g, " ").toLocaleLowerCase());
        if (!area2) throw Error("Area sconosciuta: " + range2[1].trim() + ".");
        const minutesOf2 = (time2) => {
          const [hours, minutes3] = time2.split(":").map(Number);
          return hours * 60 + minutes3;
        };
        const timeOf = (minutes3) => String(Math.floor(minutes3 % 1440 / 60)).padStart(2, "0") + ":" + String(minutes3 % 60).padStart(2, "0");
        const from = minutesOf2(range2[2]), until = minutesOf2(range2[3]);
        const total = (until - from + 1440) % 1440, value = Number(range2[4].replace(",", ".")) * (range2[5].toLowerCase() === "h" ? 60 : 1);
        const each = Math.round(value);
        if (Math.abs(value - each) > 1e-9) throw Error("La durata lorda deve corrispondere a minuti interi.");
        if (!total) throw Error("La fascia deve avere inizio e fine diversi.");
        if (!Number.isInteger(each) || each < 1 || each > 1439) throw Error("La durata lorda di una sessione deve essere da 1 a 1439 minuti.");
        const sessions = [];
        if (each > total) throw Error("La fascia \xE8 pi\xF9 breve di una sessione lorda da " + each + " minuti.");
        for (let consumed = 0; consumed + each <= total; consumed += each) {
          const at = from + consumed;
          sessions.push({ area: area2.name, ...area2.id ? { areaId: area2.id } : {}, minutes: each, cycleMinutes: each, rangeSession: true, start: timeOf(at), ...at >= 1440 ? { dayOffset: 1 } : {} });
        }
        if (total % each) sessions[sessions.length - 1].unusedMinutes = total % each;
        return sessions;
      }
      const match = input.match(/^(.+?)\s+@(\d+(?:[.,]\d+)?)\s*(h|min|m)(.*)$/i);
      if (!match) throw Error("Usa: Studio +14:00-16:00 -30m oppure Studio @2h +14:00 -60m.");
      const area = areas.find((a) => a.name.toLocaleLowerCase() === match[1].trim().toLocaleLowerCase());
      const minutes2 = Math.round(Number(match[2].replace(",", ".")) * (match[3].toLowerCase() === "h" ? 60 : 1));
      if (!area || minutes2 < 1 || minutes2 > 10080) throw Error("Controlla area e durata lorda (da 1 minuto a 168 ore).");
      let start, focusMinutes, customBreakMinutes, cycleMinutes;
      for (const token of match[4].trim().split(/\s+/).filter(Boolean)) {
        if (/^\+([01]\d|2[0-3]):[0-5]\d$/.test(token) && !start)
          start = token.slice(1);
        else if (/^~\d{1,3}m?$/i.test(token) && focusMinutes === void 0)
          focusMinutes = focusCycle(Number(token.slice(1).replace(/m$/i, ""))).focusMinutes;
        else if (/^-\d{1,3}m?$/i.test(token) && cycleMinutes === void 0) {
          cycleMinutes = Number(token.slice(1).replace(/m$/i, ""));
          grossCycle(cycleMinutes);
        } else if (/^!\d{1,4}m?$/i.test(token) && customBreakMinutes === void 0)
          customBreakMinutes = customPause(Number(token.slice(1).replace(/m$/i, "")), minutes2);
        else throw Error("Opzione non valida: " + token + ". Usa +HH:MM, -60m (pomodoro lordo), ~40m (focus) o !5m (pausa finale).");
      }
      if (cycleMinutes !== void 0 && (focusMinutes !== void 0 || customBreakMinutes !== void 0))
        throw Error("Non combinare -minuti con ~focus o !pausa finale.");
      return [{ area: area.name, ...area.id ? { areaId: area.id } : {}, minutes: minutes2, ...cycleMinutes !== void 0 ? { cycleMinutes } : {}, ...start ? { start } : {}, ...focusMinutes !== void 0 ? { focusMinutes } : {}, ...customBreakMinutes !== void 0 ? { customBreakMinutes } : {} }];
    } catch (error) {
      throw Error("Riga " + (index + 1) + ": " + error.message);
    }
  });
}
function measuredFocus(session, from, to, maxGap = 15e3) {
  if (to - from <= 0 || to - from > maxGap || session.paused || session.finished) return 0;
  const bounds = sessionBounds(session);
  let cursor = Math.max(+from, +bounds.start), end = Math.min(+to, +bounds.end), total = 0;
  while (cursor < end) {
    const phase = getPhase(session, new Date(cursor));
    const next = Math.min(end, +phase.end);
    if (next <= cursor) break;
    if (phase.kind === "work") total += next - cursor;
    cursor = next;
  }
  return total / 1e3;
}

// obsidian/notes-integration.js
var wiki = /!?\[\[([^\]\n]+)\]\]/g;
var markdown = /\[([^\]\n]+)\]\(([^)\n]+)\)/g;
function noteLinks(description = "") {
  const found = [], seen = /* @__PURE__ */ new Set();
  const add = (target, label) => {
    target = String(target || "").trim();
    if (!target || /^(?:https?:|javascript:|data:|file:)/i.test(target)) return;
    if (target.startsWith("obsidian://open?")) {
      try {
        const url = new URL(target);
        target = url.searchParams.get("file") || "";
      } catch {
        return;
      }
    } else if (target.includes("://")) return;
    if (!target) return;
    const key2 = target.toLowerCase();
    if (seen.has(key2)) return;
    seen.add(key2);
    found.push({ path: target, label: String(label || target).trim() || target });
  };
  for (const m of String(description).matchAll(wiki)) {
    const [path, alias] = m[1].split("|");
    add(path, alias || path);
  }
  for (const m of String(description).matchAll(markdown)) add(m[2], m[1]);
  return found;
}

// obsidian/area-register.js
var quantity = "(\\d+(?:[.,]\\d+)?)([hms]?)";
var time = "((?:[01]\\d|2[0-3]):[0-5]\\d)";
var areaLine = new RegExp("^([^-].*?)\\s+(@|=\\s*)" + quantity + "$", "i");
function matchBudgetHeading(line) {
  const match = line.trim().match(areaLine);
  if (!match || match[1].includes("[[") || match[2] !== "@" && match[1].includes("@")) return null;
  const [, name, operator, value, unit] = match;
  return { name: name.trim(), value, unit, legacy: operator === "@" };
}
var taskLine = new RegExp("^-\\s*(\\[\\[[^\\]\\[]+\\]\\])\\s+@" + quantity + "\\s*=\\s*(\\d+)(?:\\s+\\+" + time + ")?$", "i");
var timedTask = new RegExp("^-\\s*(\\[\\[[^\\]\\[]+\\]\\])\\s+@" + quantity + "\\s*=\\s*(\\d+)\\s+(\\d[^@]*?)(?:\\s+@(.+))?$", "i");
var clockRange = new RegExp("^" + time + "\\s*-\\s*" + time + "$");
var minuteOf = (clock3) => Number(clock3.slice(0, 2)) * 60 + Number(clock3.slice(3));
function timedSlots(match, budget, areas, sourceRow) {
  const [, link, value, unit, count, ranges, areaName] = match;
  const area = areaName ? areas.find((a) => a.name.toLowerCase() === areaName.toLowerCase()) : budget ? { name: budget.area, id: budget.areaId } : areas[0];
  if (!area) throw Error("Indica un\u2019area valida.");
  const linkedNotes = noteLinks(link);
  const parts = ranges.split(";");
  if (parts.length !== Number(count)) throw Error("Il numero di fasce orarie deve corrispondere al numero di sessioni.");
  let afterMidnight = false;
  const slots = parts.map((part) => {
    const range2 = clockRange.exec(part.trim());
    if (!range2 || range2[1] === range2[2]) throw Error("Usa fasce HH:MM-HH:MM con inizio e fine distinti.");
    const [, start, end] = range2, delta = minuteOf(end) - minuteOf(start);
    const dayOffset = afterMidnight ? 1 : 0;
    if (delta < 0) afterMidnight = true;
    return { area: area.name, areaId: area.id, linkedNotes, sourceRow, start, end, dayOffset, minutes: delta < 0 ? 1440 + delta : delta };
  });
  if (slots.reduce((total, slot) => total + slot.minutes * 60, 0) !== secondsOf(value, unit))
    throw Error("La somma delle fasce orarie deve corrispondere alla durata lorda della riga.");
  return slots;
}
var plannedTask = /^-\s*(?:(\[\[[^\]\[]+\]\])\s+)?@(\d+(?:[.,]\d+)?)([hms]?)(?:\s+\+((?:[01]\d|2[0-3]):[0-5]\d)(?::([0-5]\d(?:\.\d{1,3})?))?)?(?:\s+-(\d+)m)?(?:\s+~(\d+)m)?(?:\s+!(\d+)m)?(?:\s+(\+1d))?(?:\s+@(.+?))?$/i;
var compactTask = /^-\s*((?:\[\[[^\[\]]+\]\]\s+)+)(\d+(?:[.,]\d+)?)([hms])(?:\s*=\s*(\d+))?(?:\s+\+((?:[01]\d|2[0-3]):[0-5]\d))?\s+@(.+?)$/i;
var possibleTask = new RegExp("^-?\\s*(\\[\\[[^\\]\\[]+\\]\\])\\s*[@*]?\\s*" + quantity + "\\s*=?\\s+(\\d+)(?:\\s*\\+?\\s*" + time + ")?$", "i");
var possibleArea = new RegExp("^(.+?)\\s+[@*]?" + quantity + "$", "i");
var isAreaRegister = (source) => source?.split(/\r?\n/).some((line) => {
  const text = expandDailyLine(line.replace(/\s+<!-- tempvs-allocation:[\w-]+ -->\s*$/, "").trim());
  return matchBudgetHeading(text) || plannedTask.test(text) || /^\s*-?\s*\[\[.*\]\]\s+[@*\d]/.test(text) || !/[+=]/.test(text) && !text.startsWith("@") && possibleArea.test(text);
});
function readableDuration(seconds) {
  const h = Math.floor(seconds / 3600), m = Math.floor(seconds % 3600 / 60), s = Math.round(seconds % 60);
  return [h && h + " h", m && m + " min", s && s + " s"].filter(Boolean).join(" ") || "0 min";
}
function secondsOf(value, unit) {
  const seconds = Math.round(Number(value.replace(",", ".")) * { s: 1, m: 60, h: 3600 }[(unit || "h").toLowerCase()] * 1e7) / 1e7;
  if (!Number.isSafeInteger(seconds) || seconds < 1) throw Error("Usa una durata positiva esprimibile in secondi interi.");
  return seconds;
}
function suggestion(line) {
  const task = line.match(possibleTask);
  if (task) return "- " + task[1] + " @" + task[2] + task[3] + " = " + task[4] + (task[5] ? " +" + task[5] : "");
  const incomplete = line.match(new RegExp("^-?\\s*(\\[\\[[^\\]\\[]+\\]\\])\\s+[@*]?" + quantity + "$", "i"));
  if (incomplete) return "- " + incomplete[1] + " @" + incomplete[2] + incomplete[3] + " = 1";
  const area = line.match(possibleArea);
  return area ? area[1] + " = " + area[2] + area[3] : "- [[Nota]] @1h = 2 +14:00";
}
function parseAreaRegister(source, areas) {
  const budgets = [], slots = [];
  let budget;
  for (const [index, raw] of source.split(/\r?\n/).entries()) {
    const line = expandDailyLine(raw.replace(/\s+<!-- tempvs-allocation:[\w-]+ -->\s*$/, "").trim());
    if (isReminder(line) || !line || /^date:\s*\d{4}-\d\d-\d\d$/i.test(line) || /^<!-- tempvs-block:[\w-]+ -->$/.test(line)) continue;
    try {
      const heading = matchBudgetHeading(line);
      if (heading) {
        const area2 = areas.find((a) => a.name.toLowerCase() === heading.name.toLowerCase());
        if (!area2) throw Error("Area sconosciuta. Aree disponibili: " + areas.map((a) => a.name).join(", "));
        budget = { area: area2.name, areaId: area2.id, seconds: secondsOf(heading.value, heading.unit), assigned: 0 };
        if (budgets.some((item) => item.areaId === area2.id)) throw Error("Indica un solo budget per area e giorno.");
        budgets.push(budget);
        continue;
      }
      const timed = line.match(timedTask);
      if (timed) {
        slots.push(...timedSlots(timed, budget, areas, index));
        continue;
      }
      const planned = line.match(plannedTask);
      if (planned) {
        const [, link2, value2, unit2, start2, secondsPart, cycle, focus, pause, nextDay, explicitArea] = planned;
        const area2 = explicitArea ? areas.find((item) => item.name.toLowerCase() === explicitArea.trim().toLowerCase()) : budget;
        if (!area2) throw Error("Indica un\u2019area valida sopra l\u2019assegnazione o sulla stessa riga.");
        const seconds2 = secondsOf(value2, unit2), minutes2 = seconds2 / 60;
        if (focus && (Number(focus) < 1 || Number(focus) > 240) || pause && Number(pause) >= minutes2 || cycle && (focus || pause)) throw Error("Controlla focus e pausa della sessione.");
        if (!Number.isInteger(minutes2) || minutes2 > 1440) throw Error("Usa una durata da 1 a 1439 minuti interi.");
        const linkedNotes2 = noteLinks(link2);
        if (link2 && !linkedNotes2.length) throw Error("Wikilink non valido.");
        slots.push({
          area: area2.name || area2.area,
          areaId: area2.id || area2.areaId,
          minutes: minutes2,
          linkedNotes: linkedNotes2,
          start: start2 || null,
          planned: true,
          sourceRow: index,
          offset: Number(secondsPart || 0),
          dayOffset: nextDay ? 1 : 0,
          ...focus ? { focusMinutes: Number(focus) } : {},
          ...pause ? { customBreakMinutes: Number(pause) } : {},
          ...cycle ? { cycleMinutes: Number(cycle) } : {}
        });
        continue;
      }
      if (/^[^-].*?\s+\+\s*\d\d:\d\d\s*-/.test(line)) {
        const links = line.match(/\[\[[^\[\]]+\]\]/g) || [];
        const range2 = line.replace(/\[\[[^\[\]]+\]\]/g, "").trim();
        for (const slot of parseQuick(range2, areas)) slots.push({ ...slot, sourceRow: index, linkedNotes: noteLinks(links.join(" ")) });
        continue;
      }
      if (/^[^-].*?\s+@.*?\s+\+\d\d:\d\d/.test(line)) {
        const links = line.match(/\[\[[^\[\]]+\]\]/g) || [];
        for (const slot of parseQuick(line.replace(/\[\[[^\[\]]+\]\]/g, "").trim(), areas))
          slots.push({ ...slot, linkedNotes: noteLinks(links.join(" ")), planned: true, sourceRow: index });
        continue;
      }
      const compact = line.match(compactTask);
      if (!compact && line.startsWith("-") && line.includes("]]") && !/\]\]\s+[@*]/.test(line)) {
        throw Error("Indica la durata con unit\xE0 e l\u2019area sulla stessa riga, per esempio 11:45 30m Studio [[Nota]].");
      }
      if (!compact && (line.match(/\[\[/g) || []).length > 1) throw Error("Nel vecchio formato usa un solo wikilink per riga.");
      const task = compact || line.match(taskLine);
      if (!task) throw Error("Sintassi da correggere. Prova: " + suggestion(line));
      const area = compact ? areas.find((a) => a.name.toLowerCase() === compact[6].trim().toLowerCase()) : budget || areas[0];
      if (compact && !area) throw Error("Area sconosciuta: " + compact[6]);
      if (!area) throw Error("Indica l\u2019area sulla riga, per esempio 30m Studio [[Nota]].");
      const [, link, value, unit, countText] = task, linkedNotes = noteLinks(link);
      if (!linkedNotes.length) throw Error("Indica una nota tra parentesi quadre doppie.");
      const seconds = secondsOf(value, unit), count = Number(countText ?? 1);
      if (count < 1 || count > seconds || count > 86400) throw Error("Indica almeno un pomodoro, con almeno un secondo ciascuno (massimo 86400).");
      const start = task[5];
      let offset = 0;
      for (let i = 0; i < count; i++) {
        const duration2 = Math.floor(seconds / count) + Number(i < seconds % count);
        slots.push({ area: area.name || area.area, areaId: area.id || area.areaId, sourceRow: index, minutes: duration2 / 60, linkedNotes, start: start || null, offset });
        offset += duration2;
      }
    } catch (error) {
      throw Error("Riga " + (index + 1) + ": " + error.message);
    }
  }
  const byArea = new Map(budgets.map((item) => [item.areaId, item]));
  for (const slot of slots) {
    const target = byArea.get(slot.areaId);
    if (target) target.assigned += Math.round(slot.minutes * 60);
  }
  return { budgets, slots };
}

// obsidian/daily-register.js
var clock = "(?:[01]\\d|2[0-3]):[0-5]\\d";
var header = new RegExp("^(.+?)\\s+@(\\d+(?:[.,]\\d+)?)\\s*([hm])(?:\\s+(" + clock + "))?\\s*=\\s*(\\d+)$", "i");
var assignment = new RegExp("^-\\s*(?:(" + clock + ")\\s*)?(\\[\\[[^\\]\\n]+\\]\\])?$");
var isRegister = (source) => isAreaRegister(source) || /^\s*[^\n]+\s+@[\d.,]+\s*[hm]\b[^\n]*=\s*\d+\s*$/im.test(source || "");
var minutesOf = (time2) => Number(time2.slice(0, 2)) * 60 + Number(time2.slice(3));
function parseRegister(source, areas) {
  const groups = [];
  for (const [index, raw] of source.split(/\r?\n/).entries()) {
    const line = raw.trim();
    if (isReminder(line) || !line || /^date:\s*\d{4}-\d\d-\d\d$/i.test(line) || /^<!-- tempvs-block:[\w-]+ -->$/.test(line)) continue;
    const fail = (message) => {
      throw Error("Riga " + (index + 1) + ": " + message);
    };
    const match = line.match(header);
    if (match) {
      const [, name, value, unit, start, countText] = match;
      const area = areas.find((a) => a.name.toLowerCase() === name.trim().toLowerCase());
      if (!area) fail("Area sconosciuta: " + name);
      const minutes2 = Math.round(Number(value.replace(",", ".")) * (unit.toLowerCase() === "h" ? 60 : 1) * 1e8) / 1e8, count = Number(countText);
      if (!Number.isInteger(minutes2) || minutes2 < 1 || minutes2 > 1440 || count < 1 || count > minutes2) fail("Controlla durata e numero di sessioni: occorre almeno un minuto per sessione, entro 24 ore.");
      groups.push({ area, minutes: minutes2, count, start, items: [] });
      continue;
    }
    const item = line.match(assignment), group = groups.at(-1);
    if (!item || !group) fail("Usa Area @2h 14:00 = 4 oppure - [[Nota]].");
    if (group.items.length >= group.count) fail("Le righe superano il numero di sessioni dichiarate.");
    const links = noteLinks(item[2]);
    if (item[2] && !links.length) fail("Wikilink non valido.");
    group.items.push({ time: item[1], links });
  }
  return groups.flatMap(({ area, minutes: minutes2, count, start, items }) => {
    let cursor = start ? minutesOf(start) : null;
    return Array.from({ length: count }, (_, i) => {
      const duration2 = Math.floor(minutes2 / count) + Number(i < minutes2 % count), item = items[i];
      if (item?.time) cursor = minutesOf(item.time) + (cursor >= 1440 ? 1440 : 0);
      const time2 = cursor === null ? null : String(Math.floor(cursor / 60) % 24).padStart(2, "0") + ":" + String(cursor % 60).padStart(2, "0");
      const slot = { area: area.name, areaId: area.id, minutes: duration2, start: time2, dayOffset: cursor >= 1440 ? 1 : 0, linkedNotes: item?.links || [] };
      if (cursor !== null) cursor += duration2;
      return slot;
    });
  });
}
function registerPlan({ source, date, blockId, state, id, planningKey: planningKey2 }) {
  const areas = state.defaults.simple.areas;
  const { slots, budgets } = isAreaRegister(source) ? parseAreaRegister(source, areas) : { slots: parseRegister(source, areas), budgets: [] };
  const sessions = [], records = [], claimed = /* @__PURE__ */ new Set();
  const previous = state.history.filter((h) => h.registerBlock === blockId);
  for (const [index, slot] of slots.entries()) {
    const day = /* @__PURE__ */ new Date(date + "T12:00:00");
    day.setDate(day.getDate() + (slot.dayOffset || 0));
    const start = slot.start ? new Date(+dateTime(localDateString(day), slot.start) + (slot.offset || 0) * 1e3) : null;
    const clock3 = (t) => [t.getHours(), t.getMinutes()].map((n) => String(n).padStart(2, "0")).join(":");
    const dayText = localDateString(start || day), startTime = start && clock3(start);
    const exact = (s) => s.date === dayText && +sessionBounds(s).start === +start && s.areaId === slot.areaId && sessionBounds(s).end - sessionBounds(s).start === Math.round(slot.minutes * 6e4);
    const match = slot.start && state.sessions.find((s) => !s.manualSuperseded && !s.dailyRetired && !claimed.has(s.id) && (!s.noteBlockId || s.noteBlockId === blockId) && exact(s));
    const sameNote = (h) => h.area === slot.area && (h.linkedNotes?.[0]?.path || "") === (slot.linkedNotes?.[0]?.path || "");
    const old = slot.planned ? previous.find((h) => h.planned && h.slotIndex === index && !claimed.has(h.sessionId) && sameNote(h)) || previous.find((h) => h.planned && !claimed.has(h.sessionId) && sameNote(h)) : previous.find((h) => h.slotIndex === index && !h.planned);
    const sessionId = match?.id || (old && !claimed.has(old.sessionId) ? old.sessionId : id());
    claimed.add(sessionId);
    const record = {
      sessionId,
      registerBlock: blockId,
      noteBlockId: blockId,
      slotIndex: index,
      date: dayText,
      registerDay: date,
      sourceRow: slot.sourceRow,
      title: slot.area,
      area: slot.area,
      areaId: slot.areaId,
      start: startTime && start.getSeconds() ? startTime + ":" + String(start.getSeconds()).padStart(2, "0") : startTime,
      ...slot.end ? { end: slot.end } : {},
      minutes: slot.minutes,
      measured: !slot.planned,
      linkedNotes: slot.linkedNotes,
      ...slot.planned ? { planned: true, sourceRow: slot.sourceRow } : {}
    };
    records.push(record);
    const chosenCycle = slot.cycleMinutes !== void 0 ? grossCycle(slot.cycleMinutes) : null;
    if (slot.start) {
      const end = new Date(+start + Math.round(slot.minutes * 6e4));
      const precise = { timerStartedAt: start.toISOString(), timerEndsAt: end.toISOString() };
      const cycle = Number.isInteger(slot.minutes) && slot.minutes < 1440 ? { cycleMinutes: slot.minutes, workMinutes: slot.minutes * 5 / 6 } : { workMinutes: 25 };
      const plannedCycle = slot.planned ? chosenCycle ? { cycleMinutes: slot.cycleMinutes, workMinutes: chosenCycle.focusMinutes, breakEnabled: true } : {
        workMinutes: slot.focusMinutes ?? state.defaults.workMinutes,
        breakEnabled: state.defaults.breakEnabled,
        ...slot.customBreakMinutes !== void 0 ? { customBreakMinutes: slot.customBreakMinutes } : {}
      } : null;
      sessions.push({
        id: sessionId,
        title: slot.area,
        area: slot.area,
        areaId: slot.areaId,
        date: dayText,
        start: startTime,
        end: clock3(end),
        ...precise,
        breakEnabled: true,
        noteBlockId: blockId,
        linkedNotes: slot.linkedNotes,
        ...plannedCycle ? { ...plannedCycle, registerPlanned: true } : { ...cycle, registerMinutes: slot.minutes }
      });
    }
  }
  const other = state.sessions.filter((s) => !claimed.has(s.id) && s.noteBlockId !== blockId && !s.dailyRetired && !s.manualSuperseded);
  if (hasSessionOverlaps(sessions) || sessions.some((s) => other.some((t) => sessionsOverlap(s, t)))) throw Error("Gli orari si sovrappongono. Correggi gli intervalli indicati.");
  const removeIds = state.sessions.filter((s) => s.noteBlockId === blockId && !sessions.some((t) => t.id === s.id)).map((s) => s.id);
  return { source, date, blockId, planningKey: planningKey2, sessions, records, budgets, removeIds, retainedIds: [], unusedMinutes: slots.reduce((sum, slot) => sum + (slot.unusedMinutes || 0), 0) };
}
function applyRegister(state, plan) {
  const replaced = /* @__PURE__ */ new Set([...plan.removeIds, ...plan.records.map((r) => r.sessionId)]);
  const existing = new Map(state.sessions.map((s) => [s.id, s]));
  state.sessions = state.sessions.filter((s) => !replaced.has(s.id)).concat(plan.sessions.map((s) => {
    const old = existing.get(s.id);
    const sameTime = old?.timerStartedAt === s.timerStartedAt && old?.timerEndsAt === s.timerEndsAt;
    return {
      ...s,
      actualSeconds: old?.actualSeconds || 0,
      ...sameTime ? { finished: old.finished, paused: old.paused, noteWork: old.noteWork } : {}
    };
  }));
  const obsolete = state.history.filter((h) => (h.registerBlock === plan.blockId || replaced.has(h.sessionId)) && !plan.records.some((r) => r.sessionId === h.sessionId)).map((h) => h.sessionId);
  state.history = state.history.filter((h) => h.registerBlock !== plan.blockId && !replaced.has(h.sessionId)).concat(plan.records);
  for (const [key2, removed, live] of [["history", obsolete, plan.records.map((r) => r.sessionId)], ["sessions", plan.removeIds, plan.sessions.map((s) => s.id)]]) {
    state.syncDeleted[key2] = [.../* @__PURE__ */ new Set([...state.syncDeleted[key2] || [], ...removed])].filter((id) => !live.includes(id));
  }
}
function creditedWork(state, resolve, bindingPath, byArea, { includePlannedIntervals = true, dailyOnly = false } = {}) {
  const totals = /* @__PURE__ */ new Map(), records = new Map(state.history.map((h) => [h.sessionId, h]));
  for (const s of state.sessions) if (!records.get(s.id)?.registerBlock || records.get(s.id)?.planned) records.set(s.id, s);
  const estimates = state.defaults.simple.noteEstimates || {};
  const add = (path, seconds, source, area) => {
    if (!path || !(seconds > 0)) return;
    const target = path.split("#")[0], key2 = resolve(target, source) || target.replace(/\.md$/i, "") + ".md";
    if (byArea && area) {
      if (!byArea.has(key2)) byArea.set(key2, /* @__PURE__ */ new Map());
      const rows = byArea.get(key2);
      rows.set(area, (rows.get(area) || 0) + seconds);
    }
    totals.set(key2, (totals.get(key2) || 0) + seconds);
  };
  if (dailyOnly) {
    const registered = /* @__PURE__ */ new Set();
    for (const row3 of state.history) {
      if (!row3.registerBlock || !bindingPath(row3.registerBlock)) continue;
      registered.add(row3.sessionId);
      add(row3.linkedNotes?.[0]?.path, row3.minutes * 60, bindingPath(row3.registerBlock), row3.area);
    }
    for (const s of state.sessions) {
      if (registered.has(s.id) || !s.noteBlockId || s.dailyRetired || s.manualSuperseded || !bindingPath(s.noteBlockId)) continue;
      const bounds = sessionBounds(s);
      add(s.linkedNotes?.[0]?.path, (bounds.end - bounds.start) / 1e3, bindingPath(s.noteBlockId), s.area);
    }
    return totals;
  }
  for (const r of records.values()) {
    if (r.planned || r.dailyRetired || r.manualSuperseded) continue;
    const source = bindingPath(r.noteBlockId) || "";
    const linked = r.linkedNotes?.[0]?.path || estimates[r.noteEstimateId]?.path;
    if (r.registerBlock || includePlannedIntervals && !r.registerPlanned && r.noteBlockId && r.start && r.end) {
      add(linked, r.registerBlock ? r.minutes * 60 : (sessionBounds(r).end - sessionBounds(r).start) / 1e3, source, r.area);
    } else {
      let allocated = 0;
      for (const [id, seconds] of Object.entries(r.noteWork || {})) {
        allocated += seconds;
        add(estimates[id]?.path, seconds, source, r.area);
      }
      add(linked, (r.actualSeconds ?? (r.measured ? r.minutes * 60 : 0)) - allocated, source, r.area);
    }
  }
  return totals;
}

// obsidian/daily-plan.js
var blockPattern = /^\s*<!-- tempvs-block:([^\s>]+) -->\s*$/;
var rowPattern = /\s*<!-- tempvs-session:([^\s>]+)(?: day:([01]))? -->\s*$/;
var datePattern = /^\s*date:\s*(\d{4}-\d{2}-\d{2})\s*$/i;
function validDay(day) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day || "")) return false;
  const d = /* @__PURE__ */ new Date(day + "T12:00:00");
  return Number.isFinite(+d) && localDateString(d) === day;
}
function blockIdentity(source) {
  const ids = source.split(/\r?\n/).map((line) => line.match(blockPattern)?.[1]).filter(Boolean);
  if (ids.length > 1) throw Error("Il blocco contiene pi\xF9 identificativi TEMPVS.");
  if (ids[0] && !/^[A-Za-z0-9-]{1,100}$/.test(ids[0])) throw Error("Identificativo del blocco TEMPVS non valido.");
  return ids[0] || null;
}
function explicitDay(source) {
  const dates = source.split(/\r?\n/).map((line) => line.match(datePattern)?.[1]).filter(Boolean);
  if (dates.length > 1) throw Error("Indica una sola data nel blocco TEMPVS.");
  if (dates[0] && !validDay(dates[0])) throw Error("Data TEMPVS non valida.");
  return dates[0] || null;
}
function resolveDailyDate(source, file, { format = "YYYY-MM-DD", moment: moment2, frontmatter } = {}) {
  const explicit = explicitDay(source);
  if (explicit) return explicit;
  if (validDay(file.basename)) return file.basename;
  const raw = frontmatter?.date;
  if (typeof raw === "string" && validDay(raw.slice(0, 10))) return raw.slice(0, 10);
  if (raw instanceof Date && Number.isFinite(+raw)) return localDateString(raw);
  if (moment2) {
    const parsed = moment2(file.basename, format, true);
    if (parsed.isValid()) return parsed.format("YYYY-MM-DD");
  }
  throw Error("Data della daily note non riconosciuta. Aggiungi \xABdate: YYYY-MM-DD\xBB al blocco TEMPVS.");
}
function findDailyBlocks(markdown2, includeUnclosed = false, language2 = /^(tempvs|tempus)$/i) {
  const lines = markdown2.match(/[^\n]*\n|[^\n]+$/g) || [];
  let fence = null, offset = 0;
  const blocks = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/\r?\n$/, "");
    if (!fence) {
      const match = line.match(/^ {0,3}(`{3,}|~{3,})([^\r\n]*)$/);
      if (match) {
        fence = { char: match[1][0], length: match[1].length, start: offset + lines[i].length, line: i, isTempvs: language2.test(match[2].trim()) };
      }
    } else if (new RegExp("^ {0,3}" + fence.char + "{" + fence.length + ",}\\s*$").test(line)) {
      if (fence.isTempvs) blocks.push({ start: fence.start, end: offset, lineStart: fence.line, source: markdown2.slice(fence.start, offset).replace(/\r?\n$/, "") });
      fence = null;
    }
    offset += lines[i].length;
  }
  if (includeUnclosed && fence?.isTempvs) blocks.push({ start: fence.start, end: markdown2.length, lineStart: fence.line, source: markdown2.slice(fence.start) });
  return blocks;
}
function replaceDailyBlock(markdown2, block, source) {
  const newline = markdown2.includes("\r\n") ? "\r\n" : "\n";
  return markdown2.slice(0, block.start) + source.replace(/\r?\n/g, newline) + newline + markdown2.slice(block.end);
}
function parseDailySource(source, areas) {
  blockIdentity(source);
  explicitDay(source);
  const requests = [];
  const used = /* @__PURE__ */ new Set();
  for (const [index, line] of source.split(/\r?\n/).entries()) {
    if (isReminder(line) || !line.trim() || blockPattern.test(line) || datePattern.test(line)) continue;
    try {
      const metadata = line.match(rowPattern), raw = metadata ? line.slice(0, metadata.index) : line;
      const linkedNotes = noteLinks(raw.match(/\[\[[^\]\n]+\]\]/g)?.join(" ") || "");
      const planning = raw.replace(/\[\[[^\]\n]+\]\]/g, "").trim();
      if (/\[\[|\]\]/.test(planning)) throw Error("Collegamento nota non valido: usa [[nota|titolo]].");
      const nextDay = /\s+\+1d\s*$/i.test(planning), input = planning.replace(/\s+\+1d\s*$/i, "");
      const rows = parseQuick(expandRange(input), areas);
      const id = metadata ? decodeURIComponent(metadata[1]) : null;
      if (id && (used.has(id) || rows.length !== 1)) throw Error("Ogni identificativo deve riferirsi a una sola sessione, senza duplicati.");
      if (id) used.add(id);
      for (const row3 of rows) {
        if (!row3.start) throw Error("Indica una fascia +HH:MM-HH:MM oppure un inizio +HH:MM.");
        const dayOffset = (row3.dayOffset || 0) + Number(nextDay ? 1 : metadata?.[2] || 0);
        if (dayOffset > 1) throw Error("La sessione deve iniziare nella giornata della nota o in quella successiva.");
        requests.push({ ...row3, linkedNotes, sourceRow: index, ...id ? { sessionId: id } : {}, ...dayOffset ? { dayOffset } : {} });
      }
    } catch (error) {
      throw Error("Riga " + (index + 1) + ": " + error.message.replace(/^Riga 1: /, ""));
    }
  }
  return requests;
}
var dayAfter = (day) => {
  const d = /* @__PURE__ */ new Date(day + "T12:00:00");
  d.setDate(d.getDate() + 1);
  return localDateString(d);
};
var planningKey = (session) => JSON.stringify([session.id, session.areaId, session.area, session.title, session.date, session.start, session.end, session.workMinutes, session.breakEnabled, session.customBreakMinutes, session.cycleMinutes, session.noteBlockId, session.linkedNotes, Boolean(session.finished), session.timerStartedAt, session.timerEndsAt, session.manualRecordedAt, Boolean(session.manualSuperseded), Boolean(session.dailyRetired)]);
var archivePlanningKey = (state) => JSON.stringify({ sessions: state.sessions.map(planningKey), defaults: state.defaults });
var isLocked = (session, now = /* @__PURE__ */ new Date()) => session.finished || session.actualSeconds > 0 || session.timerStartedAt || sessionBounds(session).start <= now;
function daySessions(state, date, blockId) {
  return state.sessions.filter((s) => !s.manualSuperseded && !s.dailyRetired && (s.date === date || blockId && s.noteBlockId === blockId)).sort((a, b) => sessionBounds(a).start - sessionBounds(b).start);
}
function serializeDailyPlan(sessions, date, source = "") {
  const timeFirst = source.split(/\r?\n/).some(usesTimeRange);
  const short = source.split(/\r?\n/).some((line) => expandRange(line.trim()) !== line.trim());
  const groups = [];
  for (const s of [...sessions].sort((a, b) => sessionBounds(a).start - sessionBounds(b).start)) {
    if (s.date !== date && s.date !== dayAfter(date)) throw Error("Una sessione collegata \xE8 stata spostata fuori dalla giornata della nota.");
    const bounds = sessionBounds(s), gross = Math.round((bounds.end - bounds.start) / 6e4);
    const key2 = JSON.stringify([s.areaId, s.area || s.title, gross, s.workMinutes, s.breakEnabled, s.customBreakMinutes, s.cycleMinutes, s.linkedNotes || []]);
    const last = groups.at(-1);
    if (last && last.key === key2 && +last.until === +bounds.start && s.date === last.date && +bounds.end - last.from < 864e5) {
      last.end = s.end;
      last.until = bounds.end;
    } else groups.push({ key: key2, linkedNotes: s.linkedNotes || [], date: s.date, area: s.area || s.title, start: s.start, end: s.end, gross, from: +bounds.start, until: bounds.end });
  }
  const rows = groups.map((g) => (g.gross === 1440 ? `${g.area} @1440m +${g.start}` : timeFirst ? `${g.start}-${g.end} ${g.gross}m ${g.area}` : `${g.area} ${short ? "" : "+"}${g.start}-${g.end} ${short ? "" : "-"}${g.gross}m`) + g.linkedNotes.map((n) => " [[" + n.path + (n.label && n.label !== n.path ? "|" + n.label : "") + "]]").join("") + (g.date !== date ? " +1d" : ""));
  for (const [index, line] of source.split(/\r?\n/).entries()) if (isReminder(line)) rows.splice(Math.min(index, rows.length), 0, line);
  return rows.join("\n");
}
function rowChanges(source, previousSource, areas, owned, date) {
  if (previousSource === void 0) return { byRequest: /* @__PURE__ */ new Map(), changedRows: /* @__PURE__ */ new Set(), previousByRow: /* @__PURE__ */ new Map(), addedRows: /* @__PURE__ */ new Set() };
  const previous = parseDailySource(previousSource, areas), next = parseDailySource(source, areas);
  const group = (_text, requests) => [...new Set(requests.map((r) => r.sourceRow))].map((row3) => {
    const items = requests.filter((r) => r.sourceRow === row3);
    return { row: row3, text: JSON.stringify(items.map((r) => [r.areaId || r.area, r.minutes, r.start, r.dayOffset || 0, r.cycleMinutes ?? null, r.focusMinutes ?? null, r.customBreakMinutes ?? null])), requests: items };
  });
  const before = group(previousSource, previous), after = group(source, next), matched = /* @__PURE__ */ new Set(), remaining = [];
  for (const current of after) {
    const index = before.findIndex((old2, i) => !matched.has(i) && old2.text === current.text);
    if (index >= 0) matched.add(index);
    else remaining.push(current);
  }
  const old = before.filter((_, i) => !matched.has(i)), byRequest = /* @__PURE__ */ new Map(), changedRows = /* @__PURE__ */ new Set(), previousByRow = /* @__PURE__ */ new Map(), addedRows = new Set(remaining.map((r) => r.row));
  for (let i = 0; i < Math.min(old.length, remaining.length); i++) {
    changedRows.add(remaining[i].row);
    const ids = old[i].requests.map((r) => owned.find((s) => !s.manualSuperseded && !s.dailyRetired && s.date === (r.dayOffset ? dayAfter(date) : date) && s.start === r.start && (s.areaId ? s.areaId === r.areaId : s.area === r.area) && Math.round((sessionBounds(s).end - sessionBounds(s).start) / 6e4) === r.minutes)?.id);
    previousByRow.set(remaining[i].row, ids.filter(Boolean));
    remaining[i].requests.forEach((r, index) => {
      if (ids[index]) byRequest.set(r, ids[index]);
    });
  }
  const indexed = /* @__PURE__ */ new Map();
  for (const [request, id] of byRequest) indexed.set(request.sourceRow + ":" + next.filter((r) => r.sourceRow === request.sourceRow).indexOf(request), id);
  return { byRequest: indexed, changedRows, previousByRow, addedRows };
}
function recordedFocusSeconds(session, until = /* @__PURE__ */ new Date()) {
  const bounds = sessionBounds(session);
  let at = +bounds.start, total = 0, end = Math.min(+bounds.end, +until);
  while (at < end) {
    const phase = getPhase(session, new Date(at)), next = Math.min(end, +phase.end);
    if (next <= at) break;
    if (phase.kind === "work") total += (next - at) / 1e3;
    at = next;
  }
  return total;
}
function manualRecord(session, now) {
  const result = { ...session, actualSeconds: recordedFocusSeconds(session, now), actualSource: "manual", manualRecordedAt: now.toISOString() };
  result.finished = sessionBounds(session).end <= now;
  return result;
}
function originalRecord(session) {
  if (session.manualOriginal) return session.manualOriginal;
  const { manualOriginal, ...original } = session;
  return JSON.parse(JSON.stringify(original));
}
function correctNoteWork(previous, seconds) {
  const work = previous?.noteWork || {}, total = Object.values(work).reduce((n, s) => n + s, 0);
  if (total > 0) {
    const baseline = Math.max(previous.actualSeconds || 0, total);
    return Object.fromEntries(Object.entries(work).map(([id, s]) => [id, s * seconds / baseline]));
  }
  return previous?.noteEstimateId ? { [previous.noteEstimateId]: seconds } : {};
}
function prepareDailyPlan({ source, date, blockId, state, previousSource, protectedBlockIds, now = /* @__PURE__ */ new Date(), id = () => globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + "-" + Math.random().toString(36).slice(2) }) {
  if (!validDay(date)) throw Error("Data non valida.");
  const register = isRegister(source) || !source.split(/\r?\n/).some((line) => line.trim() && !isReminder(line) && !datePattern.test(line) && !blockPattern.test(line)) && isRegister(previousSource);
  if (register) {
    blockIdentity(source);
    explicitDay(source);
    return { ...registerPlan({ source, date, blockId, state, id, planningKey: archivePlanningKey(state) }), previousSource, protectedBlockIds };
  }
  const areas = state.defaults.simple.areas, requests = parseDailySource(source, areas), owned = state.sessions.filter((s) => s.noteBlockId === blockId);
  const protectedBlocks = protectedBlockIds === void 0 ? null : new Set(protectedBlockIds);
  const foreign = (s) => s.noteBlockId && s.noteBlockId !== blockId && (protectedBlocks === null || protectedBlocks.has(s.noteBlockId));
  const changes = rowChanges(source, isRegister(previousSource) ? void 0 : previousSource, areas, owned, date), positions = /* @__PURE__ */ new Map();
  const candidates = [], claimed = /* @__PURE__ */ new Set(), correctionIds = [], correctedRows = /* @__PURE__ */ new Set();
  for (const request of requests) {
    const dateOf = request.dayOffset ? dayAfter(date) : date, start = dateTime(dateOf, request.start), elapsed = start <= now;
    const position = positions.get(request.sourceRow) || 0;
    positions.set(request.sourceRow, position + 1);
    let existing = request.sessionId ? state.sessions.find((s) => s.id === request.sessionId) : null;
    if (request.sessionId && !existing) {
      if (state.syncDeleted?.sessions?.includes(request.sessionId)) throw Error("La nota contiene una sessione eliminata dal plugin. Aggiorna prima il blocco dalle sessioni.");
      throw Error("Identificativo sessione non presente nel plugin. Rimuovi il commento identificativo per creare una nuova sessione.");
    }
    const exact = (s) => s.date === dateOf && s.start === request.start && (s.areaId ? s.areaId === request.areaId : s.area === request.area) && Math.round((sessionBounds(s).end - sessionBounds(s).start) / 6e4) === request.minutes;
    if (!existing && elapsed) {
      const matched = changes.byRequest.get(request.sourceRow + ":" + position);
      existing = owned.find((s) => s.id === matched && !claimed.has(s.id));
    }
    if (!existing) existing = state.sessions.find((s) => !claimed.has(s.id) && !s.manualSuperseded && !s.dailyRetired && !foreign(s) && exact(s));
    if (existing && foreign(existing)) throw Error("Una sessione appartiene gi\xE0 a un altro blocco TEMPVS.");
    if (existing && claimed.has(existing.id)) throw Error("La stessa sessione compare due volte nel blocco.");
    const legacy = existing?.linkedNotes === void 0 && state.defaults.simple.noteEstimates?.[existing?.noteEstimateId];
    if (legacy && !request.linkedNotes.length) request.linkedNotes = [{ path: legacy.path, label: legacy.title }];
    const samePause = existing && (!request.cycleMinutes || request.rangeSession || request.cycleMinutes === existing.cycleMinutes) && (request.focusMinutes === void 0 || request.focusMinutes === existing.workMinutes) && (request.customBreakMinutes === void 0 || request.customBreakMinutes === existing.customBreakMinutes);
    const correction = elapsed && (!existing || !exact(existing) || !samePause || changes.changedRows.has(request.sourceRow) || changes.addedRows.has(request.sourceRow));
    if (existing && isLocked(existing, now) && !correction && exact(existing) && samePause) {
      candidates.push({ ...existing, noteBlockId: blockId, linkedNotes: request.linkedNotes, noteEstimateId: void 0 });
      claimed.add(existing.id);
      continue;
    }
    const result = planSessions([request], [], [], state.defaults, new Date(Math.min(+now, +start)), () => existing?.id || id(), date);
    let session = result.sessions[0];
    if (existing) {
      session = { ...existing, ...session };
      if (request.cycleMinutes !== void 0) delete session.customBreakMinutes;
      if (request.focusMinutes !== void 0 || request.customBreakMinutes !== void 0) delete session.cycleMinutes;
      if (request.cycleMinutes === void 0 && request.focusMinutes === void 0 && request.customBreakMinutes === void 0) {
        for (const key2 of ["workMinutes", "breakEnabled", "cycleMinutes", "customBreakMinutes"]) if (existing[key2] !== void 0) session[key2] = existing[key2];
      }
      if (!exact(existing) || correction) {
        delete session.timerStartedAt;
        delete session.timerEndsAt;
      }
    }
    delete session.dailyRetired;
    session.noteBlockId = blockId;
    session.linkedNotes = request.linkedNotes;
    delete session.noteEstimateId;
    if (correction) {
      delete session.manualSuperseded;
      session = manualRecord(session, now);
      if (existing) session.manualOriginal = originalRecord(existing);
      correctionIds.push(session.id);
      correctedRows.add(request.sourceRow);
    }
    candidates.push(session);
    claimed.add(session.id);
  }
  if (hasSessionOverlaps(candidates)) throw Error("Le righe della nota si sovrappongono tra loro.");
  const intersects = (s) => candidates.some((c) => sessionsOverlap(s, c));
  const omitted = state.sessions.filter((s) => !claimed.has(s.id) && !foreign(s) && (s.noteBlockId === blockId || s.date === date || intersects(s)));
  const previousCorrected = new Set([...correctedRows].flatMap((row3) => changes.previousByRow.get(row3) || []));
  const superseded = omitted.filter((s) => isLocked(s, now) && (previousCorrected.has(s.id) || intersects(s) || s.manualSuperseded) && (!s.dailyRetired && !s.manualSuperseded || s.actualSeconds > 0 || Object.values(s.noteWork || {}).some((n) => n > 0)));
  const retainedIds = omitted.filter((s) => isLocked(s, now)).map((s) => s.id);
  const retireIds = omitted.filter((s) => (!s.dailyRetired || !s.finished || s.paused) && isLocked(s, now)).map((s) => s.id);
  const removed = omitted.filter((s) => !isLocked(s, now));
  const reconciled = new Set(omitted.map((s) => s.id));
  const other = state.sessions.filter((s) => !claimed.has(s.id) && !removed.some((r) => r.id === s.id) && !superseded.some((r) => r.id === s.id));
  const conflict = state.sessions.find((s) => !claimed.has(s.id) && !reconciled.has(s.id) && !s.dailyRetired && !s.manualSuperseded && intersects(s));
  if (conflict) throw Error("Un intervallo appartiene a un\u2019altra nota giornaliera collegata. Correggi anche quella nota.");
  normalizeArchive({ ...state, sessions: [...other, ...candidates] });
  return { date, blockId, sessions: candidates, correctionIds, supersededIds: superseded.map((s) => s.id), retainedIds, retireIds, removeIds: removed.map((s) => s.id), unusedMinutes: requests.reduce((n, r) => n + (r.unusedMinutes || 0), 0), planningKey: archivePlanningKey(state), recordedAt: now.toISOString(), source, previousSource, protectedBlockIds };
}
function applyDailyPlan(state, proposal) {
  if (proposal.records) {
    applyRegister(state, proposal);
    return;
  }
  const oldRecords = state.history.filter((h) => h.registerBlock === proposal.blockId);
  if (oldRecords.length) {
    state.history = state.history.filter((h) => h.registerBlock !== proposal.blockId);
    state.syncDeleted.history = [.../* @__PURE__ */ new Set([...state.syncDeleted.history || [], ...oldRecords.map((h) => h.sessionId)])];
  }
  const corrected = new Set(proposal.correctionIds || []), affected = /* @__PURE__ */ new Set([...proposal.sessions.map((s) => s.id), ...proposal.removeIds]), current = new Map(state.sessions.map((s) => [s.id, s]));
  state.sessions = state.sessions.filter((s) => !affected.has(s.id)).concat(proposal.sessions.map((s) => {
    const previous = current.get(s.id);
    if (corrected.has(s.id)) return { ...s, noteWork: correctNoteWork(previous || s, s.actualSeconds), ...previous ? { manualOriginal: originalRecord(previous), paused: previous.paused } : {} };
    return { ...s, ...previous ? { actualSeconds: previous.actualSeconds || 0, ...previous.noteWork ? { noteWork: previous.noteWork } : {}, paused: previous.paused } : {} };
  }));
  for (const session of state.sessions) if (proposal.retireIds?.includes(session.id)) {
    const { dailyOriginal, ...snapshot } = session;
    session.dailyOriginal = dailyOriginal || JSON.parse(JSON.stringify(snapshot));
    session.dailyRetired = true;
    session.finished = true;
    session.paused = false;
  }
  for (const session of state.sessions) if (proposal.supersededIds?.includes(session.id)) Object.assign(session, { manualOriginal: originalRecord(session), actualSeconds: 0, noteWork: {}, finished: true, manualSuperseded: true, manualRecordedAt: proposal.recordedAt, actualSource: "manual" });
  const historical = new Map(state.sessions.filter((s) => corrected.has(s.id) || proposal.supersededIds?.includes(s.id)).map((s) => [s.id, s]));
  state.history = state.history.map((h) => {
    const s = historical.get(h.sessionId);
    return s ? { ...h, title: s.title, date: s.date, area: s.area, areaId: s.areaId, minutes: s.actualSeconds / 60, measured: true, actualSource: "manual", noteWork: s.noteWork } : h;
  });
  state.syncDeleted.sessions = [.../* @__PURE__ */ new Set([...state.syncDeleted.sessions, ...proposal.removeIds])];
}

// obsidian/note-ledger.js
var isLedger = (source) => /^\s*T:/im.test(source);
var row = /^\s*T:\s*(\d+(?:[.,]\d+)?)([hms]?)(?:\s*\/\s*(\d+(?:[.,]\d+)?)([hms]))?\s+@(.+?)\s*$/i;
var scale = { h: 3600, m: 60, s: 1 };
function duration(seconds) {
  const total = Math.round(seconds);
  for (const [unit, factor] of Object.entries(scale)) {
    if (total % factor === 0) return { value: total / factor, unit };
  }
}
function updateLedger(markdown2, totals) {
  const blocks = findDailyBlocks(markdown2, true), ledgers = blocks.filter((b) => isLedger(b.source));
  if (ledgers.length > 1) throw Error("Riunisci i totali T: in un solo blocco TEMPVS.");
  if (blocks.length !== findDailyBlocks(markdown2).length) throw Error("Chiudi il blocco TEMPVS prima di aggiornare il totale.");
  const block = ledgers[0];
  if (!block && blocks.some((b) => isActivitySource(b.source))) return markdown2;
  const remaining = new Map([...totals].map(([area, seconds]) => [area.toLowerCase(), { area, seconds }]));
  const seen = /* @__PURE__ */ new Set(), lines = [];
  function format(area, seconds, target, unit, explicitUnit) {
    const done = duration(seconds);
    const left = done.value + (target && !explicitUnit && done.unit === unit ? "" : done.unit);
    return "T: " + left + (target ? "/" + target + unit : "") + " @" + area;
  }
  for (const line of block?.source.split(/\r?\n/) || []) {
    if (!line.trim()) {
      lines.push(line);
      continue;
    }
    const match = line.match(row);
    if (!match || !match[2] && !match[4]) throw Error("Usa T: 1h @Studio oppure T: 1/7h @Studio.");
    const [, , , target, unit, area] = match, key2 = area.toLowerCase();
    if (seen.has(key2)) throw Error("Indica un solo totale per area.");
    seen.add(key2);
    lines.push(format(area, remaining.get(key2)?.seconds || 0, target, unit, match[2] === unit));
    remaining.delete(key2);
  }
  for (const { area, seconds } of remaining.values()) lines.push(format(area, seconds));
  const source = lines.join("\n");
  if (block) return source === block.source.replace(/\r\n/g, "\n") ? markdown2 : replaceDailyBlock(markdown2, block, source);
  if (!lines.length) return markdown2;
  const empty = blocks.find((b) => !b.source.trim());
  if (empty && findDailyBlocks(markdown2).some((b) => b.start === empty.start)) return replaceDailyBlock(markdown2, empty, source);
  const nl = markdown2.includes("\r\n") ? "\r\n" : "\n";
  return markdown2 + (markdown2.endsWith(nl) ? nl : nl + nl) + "```TEMPVS" + nl + lines.join(nl) + nl + "```" + nl;
}

// obsidian/google-calendar.js
var pad = (n) => String(n).padStart(2, "0");
var clock2 = (d) => pad(d.getHours()) + ":" + pad(d.getMinutes());
var minutes = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
var safe = (s) => String(s ?? "").replace(/[\r\n\t]+/g, " ").trim();
var row2 = /^Calendar · (Tutto il giorno|\d\d:\d\d–\d\d:\d\d) · (.*?) <!-- gcal:([\w-]+)(?: area:([^ ]+))? -->$/;
function calendarRows(source = "") {
  return source.split(/\r?\n/).flatMap((line) => {
    const m = row2.exec(line);
    if (!m) return [];
    return [{ line, time: m[1], title: m[2], key: m[3], area: m[4] || "", minutes: m[1].includes("\u2013") ? minutes(m[1].slice(6)) - minutes(m[1].slice(0, 5)) : 0 }];
  });
}
function calendarAddress(raw) {
  const u = new URL(raw.trim());
  if (u.origin !== "https://calendar.google.com" || !/^\/calendar\/ical\/[^/]+\/(private-[\w-]+|public)\/basic\.ics$/.test(u.pathname) || u.username || u.password || u.search || u.hash)
    throw Error("Inserisci l\u2019indirizzo iCal di Google Calendar.");
  return { url: u.href, calendar: u.pathname.split("/")[3] };
}
var encode = (s) => btoa(Array.from(new TextEncoder().encode(s), (c) => String.fromCharCode(c)).join("")).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
function expandCalendar(ics, calendar, days) {
  const component = new ICALmodule.Component(ICALmodule.parse(ics));
  if (component.name !== "vcalendar") throw Error("Risposta iCal non valida.");
  const windows = [...new Set(days)].sort().map((day) => {
    const start = /* @__PURE__ */ new Date(day + "T00:00:00"), end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { day, start, end };
  });
  const result = new Map(windows.map((w) => [w.day, /* @__PURE__ */ new Map()]));
  if (!windows.length) return result;
  const last = windows.at(-1).end;
  const events = component.getAllSubcomponents("vevent").map((c) => new ICALmodule.Event(c, { exceptions: [] }));
  const keyPrefix = encode(calendar) + "-";
  function add(event, identity2, startTime, endTime) {
    if (event.component.getFirstPropertyValue("status") === "CANCELLED") return;
    const start = startTime.toJSDate(), end = endTime.toJSDate();
    const key2 = keyPrefix + encode(JSON.stringify([event.uid, identity2]));
    for (const w of windows) {
      if (start >= w.end || end < w.start || end <= w.start && +end !== +start) continue;
      const from = new Date(Math.max(+start, +w.start)), until = new Date(Math.min(+end, +w.end));
      const time2 = startTime.isDate ? "Tutto il giorno" : clock2(from) + "\u2013" + (+until === +w.end ? "24:00" : clock2(until));
      result.get(w.day).set(key2, { key: key2, time: time2, title: safe(event.summary) || "Evento senza titolo" });
    }
  }
  const exceptions = events.filter((e) => e.isRecurrenceException());
  for (const e of exceptions) if (e.component.getFirstPropertyValue("status") !== "CANCELLED") add(e, e.recurrenceId.toString(), e.startDate, e.endDate);
  for (const e of events.filter((e2) => !e2.isRecurrenceException())) {
    if (e.component.getFirstPropertyValue("status") === "CANCELLED") continue;
    if (!e.isRecurring()) {
      add(e, "", e.startDate, e.endDate);
      continue;
    }
    const overrides = new Set(exceptions.filter((x) => x.uid === e.uid).map((x) => x.recurrenceId.toUnixTime()));
    const iterator = e.iterator();
    let t, n = 0;
    while ((t = iterator.next()) && t.toJSDate() < last) {
      if (++n > 25e4) throw Error("La serie ricorrente supera il limite di importazione.");
      if (overrides.has(t.toUnixTime())) continue;
      const end = t.clone();
      end.addDuration(e.duration);
      add(e, t.toString(), t, end);
    }
  }
  return result;
}
function formatRow(e, area = "") {
  return "Calendar \xB7 " + e.time + " \xB7 " + e.title + " <!-- gcal:" + e.key + (area ? " area:" + area : "") + " -->";
}
function seenMarker(calendar) {
  return new RegExp("^<!-- tempvs-gcal-seen:" + encode(calendar) + " ([\\w,\\-]*) -->$", "m");
}
function reconcile(markdown2, calendar, events, priorAreas = /* @__PURE__ */ new Map(), removed = /* @__PURE__ */ new Set()) {
  const blocks = findDailyBlocks(markdown2).filter((b) => !isLedger(b.source));
  if (blocks.length > 1 || findDailyBlocks(markdown2, true).length !== findDailyBlocks(markdown2).length) throw Error("Controlla i blocchi TEMPVS nella daily.");
  const block = blocks[0], source = block?.source || "", prefix = encode(calendar) + "-";
  if (block && isEstimateSource(source)) throw Error("La daily contiene un blocco di stima.");
  const marker = seenMarker(calendar);
  const old = markdown2.match(marker), seen = new Set(old?.[1].split(",").filter(Boolean) || []);
  const added = /* @__PURE__ */ new Set(), lines = [];
  for (const line of source.split(/\r?\n/)) {
    const m = row2.exec(line);
    if (!m || !m[3].startsWith(prefix)) {
      lines.push(line);
      continue;
    }
    const e = events.get(m[3]);
    if (e) {
      lines.push(formatRow(e, m[4]));
      added.add(e.key);
      seen.add(e.key);
    } else seen.delete(m[3]);
  }
  for (const [key2, e] of events) if (!added.has(key2) && !seen.has(key2) && !removed.has(key2)) {
    lines.push(formatRow(e, priorAreas.get(key2)));
    seen.add(key2);
  }
  const next = lines.join("\n").replace(/^\n(?=Calendar · )/, "");
  let out = markdown2;
  if (next !== source) out = block ? replaceDailyBlock(out, block, next) : out + "\n\n```TEMPVS\n" + next + "\n```\n";
  const stamp = "<!-- tempvs-gcal-seen:" + encode(calendar) + " " + [...seen].join(",") + " -->";
  if (!block && next && !findDailyBlocks(out).length) throw Error("Chiudi il blocco di codice aperto nella daily.");
  if (old) return out.replace(marker, stamp);
  return seen.size ? out + (out.endsWith("\n") ? "\n" : "\n\n") + stamp + "\n" : out;
}
function changeRow(source, key2, area) {
  return source.split(/\r?\n/).flatMap((line) => {
    const m = row2.exec(line);
    if (m?.[3] !== key2) return [line];
    return area === null ? [] : [formatRow({ time: m[1], title: m[2], key: key2 }, area)];
  }).join("\n");
}
var CalendarImport = class {
  constructor(plugin, fetchText) {
    this.plugin = plugin;
    this.fetchText = fetchText;
  }
  sync() {
    if (!this.running) this.running = this.run().finally(() => {
      this.running = null;
    });
    return this.running;
  }
  async run() {
    const p = this.plugin;
    await p.daily.ready;
    const days = /* @__PURE__ */ new Map();
    for (const file of p.app.vault.getMarkdownFiles()) {
      const day = p.daily.panelDay(file);
      if (day && day >= p.calendar.since && p.daily.dailyLocation(day).file?.path === file.path) days.set(day, file);
    }
    if (!days.size) return;
    const failures = [];
    for (const raw of p.calendar.urls) {
      try {
        const { url, calendar } = calendarAddress(raw);
        const events = expandCalendar(await this.fetchText(url), calendar, days.keys());
        const priorAreas = /* @__PURE__ */ new Map(), removed = /* @__PURE__ */ new Set();
        for (const file of days.values()) {
          const text = await p.daily.readMarkdown(file);
          const rows = calendarRows(findDailyBlocks(text).find((b) => !isLedger(b.source))?.source);
          const present = new Set(rows.map((e) => e.key));
          for (const e of rows) if (e.area) priorAreas.set(e.key, e.area);
          for (const key2 of text.match(seenMarker(calendar))?.[1].split(",") || [])
            if (key2 && !present.has(key2)) removed.add(key2);
        }
        for (const [day, file] of days) {
          if (p.daily.destroyed || !p.calendar.urls.includes(raw)) break;
          await p.daily.queue(async () => {
            if (p.daily.destroyed || p.app.vault.getAbstractFileByPath(file.path) !== file) return;
            const before = await p.daily.readMarkdown(file);
            const after = reconcile(before, calendar, events.get(day), priorAreas, removed);
            if (after !== before) await p.daily.replaceAllocationText(file, before, after);
          });
        }
      } catch {
        failures.push(calendarAddress(raw).calendar);
      }
    }
    if (failures.length) throw Error("Aggiornamento incompleto per " + failures.length + " calendari. Verifica i link e riprova dopo il salvataggio delle note.");
  }
};

// obsidian/main.js
var import_obsidian6 = require("obsidian");

// obsidian/syntax.js
var tokens = /^\s*T:|(?<=\s)@[^\d\s][^\n]*$|<!--.*?(?:-->|$)|\[\[[^\]]*(?:\]\]|$)|^\s*date:(?=\s|$)|\b\d{4}-\d{2}-\d{2}\b|\+?\d{2}:\d{2}(?:-\d{2}:\d{2})?|\bx\d+\b|=\s*\d+|\b\d+(?:[.,]\d+)?[hms]\b|[@~-]\d+(?:[.,]\d+)?[hms]?|^\s*-(?=\s|$)/gi;
function syntaxTokens(line) {
  const budget = matchBudgetHeading(line);
  if (budget && !budget.legacy) {
    const from = line.search(/\S/);
    const separator = line.indexOf("=", from + budget.name.length);
    const duration2 = separator + 1 + line.slice(separator + 1).search(/\S/);
    return [
      { from, to: from + budget.name.length, kind: "area" },
      { from: separator, to: separator + 1, kind: "punctuation" },
      { from: duration2, to: line.trimEnd().length, kind: "duration" }
    ];
  }
  const parts = [];
  const add = (from, to, kind) => {
    if (to > from) parts.push({ from, to, kind });
  };
  const area = timeFirstArea(line);
  const heading = line.match(/^(\s*)(@?[^@+\-=\s\d][^@+\[\]=]*?)(?=\s+(?:[@+]|\d))/);
  let offset = 0;
  if (heading && !/^\s*(?:date|T):/i.test(line)) {
    offset = heading[0].length;
    add(heading[1].length, offset, "area");
  }
  for (const match of line.slice(offset).matchAll(tokens)) {
    const value = match[0], from = offset + match.index, end = from + value.length;
    if (area && from >= area.from && from < area.to) continue;
    if (value.startsWith("[[")) {
      const closed = value.endsWith("]]"), targetEnd = closed ? end - 2 : end;
      const alias = value.indexOf("|"), anchor = value.indexOf("#");
      const separator = alias < 0 ? targetEnd : from + alias;
      const section = anchor >= 0 && from + anchor < separator ? from + anchor : separator;
      add(from, from + 2, "punctuation");
      add(from + 2, section, "link");
      add(section, separator, "section");
      if (alias >= 0) {
        add(separator, separator + 1, "punctuation");
        add(separator + 1, targetEnd, "alias");
      }
      add(targetEnd, end, "punctuation");
    } else {
      let kind = "duration";
      if (/^@[^\d]/.test(value)) kind = "area";
      else if (value.trim().toUpperCase() === "T:") kind = "keyword";
      else if (value.startsWith("<!--")) kind = "comment";
      else if (value.includes(":")) kind = /date:/i.test(value) ? "keyword" : "time";
      else if (/^\d{4}-/.test(value)) kind = "date";
      else if (/^(?:=|x\d)/i.test(value)) kind = "count";
      else if (value.trim() === "-") kind = "punctuation";
      add(from, end, kind);
    }
  }
  if (area) {
    parts.push({ ...area, kind: "area" });
    parts.sort((a, b) => a.from - b.from);
  }
  return parts;
}
function wikiTokens(line) {
  return Array.from(line.matchAll(/\[\[([^\[\]\n|]+)(?:\|([^\[\]\n]*))?\]\]/g), (match) => ({
    from: match.index,
    to: match.index + match[0].length,
    target: match[1].trim(),
    label: match[2]?.trim() || match[1].trim(),
    kind: "wiki"
  })).filter((token) => token.target);
}
function renderSyntaxLine(parent, line, areas, openLink) {
  let cursor = 0;
  const links = wikiTokens(line);
  const styles = syntaxTokens(line).filter((token) => !links.some((link) => link.from < token.to && link.to > token.from));
  for (const { from, to, kind, target, label } of [...styles, ...links].sort((a, b) => a.from - b.from)) {
    parent.append(line.slice(cursor, from));
    const value = line.slice(from, to);
    if (kind === "wiki") {
      const anchor = parent.createEl("a", { cls: "internal-link", text: label, attr: { href: "#", "data-href": target } });
      anchor.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        openLink(target, event.metaKey || event.ctrlKey);
      });
      cursor = to;
      continue;
    }
    const span = parent.createSpan({ text: value, cls: "tempvs-syntax-" + kind });
    if (kind === "area") {
      const area = areas.find((a) => a.name.toLowerCase() === value.replace(/^@/, "").toLowerCase());
      if (area) {
        span.addClass("tempvs-area-mark");
        span.style.setProperty("--tempvs-area-color", area.color);
      }
    }
    cursor = to;
  }
  parent.append(line.slice(cursor));
}

// obsidian/syntax-editor.js
function syntaxExtension() {
  const { Decoration, ViewPlugin } = require("@codemirror/view");
  return ViewPlugin.fromClass(class {
    constructor(view) {
      this.rebuild(view, true);
    }
    update(update) {
      if (update.docChanged || update.viewportChanged) this.rebuild(update.view, update.docChanged);
    }
    rebuild(view, documentChanged) {
      const doc = view.state.doc;
      if (documentChanged) this.blocks = findDailyBlocks(doc.toString(), true);
      const marks = [];
      for (const block of this.blocks) {
        for (const visible of view.visibleRanges) {
          const from = Math.max(block.start, visible.from), to = Math.min(block.end, visible.to);
          if (from >= to) continue;
          const first = doc.lineAt(from).number, last = doc.lineAt(to - 1).number;
          for (let n = first; n <= last; n++) {
            const line = doc.line(n);
            for (const token of syntaxTokens(line.text)) {
              const start = Math.max(from, line.from + token.from), end = Math.min(to, line.from + token.to);
              if (start < end) marks.push(Decoration.mark({ class: "tempvs-syntax-" + token.kind }).range(start, end));
            }
          }
        }
      }
      this.decorations = Decoration.set(marks, true);
    }
  }, {
    decorations: (instance) => instance.decorations,
    eventHandlers: { mousedown(event, view) {
      if (event.button !== 0 || !(event.metaKey || event.ctrlKey)) return false;
      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
      if (pos == null || !this.blocks.some((block) => pos >= block.start && pos < block.end)) return false;
      const line = view.state.doc.lineAt(pos);
      const link = wikiTokens(line.text).find((token) => pos >= line.from + token.from && pos < line.from + token.to);
      const { editorInfoField, Notice: Notice7 } = require("obsidian");
      const info = view.state.field(editorInfoField, false);
      if (!link || !info?.file) return false;
      event.preventDefault();
      void info.app.workspace.openLinkText(link.target, info.file.path, false).catch((e) => new Notice7(e.message));
      return true;
    } }
  });
}

// obsidian/note-picker.js
var import_obsidian = require("obsidian");
var fold = (text) => String(text).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
var safeLabel = (text) => String(text).replace(/[\r\n|\[\]]/g, " ").trim();
var SessionNotePicker = class extends import_obsidian.Modal {
  constructor(app, save) {
    super(app);
    this.save = save;
    this.activeFile = app.workspace.getActiveFile?.() || app.workspace.getMostRecentLeaf?.()?.view?.file;
  }
  onOpen() {
    this.contentEl.addClass("tempvs-picker");
    this.files = (this.app.vault?.getMarkdownFiles?.() || []).map((file) => {
      const meta = this.app.metadataCache?.getFileCache(file)?.frontmatter || {};
      const title = String(meta.title || file.basename);
      const aliases = [].concat(meta.aliases || meta.alias || []);
      return { file, title, search: fold([title, file.path, ...aliases].join(" ")) };
    });
    this.searchFiles();
  }
  choice(parent, title, action2, subtitle) {
    const button2 = parent.createEl("button", { attr: { type: "button" } });
    button2.createSpan({ text: title });
    if (subtitle) button2.createEl("small", { text: subtitle });
    button2.onclick = action2;
    return button2;
  }
  searchFiles() {
    const el = this.contentEl;
    el.empty();
    el.createEl("h3", { text: "Collega nota" });
    const input = el.createEl("input", { attr: { type: "search", "aria-label": "Cerca nota", placeholder: "Titolo, alias, nome file o [[wikilink]]" } });
    const results = el.createDiv({ cls: "tempvs-picker-results" });
    const render = () => {
      results.empty();
      const query = input.value.trim();
      if (query.startsWith("[[")) {
        this.choice(results, "Collega wikilink", () => this.commit(query), query);
        return;
      }
      const words = fold(query).split(/\s+/);
      const active = this.files.find((entry) => entry.file.path === this.activeFile?.path);
      if (!query && active) this.choice(results, "Usa la nota aperta", () => this.selectFile(active), active.title);
      const matches = this.files.filter((entry) => words.every((word) => entry.search.includes(word)));
      for (const entry of matches.slice(0, 50)) this.choice(results, entry.title, () => this.selectFile(entry), entry.file.path);
      if (!matches.length) results.createEl("p", { text: "Nessuna nota trovata." });
      if (matches.length > 50) results.createEl("small", { text: "Affina la ricerca per vedere altri risultati." });
    };
    input.oninput = render;
    input.onkeydown = (event) => {
      if (event.key === "Enter") results.querySelector("button")?.click();
      if (event.key === "ArrowDown") {
        event.preventDefault();
        results.querySelector("button")?.focus();
      }
    };
    render();
    input.focus();
  }
  selectFile({ file, title }) {
    const path = file.path.replace(/\.md$/i, "");
    const link = (target, label) => this.commit("[[" + target + "|" + safeLabel(label) + "]]");
    const headings = this.app.metadataCache?.getFileCache(file)?.headings || [];
    if (!headings.length) return link(path, title);
    const el = this.contentEl;
    el.empty();
    el.createEl("h3", { text: title });
    this.choice(el, "Collega nota intera", () => link(path, title)).focus();
    const results = el.createDiv({ cls: "tempvs-picker-results" });
    for (const { heading, level } of headings) {
      this.choice(results, heading, () => link(path + "#" + heading, heading), "H" + level);
    }
    this.choice(el, "Torna alla ricerca", () => this.searchFiles());
  }
  async commit(value) {
    if (this.saving) return;
    this.saving = true;
    try {
      await this.save(value);
      this.close();
    } catch (error) {
      new import_obsidian.Notice(error.message);
    } finally {
      this.saving = false;
    }
  }
  onClose() {
    this.contentEl.empty();
    this.files = [];
  }
};

// obsidian/session-notes.js
function sessionNotes(session, estimates = []) {
  if (session.linkedNotes?.length) return session.linkedNotes;
  const legacy = estimates.find((n) => n.id === session.noteEstimateId);
  return legacy ? [{ path: legacy.path, label: legacy.title }] : [];
}
function updatedSessionNotes(session, input, { removePath, primaryPath, replacePrimary = false, estimates = [] } = {}) {
  const previous = sessionNotes(session, estimates);
  if (removePath !== void 0) return previous.filter((n) => n.path !== removePath);
  if (primaryPath !== void 0) {
    const primary = previous.find((note) => note.path === primaryPath);
    return primary ? [primary, ...previous.filter((note) => note !== primary)] : previous;
  }
  const text = input.trim();
  if (!text) return replacePrimary ? previous.slice(1) : previous;
  const links = noteLinks(text.startsWith("[[") ? text : "[[" + text + "]]");
  if (links.length !== 1 || /[\r\n]/.test(text) || text.startsWith("[[") && !/^\[\[[^\]\n]+\]\]$/.test(text)) throw Error("Scegli una sola nota: [[nota|titolo]].");
  if (replacePrimary) return [links[0], ...previous.slice(1).filter((note) => note.path !== links[0].path)];
  return previous.some((note) => note.path === links[0].path) ? previous : [...previous, links[0]];
}
function groupSessions(sessions, estimates = []) {
  const groups = [];
  for (const session of sessions) {
    const notes = sessionNotes(session, estimates);
    const key2 = JSON.stringify([session.areaId || session.area || session.title, session.noteBlockId || "", session.date, notes]);
    const last = groups.at(-1);
    if (last && last.key === key2 && +sessionBounds(last.sessions.at(-1)).end === +sessionBounds(session).start) last.sessions.push(session);
    else groups.push({ key: key2, notes, sessions: [session] });
  }
  return groups;
}

// obsidian/note-estimates.js
var import_obsidian2 = require("obsidian");
var uid = () => globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
var action = (el, label, fn) => {
  const b = el.createEl("button", { text: label });
  b.onclick = () => Promise.resolve().then(fn).catch((e) => new import_obsidian2.Notice(e.message));
  return b;
};
var NoteEstimates = class {
  constructor(plugin) {
    this.plugin = plugin;
    this.preferences = /* @__PURE__ */ new Map();
  }
  get notes() {
    return estimatesOf(this.plugin.state);
  }
  get vault() {
    return this.plugin.app.vault?.getName?.() || "";
  }
  find(path) {
    return this.notes.find((n) => n.path === path && n.vault === this.vault);
  }
  async sync(context) {
    const { file, block } = context, { entries, completed } = parseNoteEstimate(block.source, this.plugin.config.areas), old = this.find(file.path);
    const activity2 = completed !== void 0;
    if (old && !old.archived && Boolean(old.activity) === activity2 && (!activity2 || old.completed === completed) && JSON.stringify(old.entries) === JSON.stringify(entries)) return;
    await this.plugin.change(() => {
      var _a;
      const notes = (_a = this.plugin.config).noteEstimates ?? (_a.noteEstimates = {});
      const preferred = "note:" + encodeURIComponent(this.vault) + "/" + encodeURIComponent(file.path);
      const id = old?.id || (notes[preferred] ? preferred + "/" + uid() : preferred);
      const note = notes[id] = { ...old, ...!old ? this.plugin.noteFlags?.[file.path] : {}, id, vault: this.vault, path: file.path, title: file.basename, entries, archived: false, completed: old?.completed || !old && this.plugin.noteFlags?.[file.path]?.completed || false };
      if (activity2) {
        note.activity = true;
        if (note.completed !== completed) {
          const live = completed ? this.liveProgress(note, this.totals(false)) : void 0;
          setEstimateCompleted(note, this.plugin.state, completed, live);
        }
      } else delete note.activity;
    });
  }
  async archive(path) {
    const note = this.find(path);
    if (!note || note.archived) return;
    await this.plugin.change(() => {
      this.plugin.config.noteEstimates[note.id].archived = true;
    });
  }
  available(session) {
    return this.notes.filter((n) => !n.archived && !n.completed && n.entries.some((e) => matchesArea(e, session)));
  }
  async assign(sessionId, noteId) {
    const note = this.notes.find((n) => n.id === noteId);
    await this.plugin.setSessionNote([sessionId], note ? "[[" + note.path + "|" + note.title + "]]" : "", { replacePrimary: true });
  }
  async assignDay(note, day) {
    const sessions = this.plugin.state.sessions.filter((s) => s.date === day && !s.linkedNotes?.length && !s.noteEstimateId && !s.finished && sessionBounds(s).start > /* @__PURE__ */ new Date() && note.entries.some((e) => matchesArea(e, s)));
    for (const s of sessions) await this.assign(s.id, note.id);
    new import_obsidian2.Notice(sessions.length ? `${sessions.length} sessioni collegate a ${note.title}.` : "Nessuna sessione futura libera.");
  }
  async start(note, entry) {
    if (entry.kind === "total") throw Error("La stima @14h non imposta un\u2019area: avvia una sessione dall\u2019agenda e collega la nota.");
    await this.plugin.start(entry.area, entry.minutes, 25, void 0, { path: note.path, label: note.title }, entry.minutes);
  }
  planStudy(note, area, minutes2) {
    const modal = new import_obsidian2.Modal(this.plugin.app);
    modal.onOpen = () => {
      modal.contentEl.createEl("h2", { text: "Assegna tempo di studio" });
      modal.contentEl.createEl("p", { text: note.title + " \xB7 " + area.name });
      const form = modal.contentEl.createEl("form", { cls: "tempvs-form" });
      const date = form.createEl("label", { text: "Giorno di studio" }).createEl("input", { attr: { type: "date", required: "", value: localDateString() } });
      const duration2 = form.createEl("label", { text: "Durata \xB7 minuti" }).createEl("input", { attr: { type: "number", required: "", min: "1", max: "1439", value: String(minutes2) } });
      const error = form.createDiv({ attr: { role: "alert" } });
      const save = form.createEl("button", { text: "Assegna tempo", cls: "mod-cta", attr: { type: "submit" } });
      form.onsubmit = async (event) => {
        event.preventDefault();
        if (save.disabled) return;
        save.disabled = true;
        try {
          await this.plugin.assignTime({ area: area.name, areaId: area.id, minutes: duration2.valueAsNumber }, date.value, { path: note.path, label: note.title });
          modal.close();
          new import_obsidian2.Notice("Tempo di studio assegnato al " + date.value + ".");
        } catch (e) {
          error.textContent = e.message;
        } finally {
          save.disabled = false;
        }
      };
    };
    modal.onClose = () => modal.contentEl.empty();
    modal.open();
  }
  totals(includePlannedIntervals = true) {
    const cache = this.plugin.app.metadataCache;
    return creditedWork(this.plugin.state, (p, source) => cache?.getFirstLinkpathDest?.(p, source)?.path, (id) => this.plugin.dailyNotes?.[id]?.path, void 0, { includePlannedIntervals, dailyOnly: true });
  }
  liveProgress(note, totals) {
    return { estimated: estimatedSeconds(note), done: totals.get(note.path) || 0 };
  }
  progress(note, totals) {
    return estimateProgress({ ...note, completion: void 0 }, this.plugin.state, { live: this.liveProgress(note, totals.legacy) });
  }
  progressTotals() {
    return { legacy: this.totals(), focus: this.totals(false) };
  }
  render(parent, note, day = localDateString(), panel = false, totals = this.progressTotals()) {
    const p = this.progress(note, totals), box = parent.createDiv({ cls: "tempvs-estimate" });
    if (panel) action(box, note.title, () => this.plugin.app.workspace.openLinkText(note.path, "", false));
    const names = [...new Set(note.entries.map((entry) => entry.area).filter(Boolean))];
    const time2 = note.activity ? compactEstimateTime(p.done) + "/" + compactEstimateTime(p.estimated) : "Tempo in daily " + estimateTime(p.done) + " su " + estimateTime(p.estimated);
    box.createEl("p", { text: (names.join(" / ") || "Tutte le aree") + " \xB7 " + time2 });
    box.createEl("strong", { text: estimateResult(note, p) });
    const actions = box.createDiv({ cls: "tempvs-estimate-actions" });
    const choices = this.preferences.get(note.id) || {};
    const areas = this.plugin.config.areas.filter((area2) => note.entries.some((entry) => matchesArea(entry, { area: area2.name, areaId: area2.id })));
    const area = areas.find((a) => a.id === choices.areaId) || areas[0];
    if (!note.completed && area) {
      action(actions, "Assegna tempo", () => this.planStudy(note, area, choices.minutes || 30));
      action(actions, "Avvia " + area.name, () => {
        const selected = areas.find((a) => a.id === choices.areaId) || area;
        return this.start(note, { area: selected.name, areaId: selected.id, minutes: choices.minutes || 30 });
      });
    }
    const menu = actions.createEl("details", { cls: "tempvs-estimate-menu" });
    menu.createEl("summary", { text: "\u22EF", attr: { "aria-label": "Azioni studio" } });
    if (!note.completed) {
      if (areas.length > 1) {
        const select = menu.createEl("select", { attr: { "aria-label": "Area di avvio" } });
        for (const a of areas) select.createEl("option", { text: a.name, attr: { value: a.id } });
        select.value = area.id;
        select.onchange = () => {
          choices.areaId = select.value;
          this.preferences.set(note.id, choices);
          this.plugin.refresh(true);
        };
      }
      const label = menu.createEl("label", { text: "Durata sessione " });
      const input = label.createEl("input", { attr: { type: "number", min: 1, max: 1439, value: choices.minutes || 30 } });
      input.onchange = () => {
        const minutes2 = input.valueAsNumber;
        if (!Number.isInteger(minutes2) || minutes2 < 1 || minutes2 > 1439) {
          input.value = String(choices.minutes || 30);
          new import_obsidian2.Notice("Scegli da 1 a 1439 minuti.");
          return;
        }
        choices.minutes = minutes2;
        this.preferences.set(note.id, choices);
      };
      action(menu, "Collega alle sessioni libere del giorno", () => this.assignDay(note, day));
    }
    action(menu, note.completed ? "Riapri attivit\xE0" : "Segna completata", () => {
      if (note.activity) return this.plugin.daily.toggleActivity(note.path, !note.completed);
      return this.plugin.change(() => {
        const current = this.plugin.config.noteEstimates[note.id];
        setEstimateCompleted(current, this.plugin.state, !current.completed, this.liveProgress(current, this.totals()));
      });
    });
    return box;
  }
  renderPanel(parent, day) {
    const open = new Set([...parent.querySelectorAll(".tempvs-estimate-details[open]")].map((el) => el.dataset.noteId));
    const menus = new Set([...parent.querySelectorAll(".tempvs-estimate-menu[open]")].map((el) => el.closest(".tempvs-estimate-details").dataset.noteId));
    parent.empty();
    const notes = this.notes.filter((n) => !n.archived);
    const totals = this.progressTotals(), estimatedPaths = new Set(notes.map((n) => n.path));
    if (!notes.length && !totals.legacy.size) return;
    parent.createEl("h4", { text: "Note e stime" });
    for (const [path, seconds] of totals.legacy) if (!estimatedPaths.has(path)) {
      const row3 = parent.createDiv();
      action(row3, path.split("/").pop().replace(/\.md$/i, ""), () => this.plugin.app.workspace.openLinkText(path, "", false));
      row3.createSpan({ text: " \xB7 " + estimateTime(seconds) });
    }
    for (const note of notes) {
      const details = parent.createEl("details", { cls: "tempvs-estimate-details" });
      details.dataset.noteId = note.id;
      details.open = open.has(note.id);
      details.createEl("summary", { text: note.title + " \xB7 " + (note.completed ? "completato" : Math.floor(this.progress(note, totals).percent) + "%") });
      this.render(details, note, day, true, totals);
      details.querySelector(".tempvs-estimate-menu").open = menus.has(note.id);
    }
  }
  selector(parent, session) {
    const notes = this.available(session), current = this.notes.find((n) => n.id === session.noteEstimateId);
    if (!notes.length && !current) return;
    if (current && !notes.includes(current)) notes.push(current);
    const select = parent.createEl("select", { cls: "tempvs-note-assignment", attr: { "aria-label": "Nota della sessione " + session.start } });
    select.createEl("option", { value: "", text: "Solo area \xB7 nessuna nota" });
    for (const n of notes) select.createEl("option", { value: n.id, text: n.title + (n.completed ? " (completata)" : "") });
    select.value = session.noteEstimateId || "";
    select.onchange = () => this.assign(session.id, select.value).catch((e) => new import_obsidian2.Notice(e.message));
  }
};

// obsidian/daily-allocations.js
var language = /^tempvs-assegnazioni$/i;
var identity = /\s+<!-- tempvs-allocation:([\w-]+) -->\s*$/;
function allocationBlock(markdown2) {
  const blocks = findDailyBlocks(markdown2, true, language);
  if (blocks.length !== findDailyBlocks(markdown2, false, language).length)
    throw Error("Chiudi il blocco TEMPVS delle assegnazioni.");
  if (blocks.length > 1) throw Error("Usa un solo blocco di assegnazioni TEMPVS per nota.");
  return blocks[0];
}
function readAllocations(block, file, date, areas) {
  const entries = [];
  for (const [index, raw] of (block?.source || "").split(/\r?\n/).entries()) {
    if (!raw.trim()) continue;
    const marker = raw.match(identity);
    const links = /\[\[[^\]\n]+\]\]/g;
    const row3 = raw.replace(identity, "");
    const [note] = noteLinks(row3.match(links)?.join(" "));
    try {
      const [request] = parseQuick(row3.replace(links, "").trim(), areas);
      if (!request || request.start || request.minutes > 1439)
        throw Error("Usa una durata da 1 a 1439 minuti senza orario.");
      entries.push({ ...request, id: marker?.[1] || file.path + ":" + index, date, note, file, raw, index });
    } catch (error) {
      throw Error("Assegnazione TEMPVS, riga " + (index + 1) + ": " + error.message);
    }
  }
  return entries;
}
function mergeAllocationBlocks(markdown2, file, date, areas) {
  const legacy = allocationBlock(markdown2);
  if (!legacy) return markdown2;
  const entries = readAllocations(legacy, file, date, areas);
  if (entries.some((entry) => entry.focusMinutes !== void 0 || entry.customBreakMinutes !== void 0))
    throw Error("Il blocco precedente contiene impostazioni di focus o pausa personalizzate.");
  const lines = markdown2.match(/[^\n]*\n|[^\n]+$/g) || [];
  const afterClosing = markdown2.indexOf("\n", legacy.end);
  const beforeOpening = lines.slice(0, legacy.lineStart).join("").length;
  const clean = markdown2.slice(0, beforeOpening) + markdown2.slice(afterClosing < 0 ? markdown2.length : afterClosing + 1);
  return entries.reduce((result, { id, ...entry }) => !id.includes(":") && findDailyBlocks(result)[0]?.source.includes("<!-- tempvs-allocation:" + id + " -->") ? result : appendUnifiedAllocation(result, { ...entry, id: id.includes(":") ? void 0 : id }), clean);
}
function unifiedAllocationRow({ area, minutes: minutes2, cycleMinutes, focusMinutes, customBreakMinutes, offsetMs, dayOffset, note, id, start }, explicitArea = true) {
  const wiki2 = note ? "[[" + note.path + (note.label && note.label !== note.path ? "|" + note.label : "") + "]] " : "";
  return "- " + wiki2 + "@" + minutes2 + "m" + (start ? " +" + start + (offsetMs ? ":" + (offsetMs / 1e3).toFixed(3).padStart(6, "0") : "") : "") + (cycleMinutes ? " -" + cycleMinutes + "m" : "") + (focusMinutes ? " ~" + focusMinutes + "m" : "") + (customBreakMinutes !== void 0 ? " !" + customBreakMinutes + "m" : "") + (dayOffset ? " +1d" : "") + (explicitArea ? " @" + area : "") + (id ? " <!-- tempvs-allocation:" + id + " -->" : "");
}
function appendUnifiedAllocation(markdown2, allocation) {
  const blocks = findDailyBlocks(markdown2, true);
  if (blocks.length !== findDailyBlocks(markdown2).length || blocks.length > 1)
    throw Error("Usa un solo blocco TEMPVS chiuso nella nota giornaliera.");
  const block = blocks[0];
  const lines = block?.source.split(/\r?\n/) || [];
  const at = lines.findIndex((line) => matchBudgetHeading(line)?.name.toLowerCase() === allocation.area.toLowerCase());
  let end = at + 1;
  while (at >= 0 && end < lines.length && !matchBudgetHeading(lines[end])) end++;
  lines.splice(at >= 0 ? end : lines.length, 0, unifiedAllocationRow(allocation, at < 0));
  const source = lines.join("\n");
  if (block) return replaceDailyBlock(markdown2, block, source);
  const nl = markdown2.includes("\r\n") ? "\r\n" : "\n";
  const next = (markdown2 ? markdown2 + (markdown2.endsWith(nl) ? nl : nl + nl) : "") + "```TEMPVS" + nl + source + nl + "```" + nl;
  if (!findDailyBlocks(next).length) throw Error("Chiudi il blocco di codice aperto nella nota.");
  return next;
}

// obsidian/daily-planner-modal.js
var import_obsidian3 = require("obsidian");
var DailyPlannerModal = class extends import_obsidian3.Modal {
  constructor(controller, file) {
    super(controller.plugin.app);
    this.controller = controller;
    this.file = file;
  }
  onOpen() {
    const { contentEl, file, controller } = this;
    contentEl.createEl("h2", { text: "Pianifica la giornata" });
    contentEl.createEl("small", { text: file.path });
    const form = contentEl.createEl("form", { cls: "tempvs-form" });
    const input = (name, type, attrs = {}) => {
      const label = form.createEl("label", { text: name });
      return label.createEl("input", { attr: { type, ...attrs } });
    };
    const start = input("Inizio", "time"), end = input("Fine", "time");
    const minutes2 = input("Durata lorda (minuti)", "number", { required: "", min: "1", step: "1", value: "30" });
    const area = form.createEl("label", { text: "Area" }).createEl("select", { attr: { required: "", "aria-label": "Area" } });
    for (const item of controller.plugin.state.defaults.simple.areas) area.createEl("option", { value: item.name, text: item.name });
    const note = input("Nota", "text", { placeholder: "Titolo oppure [[nota#sezione|alias]]" });
    const preview = form.createEl("code", { attr: { "aria-live": "polite" } });
    const error = form.createEl("div", { attr: { role: "alert" } });
    const save = form.createEl("button", { text: "Aggiungi alla giornata", cls: "mod-cta", attr: { type: "submit" } });
    const row3 = () => {
      const time2 = start.value + (end.value ? "-" + end.value : "");
      const name = note.value.trim();
      const link = name && !name.startsWith("[[") ? "[[" + name + "]]" : name;
      return [time2, minutes2.value && minutes2.value + "m", area.value, link].filter(Boolean).join(" ");
    };
    const refresh = () => {
      preview.textContent = row3();
      error.empty();
    };
    form.oninput = refresh;
    refresh();
    form.onsubmit = async (event) => {
      event.preventDefault();
      if (save.disabled) return;
      save.disabled = true;
      try {
        if (end.value && !start.value) throw Error("Indica anche l\u2019orario di inizio.");
        if (!end.value && !note.value.trim()) throw Error("Per una singola attivit\xE0 indica la nota, oppure completa la fascia oraria.");
        await controller.appendPlannerRow(file, row3());
        this.close();
        new import_obsidian3.Notice("Riga aggiunta alla nota quotidiana.");
      } catch (e) {
        error.textContent = e.message;
      } finally {
        save.disabled = false;
      }
    };
  }
  onClose() {
    this.contentEl.empty();
  }
};

// obsidian/moved-links.js
function movedTarget(target, oldPath, newPath, sourcePath, resolve) {
  const match = /^([^#]+)(#.*)?$/.exec(target);
  if (!match) return target;
  const [, raw, fragment = ""] = match;
  let local = raw;
  if (/^\.{1,2}\//.test(raw) && sourcePath) {
    const parts = sourcePath.split("/").slice(0, -1);
    for (const part of raw.split("/")) {
      if (part === "..") parts.pop();
      else if (part && part !== ".") parts.push(part);
    }
    local = parts.join("/");
  }
  const path = local.replace(/^\//, "");
  const withoutMd = (value) => value.replace(/\.md$/i, "");
  let destination;
  if (withoutMd(path) === withoutMd(oldPath)) {
    destination = newPath;
  } else if (path.startsWith(oldPath + "/")) {
    destination = newPath + path.slice(oldPath.length);
  } else if (withoutMd(oldPath).endsWith("/" + withoutMd(path))) {
    const other = resolve?.(path, sourcePath);
    if (other && other.path !== newPath) return target;
    destination = newPath;
  } else {
    return target;
  }
  return (raw.startsWith("/") ? "/" : "") + (/\.md$/i.test(path) ? destination : withoutMd(destination)) + fragment;
}
function moveBlockLinks(source, move) {
  return source.replace(/\[\[([^\]|\n]+)(\|[^\]\n]*)?\]\]/g, (original, path, alias = "") => {
    const next = move(path.trim());
    return next === path.trim() ? original : "[[" + next + alias + "]]";
  });
}
function archivedLinkResolver(files, estimates, vaultName) {
  const key2 = (path) => path.replace(/^\//, "").replace(/\.md$/i, "");
  const basename = (path) => path.split("/").pop();
  const paths = new Set(files.map((file) => key2(file.path)));
  const candidates = /* @__PURE__ */ new Map();
  const add = (from, to) => {
    if (!candidates.has(from)) candidates.set(from, /* @__PURE__ */ new Set());
    candidates.get(from).add(to);
  };
  for (const file of files) add(basename(key2(file.path)), file.path);
  const archiveOnly = (path) => /^(?:archive|archivio)\//i.test(path);
  const prefix = "note:" + encodeURIComponent(vaultName) + "/";
  for (const note of estimates) {
    if (!archiveOnly(note.path) || !paths.has(key2(note.path)) || !note.id.startsWith(prefix)) continue;
    const encoded = note.id.slice(prefix.length);
    if (encoded.includes("/")) continue;
    let original;
    try {
      original = key2(decodeURIComponent(encoded));
    } catch {
      continue;
    }
    add(original, note.path);
    add(basename(original), note.path);
  }
  return (target) => {
    const [, raw, fragment = ""] = /^([^#]*)(#.*)?$/.exec(target);
    const path = key2(raw);
    if (!path || paths.has(path) || raw.includes(".") && !/\.md$/i.test(raw) && !candidates.has(basename(path))) return target;
    const matches = candidates.get(path) || candidates.get(basename(path));
    if (matches?.size !== 1) return target;
    const [destination] = matches;
    if (!archiveOnly(destination)) return target;
    return (/\.md$/i.test(raw) ? destination : key2(destination)) + fragment;
  };
}

// obsidian/daily-blocks.js
var import_obsidian4 = require("obsidian");
function newDailyPlanIds(plan, state) {
  const existing = new Set(state.sessions.map((session) => session.id));
  if (plan.records) {
    for (const record of state.history) existing.add(record.sessionId);
    return plan.records.map((record) => record.sessionId).filter((id) => !existing.has(id));
  }
  return plan.sessions.map((session) => session.id).filter((id) => !existing.has(id));
}
var uid2 = () => globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
var plain = (source) => source.split(/\r?\n/).filter((line) => !/^\s*<!-- tempvs-block:/.test(line)).map((line) => line.replace(/\s*<!-- tempvs-session:[^>]+-->\s*$/, "")).join("\n");
function restoreRowIds(original, edited) {
  const rows = original.split(/\r?\n/).filter((line) => line.trim() && !/^\s*(?:date:|<!-- tempvs-block:)/i.test(line));
  const next = edited.split(/\r?\n/);
  const actual = next.filter((line) => line.trim() && !/^\s*date:/i.test(line));
  const used = /* @__PURE__ */ new Set();
  let at = 0;
  return next.map((line) => {
    if (!line.trim() || /^\s*date:/i.test(line)) return line;
    const same = rows.findIndex((row3, i) => !used.has(i) && plain(row3) === line);
    const index = same >= 0 ? same : actual.length === rows.length && !used.has(at) ? at : -1;
    at++;
    if (index < 0) return line;
    used.add(index);
    return line + (rows[index].match(/\s*<!-- tempvs-session:[^>]+-->\s*$/)?.[0] || "");
  }).join("\n");
}
var DailyBlocks = class {
  constructor(plugin) {
    this.plugin = plugin;
    this.children = /* @__PURE__ */ new Set();
    this.chain = Promise.resolve();
    this.destroyed = false;
    this.applying = false;
    this.timers = /* @__PURE__ */ new Map();
    this.errors = /* @__PURE__ */ new Map();
    this.detached = /* @__PURE__ */ new Set();
    this.ledgerVersions = /* @__PURE__ */ new Map();
    this.allocationsByDay = /* @__PURE__ */ new Map();
  }
  get bindings() {
    return this.plugin.dailyNotes;
  }
  start() {
    for (const language2 of ["TEMPVS", "tempvs", "TEMPUS", "tempus"]) this.plugin.registerMarkdownCodeBlockProcessor(language2, (source, el, ctx) => ctx.addChild(new DailyBlock(el, this, ctx, source)));
    this.plugin.registerMarkdownCodeBlockProcessor("tempvs-assegnazioni", (source, el) => {
      el.createEl("strong", { text: "TEMPVS \xB7 Da programmare" });
      el.createEl("pre").createEl("code", { text: source.replace(/\s+<!-- tempvs-allocation:[\w-]+ -->/g, "") });
    });
    const vault = this.plugin.app.vault;
    if (this.plugin.app.workspace.on) this.plugin.registerEvent(this.plugin.app.workspace.on("editor-change", (_editor, view) => {
      if (view?.file?.extension === "md") this.schedule(view.file.path);
    }));
    if (this.plugin.app.workspace.on) this.plugin.registerEvent(this.plugin.app.workspace.on("file-open", (file) => {
      const date = this.panelDay(file);
      if (date) this.selectDay(file.path, date);
      else for (const { view } of this.plugin.app.workspace.getLeavesOfType?.("tempvs-timer") || []) {
        if (file && view) view.dailyContext = null;
      }
      if (file?.extension === "md" && !date) this.schedule(file.path);
    }));
    if (vault?.on) {
      this.plugin.registerEvent(vault.on("modify", (file) => {
        if (file.extension === "md") this.schedule(file.path);
      }));
      this.plugin.registerEvent(vault.on("delete", (file) => {
        for (const [day, entries] of this.allocationsByDay) if (entries.some((entry) => entry.file.path === file.path)) this.allocationsByDay.delete(day);
        const id = this.bindingId(file.path);
        if (id) this.queue(async () => {
          applyRegister(this.plugin.state, { blockId: id, sessions: [], records: [], removeIds: this.plugin.state.sessions.filter((s) => s.noteBlockId === id).map((s) => s.id) });
          delete this.bindings[id];
          await this.syncLedgers();
          this.plugin.refresh(true);
        });
        this.plugin.refresh?.(true);
      }));
      this.plugin.registerEvent(vault.on("delete", (file) => {
        this.plugin.estimates?.archive(file.path).catch((e) => new import_obsidian4.Notice(e.message));
      }));
      this.plugin.registerEvent(vault.on("rename", (file, oldPath) => {
        const newPath = file.path;
        this.queue(() => this.moveReferences(oldPath, newPath)).catch((e) => new import_obsidian4.Notice("TEMPVS: " + e.message));
      }));
    }
    if (vault?.on) this.plugin.registerEvent(vault.on("create", (file) => {
      if (file.extension === "md") {
        this.schedule(file.path);
        this.queue(() => this.syncLedgers()).catch((error) => new import_obsidian4.Notice(error.message));
      }
    }));
    this.plugin.addCommand({ id: "plan-daily-note", name: "Pianifica la giornata", callback: async () => {
      try {
        new DailyPlannerModal(this, await this.plannerTarget()).open();
      } catch (error) {
        new import_obsidian4.Notice(error.message);
      }
    } });
    this.plugin.addCommand({ id: "insert-daily-plan", name: "Inserisci blocco TEMPVS nella nota", editorCallback: (editor) => editor.replaceSelection("```TEMPVS\n\n```\n") });
    this.plugin.app.workspace.onLayoutReady?.(() => {
      this.ready = this.initialize().catch((error) => {
        new import_obsidian4.Notice("TEMPVS: " + error.message);
        throw error;
      });
      this.ready.catch(() => {
      });
    });
  }
  dailyLocation(date) {
    const { workspace, vault, internalPlugins } = this.plugin.app;
    const active = workspace.getActiveFile?.();
    const binding = Object.values(this.bindings).find((entry) => entry.date === date);
    const settings = internalPlugins?.getPluginById("daily-notes")?.instance?.options || {};
    const format = settings.format || "YYYY-MM-DD";
    const name = (0, import_obsidian4.moment)?.(date, "YYYY-MM-DD", true)?.format?.(format) || date;
    const path = [settings.folder, name + ".md"].filter(Boolean).join("/").replace(/^\/+|\/+(?=\/)/g, "");
    const activeMatches = active?.extension === "md" && (active.basename === date || active.basename === name.split("/").at(-1));
    const cached = this.allocationsByDay.get(date)?.[0]?.file;
    const file = binding && vault?.getAbstractFileByPath(binding.path) || vault?.getAbstractFileByPath(path) || (activeMatches && (!settings.folder || active.path === path) ? active : null) || cached && vault?.getAbstractFileByPath(cached.path);
    return { file: file?.extension === "md" ? file : null, path, settings };
  }
  async loadAllocations(date, file = this.dailyLocation(date).file) {
    if (!file) {
      if (this.allocationsByDay.delete(date)) this.plugin.refresh?.(true);
      return;
    }
    const markdown2 = await this.readMarkdown(file);
    this.cacheAllocations(date, file, markdown2);
  }
  cacheAllocations(date, file, markdown2) {
    const entries = readAllocations(allocationBlock(markdown2), file, date, this.plugin.state.defaults.simple.areas);
    const previous = this.allocationsByDay.get(date) || [];
    if (!entries.length) this.allocationsByDay.delete(date);
    else this.allocationsByDay.set(date, entries);
    if (JSON.stringify(previous.map(({ file: file2, ...entry }) => entry)) !== JSON.stringify(entries.map(({ file: file2, ...entry }) => entry)))
      this.plugin.refresh?.(true);
  }
  writeAllocation(allocation) {
    return this.writeAllocations([allocation]);
  }
  async writeAllocations(rows) {
    await this.ready;
    const allocation = rows[0];
    if (!allocation || rows.some((r) => r.date !== allocation.date)) throw Error("Usa una giornata per operazione.");
    const append = (text) => rows.reduce((out, row3) => appendUnifiedAllocation(out, row3), text);
    const file = await this.queue(async () => {
      const { vault } = this.plugin.app;
      let markdown2;
      let { file: file2, path, settings } = this.dailyLocation(allocation.date);
      if (!file2) {
        const folders = path.split("/").slice(0, -1);
        for (let i = 1; i <= folders.length; i++) {
          const folder = folders.slice(0, i).join("/");
          if (!vault.getAbstractFileByPath(folder)) await vault.createFolder(folder);
        }
        const template = settings.template && (this.plugin.app.metadataCache?.getFirstLinkpathDest?.(settings.template, "") || vault.getAbstractFileByPath(settings.template));
        const initial = template?.extension === "md" ? await vault.read(template) : "";
        const day = (0, import_obsidian4.moment)?.(allocation.date, "YYYY-MM-DD", true);
        const title = path.split("/").at(-1).slice(0, -3);
        const body = initial.replace(/{{title}}/gi, () => title).replace(/{{date(?::([^}]+))?}}/gi, (_all, format) => day?.format?.(format || "YYYY-MM-DD") || allocation.date).replace(/{{time(?::([^}]+))?}}/gi, (all, format) => (0, import_obsidian4.moment)?.()?.format?.(format || "HH:mm") || all);
        markdown2 = append(body);
        this.validateAllocationSource(markdown2, allocation.date, path);
        file2 = await vault.create(path, markdown2);
      } else {
        const before = await this.readMarkdown(file2);
        if (!allocation.id || !findDailyBlocks(before)[0]?.source.includes("<!-- tempvs-allocation:" + allocation.id + " -->")) {
          markdown2 = append(before);
          this.validateAllocationSource(markdown2, allocation.date, file2.path);
          await this.replaceAllocationText(file2, before, markdown2);
        }
      }
      return file2;
    });
    try {
      await this.syncFile(file.path);
    } catch (error) {
      this.schedule(file.path);
      new import_obsidian4.Notice("Assegnazione salvata. Sincronizzazione TEMPVS: " + error.message);
    }
  }
  validateAllocationSource(markdown2, date, path) {
    const block = findDailyBlocks(markdown2)[0];
    const blockId = this.bindingId(path) || blockIdentity(block.source) || uid2();
    this.validateBinding(blockId, path, date);
    prepareDailyPlan({
      source: block.source,
      date,
      blockId,
      state: this.plugin.state,
      previousSource: this.bindings[blockId]?.source,
      protectedBlockIds: this.protectedBlocks(blockId)
    });
  }
  updateUnifiedAllocation(entry, start) {
    return this.queue(async () => {
      const context = await this.context(entry.file.path);
      const blockId = this.bindingId(entry.file.path);
      const lines = context?.block.source.split(/\r?\n/);
      if (context?.date !== entry.date || !blockId || lines?.[entry.index] !== entry.raw)
        throw Error("L\u2019assegnazione \xE8 cambiata. Riapri la giornata e riprova.");
      if (start && flexibleAllocation(entry.raw)) lines[entry.index] = entry.raw.trimEnd() + " " + start;
      else if (start) lines[entry.index] = entry.raw.replace(/^(\s*-\s*(?:\[\[[^\]\[]+\]\]\s+)?@\d+(?:[.,]\d+)?[hms]?)(?=\s|$)/i, "$1 +" + start);
      else lines.splice(entry.index, 1);
      const source = lines.join("\n");
      const plan = prepareDailyPlan({
        source,
        date: entry.date,
        blockId,
        state: this.plugin.state,
        previousSource: context.block.source,
        protectedBlockIds: this.protectedBlocks(blockId)
      });
      await this.commit({ ...context, ...plan, originalSource: context.block.source, preserveSource: true });
      this.plugin.refresh?.(true);
    });
  }
  async replaceAllocationText(file, before, after) {
    const { vault, workspace } = this.plugin.app;
    await vault.process(file, (current) => {
      if (current !== before || (workspace.getLeavesOfType?.("markdown") || []).some(({ view }) => view?.file?.path === file.path && view.getMode?.() !== "preview" && view.editor && view.editor.getValue() !== current))
        throw Error("La nota sta cambiando. Attendi il salvataggio e riprova.");
      return after;
    });
  }
  async consumeAllocation(entry, commit) {
    await this.queue(async () => {
      const { file, date, index, raw } = entry;
      const before = await this.readMarkdown(file), block = allocationBlock(before);
      const lines = block?.source.split(/\r?\n/);
      if (lines?.[index] !== raw) throw Error("L\u2019assegnazione \xE8 cambiata. Riapri la giornata e riprova.");
      lines.splice(index, 1);
      const after = replaceDailyBlock(before, block, lines.join("\n"));
      await this.replaceAllocationText(file, before, after);
      this.applying = true;
      try {
        if (commit) await commit();
      } catch (error) {
        await this.replaceAllocationText(file, after, before);
        throw error;
      } finally {
        this.applying = false;
      }
      this.cacheAllocations(date, file, after);
    });
    if (commit) await this.archiveChanged();
  }
  async migrateAllocationBlock(file) {
    const before = await this.readMarkdown(file);
    if (!/tempvs-assegnazioni/i.test(before) || !allocationBlock(before)) return;
    const context = await this.context(file.path);
    const date = context?.date || this.panelDay(file);
    if (!date || context?.kind) return;
    const after = mergeAllocationBlocks(before, file, date, this.plugin.state.defaults.simple.areas);
    if (before === after) return;
    if (findDailyBlocks(after).length) this.validateAllocationSource(after, date, file.path);
    await this.replaceAllocationText(file, before, after);
  }
  async migrateAllocations() {
    for (const entry of this.plugin.allocations || []) {
      try {
        await this.writeAllocation(entry);
        await this.plugin.change(() => {
          this.plugin.allocations = this.plugin.allocations.filter((item) => item.id !== entry.id);
        });
      } catch (error) {
        new import_obsidian4.Notice("TEMPVS: assegnazione del " + entry.date + " ancora da trasferire. " + error.message);
      }
    }
  }
  async plannerTarget() {
    const { workspace, vault, internalPlugins } = this.plugin.app;
    const settings = internalPlugins?.getPluginById("daily-notes")?.instance?.options || {};
    const format = settings.format || "YYYY-MM-DD";
    const active = workspace.getActiveFile?.();
    if (active?.extension === "md") {
      if (this.bindingId(active.path) || (0, import_obsidian4.moment)(active.basename, format, true).isValid() || /^\d{4}-\d\d-\d\d$/.test(active.basename)) return active;
      const context = await this.context(active.path).catch(() => null);
      if (context?.date) return active;
    }
    const today2 = (0, import_obsidian4.moment)();
    const binding = Object.values(this.bindings).find((b) => b.date === today2.format("YYYY-MM-DD"));
    const path = binding?.path || [settings.folder, today2.format(format) + ".md"].filter(Boolean).join("/").replace(/^\/+|\/+(?=\/)/g, "");
    const file = vault.getAbstractFileByPath(path);
    if (file?.extension === "md") return file;
    throw Error("Apri la nota quotidiana da pianificare e richiama il comando.");
  }
  async appendPlannerRow(file, row3) {
    if (!row3.trim() || /[\r\n]/.test(row3)) throw Error("Inserisci una sola attivit\xE0.");
    await this.queue(async () => {
      const { vault, workspace, metadataCache, internalPlugins } = this.plugin.app;
      const context = await this.context(file.path);
      if (context?.kind) throw Error("Questa nota contiene una stima o un totale. Apri la nota quotidiana.");
      const markdown2 = context?.markdown ?? await this.readMarkdown(file);
      if (findDailyBlocks(markdown2, true).length !== findDailyBlocks(markdown2).length) throw Error("Chiudi il blocco TEMPVS prima di aggiungere una riga.");
      const original = context?.block.source || "";
      const source = original + (original && !original.endsWith("\n") ? "\n" : "") + row3;
      const date = context?.date || resolveDailyDate("", file, { moment: import_obsidian4.moment, format: internalPlugins?.getPluginById("daily-notes")?.instance?.options?.format || "YYYY-MM-DD", frontmatter: metadataCache?.getFileCache(file)?.frontmatter });
      const id = this.bindingId(file.path) || blockIdentity(original) || uid2();
      this.validateBinding(id, file.path, date);
      prepareDailyPlan({ source, date, blockId: id, state: this.plugin.state, previousSource: this.bindings[id]?.source, protectedBlockIds: this.protectedBlocks(id) });
      const nl = markdown2.includes("\r\n") ? "\r\n" : "\n";
      const next = context ? replaceDailyBlock(markdown2, context.block, source) : markdown2 + (markdown2 && !markdown2.endsWith(nl) ? nl : "") + nl + "```TEMPVS" + nl + row3 + nl + "```" + nl;
      if (!findDailyBlocks(next).some((b) => b.source.replace(/\r\n/g, "\n") === source.replace(/\r\n/g, "\n"))) throw Error("Chiudi il blocco di codice aperto nella nota.");
      await vault.process(file, (current) => {
        if (current !== markdown2 || (workspace.getLeavesOfType?.("markdown") || []).some(({ view }) => view?.file?.path === file.path && view.getMode?.() !== "preview" && view.editor && view.editor.getValue() !== current)) throw Error("La nota sta cambiando. Attendi il salvataggio e riprova.");
        return next;
      });
      this.detached.delete(file.path);
    });
    try {
      await this.syncFile(file.path);
    } catch (error) {
      this.schedule(file.path);
      new import_obsidian4.Notice("Riga salvata. Sincronizzazione TEMPVS: " + error.message);
    }
  }
  async moveReferences(oldPath, newPath) {
    const plugin = this.plugin, cache = plugin.app.metadataCache;
    const resolve = (path, source) => cache?.getFirstLinkpathDest?.(path, source);
    const move = (path, source = "") => movedTarget(path, oldPath, newPath, source, resolve);
    const relocated = (path) => path === oldPath || path.startsWith(oldPath + "/") ? newPath + path.slice(oldPath.length) : path;
    return this.rewriteReferences(move, relocated);
  }
  async rewriteReferences(move, relocated = (path) => path) {
    const plugin = this.plugin;
    const bindings = Object.entries(this.bindings);
    const affected = bindings.filter(([, b]) => typeof b.source === "string" && moveBlockLinks(b.source, (p) => move(p, b.path)) !== b.source);
    const notes = (plugin.estimates?.notes || []).filter((n) => n.vault === plugin.estimates.vault && relocated(n.path) !== n.path);
    const records = [...plugin.state.sessions, ...plugin.state.history || []];
    const sourceOf = (r) => this.bindings[r.noteBlockId]?.path || "";
    const changes = records.filter((r) => r.linkedNotes?.some((n) => move(n.path, sourceOf(r)) !== n.path));
    const allocations = (plugin.allocations || []).map((entry) => {
      if (!entry.note) return entry;
      const path = move(entry.note.path);
      return path === entry.note.path ? entry : { ...entry, note: { ...entry.note, path } };
    });
    const allocationsChanged = allocations.some((entry, index) => entry !== plugin.allocations[index]);
    if (!allocationsChanged && !affected.length && !notes.length && !changes.length && !bindings.some(([, b]) => relocated(b.path) !== b.path)) return;
    this.applying = true;
    try {
      await plugin.change(() => {
        if (allocationsChanged) plugin.allocations = allocations;
        for (const r of changes) for (const n of r.linkedNotes) {
          const path = move(n.path, sourceOf(r));
          if (n.path === n.label) n.label = path;
          n.path = path;
        }
        for (const n of notes) {
          n.path = relocated(n.path);
          n.title = n.path.split("/").pop().replace(/\.md$/i, "");
        }
        for (const [, b] of bindings) b.path = relocated(b.path);
      });
      for (const [id, b] of affected) {
        const context = await this.context(b.path);
        if (!context || context.kind) continue;
        const original = context.block.source, next = moveBlockLinks(original, (p) => move(p, b.path));
        if (original !== next) await this.writeSource(context.file, id, original, next, context.block.lineStart);
        if (b.source === original || moveBlockLinks(b.source, (p) => move(p, b.path)) === next) b.source = next;
        this.schedule(b.path);
      }
      if (affected.length) await plugin.persist();
    } finally {
      this.applying = false;
      this.refresh();
    }
  }
  queue(work) {
    const result = this.chain.catch(() => {
    }).then(() => {
      if (this.destroyed) throw Error("TEMPVS non \xE8 attivo.");
      return work();
    });
    this.chain = result;
    return result;
  }
  refresh(path) {
    for (const child of this.children) if (!path || child.ctx.sourcePath === path) child.refresh();
  }
  schedule(path) {
    if (this.destroyed || this.detached.has(path)) return;
    clearTimeout(this.timers.get(path));
    this.timers.set(path, setTimeout(() => {
      this.timers.delete(path);
      this.syncFile(path).catch((error) => {
        this.errors.set(path, error.message);
        this.plugin.refresh?.(true);
        this.refresh(path);
      });
    }, 350));
  }
  async syncLedgers(forcePath) {
    const { app, state } = this.plugin, vault = app.vault;
    if (!vault?.process || this.indexing || this.unreadDays?.size) return;
    const totals = /* @__PURE__ */ new Map();
    creditedWork(state, (path, source) => app.metadataCache?.getFirstLinkpathDest?.(path, source)?.path, (id) => this.bindings[id]?.path, totals, { dailyOnly: true });
    const paths = forcePath ? [forcePath] : /* @__PURE__ */ new Set([...totals.keys(), ...this.ledgerVersions.keys()]);
    for (const path of paths) {
      const areas = totals.get(path) || /* @__PURE__ */ new Map(), version = JSON.stringify([...areas]);
      if (!forcePath && version === this.ledgerVersions.get(path)) continue;
      const file = vault.getAbstractFileByPath(path);
      if (file?.extension !== "md" || file.path !== path) {
        this.ledgerVersions.delete(path);
        continue;
      }
      try {
        const markdown2 = await this.readMarkdown(file);
        if (updateLedger(markdown2, areas) !== markdown2) {
          await vault.process(file, (current) => {
            if (current !== markdown2) throw Error("Modifica in corso: attendo il salvataggio della nota.");
            return updateLedger(current, areas);
          });
        }
        this.ledgerVersions.set(path, version);
      } catch (error) {
        this.errors.set(path, error.message);
        this.ledgerVersions.delete(path);
        this.refresh(path);
      }
    }
  }
  async initialize() {
    this.indexing = true;
    this.unreadDays = /* @__PURE__ */ new Set();
    const files = this.plugin.app.vault.getMarkdownFiles();
    const estimates = this.plugin.estimates;
    const move = archivedLinkResolver(files, estimates?.notes || [], estimates?.vault || "");
    await this.queue(() => this.rewriteReferences(move));
    for (const file of files) {
      if (this.destroyed) return;
      let markdown2;
      try {
        markdown2 = await this.readMarkdown(file);
      } catch (error) {
        this.errors.set(file.path, error.message);
        if (this.panelDay(file)) this.unreadDays.add(file.path);
        continue;
      }
      if (!/tempvs|tempus/i.test(markdown2)) continue;
      try {
        if (/tempvs-assegnazioni/i.test(markdown2)) await this.migrateAllocationBlock(file);
      } catch (error) {
        new import_obsidian4.Notice("TEMPVS: blocco precedente conservato in " + file.path + ". " + error.message);
      }
      try {
        await this.syncFile(file.path, { force: true });
      } catch (error) {
        this.errors.set(file.path, error.message);
        if (this.panelDay(file)) this.unreadDays.add(file.path);
      }
    }
    this.indexing = false;
    await this.plugin.persist?.();
    await this.syncLedgers();
    this.plugin.refresh?.(true);
  }
  async reconcilePlans() {
    const vault = this.plugin.app.vault;
    const files = vault?.getMarkdownFiles?.() || Object.values(this.bindings).map((b) => vault?.getAbstractFileByPath(b.path)).filter(Boolean);
    for (const file of files) {
      if (this.destroyed) return;
      try {
        const context = await this.context(file.path);
        if (context && !context.kind) await this.syncFile(file.path, { force: true });
      } catch (error) {
        this.errors.set(file.path, error.message);
      }
    }
    this.plugin.refresh?.(true);
    this.refresh();
  }
  protectedBlocks(id) {
    return Object.entries(this.bindings).filter(([other, b]) => other !== id && this.plugin.app.vault.getAbstractFileByPath(b.path)).map(([other]) => other);
  }
  panelDay(file = this.plugin.app.workspace.getActiveFile?.()) {
    if (file?.extension !== "md") return null;
    const bound = this.bindings[this.bindingId(file.path)];
    if (bound) return bound.date;
    const options = this.plugin.app.internalPlugins?.getPluginById("daily-notes")?.instance?.options;
    if (options) {
      const folder = (options.folder || "").replace(/^\/+|\/+$/g, "");
      const prefix = folder ? folder + "/" : "";
      if (!file.path.startsWith(prefix)) return null;
      const name = file.path.slice(prefix.length, -3), format = options.format || "YYYY-MM-DD";
      if (format === "YYYY-MM-DD") return validDay(name) ? name : null;
      const parsed = (0, import_obsidian4.moment)?.(name, format, true);
      return parsed?.isValid() ? parsed.format("YYYY-MM-DD") : null;
    }
    try {
      return resolveDailyDate("", file, {
        moment: import_obsidian4.moment || globalThis.moment,
        format: this.plugin.app.internalPlugins?.getPluginById("daily-notes")?.instance?.options?.format || "YYYY-MM-DD",
        frontmatter: void 0
      });
    } catch {
      return null;
    }
  }
  selectDay(path, date) {
    if (this.plugin.app.workspace.getActiveFile?.()?.path !== path) return;
    for (const { view } of this.plugin.app.workspace.getLeavesOfType?.("tempvs-timer") || []) {
      if (view?.dailyContext === path + ":" + date) continue;
      if (view?.selectDay) {
        view.dailyContext = path + ":" + date;
        view.selectDay(date);
      }
    }
  }
  bindingId(path) {
    return Object.keys(this.bindings).find((id) => this.bindings[id].path === path);
  }
  async readMarkdown(file) {
    for (const leaf of this.plugin.app.workspace.getLeavesOfType?.("markdown") || []) {
      const view = leaf.view;
      if (view?.file?.path === file.path && view.editor && view.getMode?.() !== "preview") return view.editor.getValue();
    }
    return this.plugin.app.vault.read(file);
  }
  async context(path, renderSource) {
    const file = this.plugin.app.vault.getAbstractFileByPath(path);
    if (!file || file.extension !== "md") throw Error("La nota Markdown non \xE8 pi\xF9 disponibile.");
    const markdown2 = await this.readMarkdown(file), blocks = findDailyBlocks(markdown2);
    if (findDailyBlocks(markdown2, true).length !== blocks.length || !blocks.length && this.bindingId(path) && /^ {0,3}(?:`{1,2}|~{1,2})(?:tempvs|tempus)\s*$/im.test(markdown2))
      throw Error("Chiudi il blocco TEMPVS. La giornata valida resta in uso.");
    const ledger = blocks.find((b) => isLedger(b.source));
    if (ledger && (blocks.length === 1 || isLedger(renderSource))) return { file, block: ledger, markdown: markdown2, kind: "ledger" };
    const plans = blocks.filter((b) => !isLedger(b.source));
    if (!plans.length) {
      const value = this.plugin.app.metadataCache?.getFileCache(file)?.frontmatter?.tempvs;
      if (typeof value === "string" && /^@?\d+(?:[.,]\d+)?[hm]$/i.test(value.trim())) return { file, kind: "estimate", block: { source: "@" + value.trim().replace(/^@/, "") } };
      return null;
    }
    if (plans.length !== 1) throw Error("Usa un solo blocco TEMPVS per nota giornaliera.");
    const block = plans[0];
    if (!block.source.trim() && this.plugin.estimates?.find(file.path)) return { file, block, markdown: markdown2, kind: "estimate-empty" };
    if (isEstimateSource(block.source.split(/\r?\n/).filter((line) => !flexibleAllocation(line)).join("\n"))) return { file, block, markdown: markdown2, kind: "estimate" };
    const date = this.panelDay(file);
    if (date && explicitDay(block.source) && explicitDay(block.source) !== date) throw Error("La data del blocco deve coincidere con la giornata.");
    if (!date) throw Error("Le sessioni vanno nella nota quotidiana. In questa nota usa una stima o un totale T:.");
    return { file, block, date, markdown: markdown2 };
  }
  async locate(child) {
    const context = await this.context(child.ctx.sourcePath, child.source);
    if (!context) throw Error("Blocco TEMPVS non trovato.");
    return context;
  }
  toggleActivity(path, completed) {
    return this.queue(async () => {
      const context = await this.context(path);
      if (context?.kind !== "estimate" || !isActivitySource(context.block.source)) throw Error("Il blocco attivit\xE0 TEMPVS \xE8 cambiato.");
      const { file, block } = context, source = markActivity(block.source, completed);
      const changed = source !== block.source;
      if (changed) await this.writeSource(file, void 0, block.source, source, block.lineStart);
      try {
        await this.syncEstimate({ ...context, block: { ...block, source } }, path);
      } catch (error) {
        if (changed) await this.writeSource(file, void 0, source, block.source, block.lineStart);
        throw error;
      }
      this.errors.delete(path);
      this.refresh(path);
    });
  }
  async syncEstimate(context, path) {
    this.applying = true;
    try {
      if (context?.kind === "estimate") await this.plugin.estimates?.sync(context);
      else await this.plugin.estimates?.archive(path);
    } finally {
      this.applying = false;
    }
  }
  syncFile(path, { force = false } = {}) {
    return this.queue(async () => {
      if (this.detached.has(path)) return;
      const context = await this.context(path);
      const file = context?.file || this.plugin.app.vault.getAbstractFileByPath(path);
      const date = context?.date || this.panelDay(file);
      if (date && file) {
        const target = this.dailyLocation(date).file;
        if (context?.date || !target || target.path === file.path) await this.loadAllocations(date, file);
      }
      if (!context) {
        this.unreadDays?.delete(path);
        const id = this.bindingId(path);
        if (id) {
          this.applying = true;
          try {
            await this.plugin.change(() => {
              const removeIds = this.plugin.state.sessions.filter((s) => s.noteBlockId === id).map((s) => s.id);
              applyRegister(this.plugin.state, { blockId: id, sessions: [], records: [], removeIds });
              delete this.bindings[id];
            });
          } finally {
            this.applying = false;
          }
        }
        await this.syncEstimate(null, path);
        if (id) await this.syncLedgers();
        return;
      }
      if (context.kind === "ledger") {
        await this.syncEstimate(null, path);
        if (this.indexing) this.ledgerVersions.set(path, null);
        this.errors.delete(path);
        await this.syncLedgers(path);
        this.refresh(path);
        return;
      }
      if (context.kind === "estimate-empty") {
        await this.syncEstimate(null, path);
        this.errors.delete(path);
        this.refresh(path);
        return;
      }
      if (context.kind === "estimate") {
        await this.syncEstimate(context, path);
        this.errors.delete(path);
        this.refresh(path);
        return;
      }
      await this.syncEstimate(null, path);
      const blockId = this.bindingId(path) || blockIdentity(context.block.source) || uid2();
      this.validateBinding(blockId, path, context.date);
      const binding = this.bindings[blockId];
      if (!force && binding?.agendaVersion === 2 && binding.ratioVersion === 1 && binding.source === context.block.source) {
        this.errors.delete(path);
        this.selectDay(path, context.date);
        this.refresh(path);
        return;
      }
      const plan = prepareDailyPlan({ source: context.block.source, date: context.date, blockId, previousSource: binding?.source, protectedBlockIds: this.protectedBlocks(blockId), state: this.plugin.state });
      await this.commit({ ...context, ...plan, originalSource: context.block.source, keepSource: true });
      this.errors.delete(path);
      if (this.unreadDays?.delete(path)) await this.syncLedgers();
      this.selectDay(path, context.date);
      this.plugin.refresh?.(true);
      this.refresh(path);
    });
  }
  validateBinding(id, path, date) {
    const bound = this.bindings[id];
    if (bound && (bound.path !== path || bound.date !== date)) throw Error("Questo blocco TEMPVS \xE8 gi\xE0 collegato a un\u2019altra nota o data. Non copiare i commenti identificativi.");
    if (Object.entries(this.bindings).some(([other, b]) => other !== id && b.date === date)) throw Error("Esiste gi\xE0 un blocco collegato a questa giornata. Usa il blocco originale.");
  }
  async preview(child, edited) {
    const context = await this.locate(child), id = this.bindingId(context.file.path) || blockIdentity(context.block.source) || uid2();
    this.validateBinding(id, context.file.path, context.date);
    if (edited !== void 0 && context.block.source !== child.source) throw Error("La nota \xE8 cambiata mentre modificavi le righe. Riapri il blocco prima di riprovare.");
    const source = edited === void 0 ? context.block.source : restoreRowIds(context.block.source, edited);
    const date = explicitDay(source) || context.date;
    if (date !== context.date) throw Error("Per cambiare giorno usa una daily note diversa.");
    const plan = prepareDailyPlan({ source, date, blockId: id, previousSource: this.bindings[id]?.source, protectedBlockIds: this.protectedBlocks(id), state: this.plugin.state });
    return { ...context, ...plan, originalSource: context.block.source };
  }
  async writeSource(file, id, original, replacement, lineStart) {
    if (this.destroyed) throw Error("TEMPVS non \xE8 attivo.");
    await this.plugin.app.vault.process(file, (current) => {
      for (const leaf of this.plugin.app.workspace.getLeavesOfType?.("markdown") || []) {
        if (leaf.view?.file?.path === file.path && leaf.view.editor && leaf.view.editor.getValue() !== current) throw Error("Modifica in corso: attendo il salvataggio della nota.");
      }
      const blocks = findDailyBlocks(current);
      let matches = id ? blocks.filter((b) => blockIdentity(b.source) === id) : [];
      if (!matches.length) matches = blocks.filter((b) => b.source === original && (lineStart === void 0 || b.lineStart === lineStart));
      if (matches.length !== 1 || matches[0].source !== original) throw Error("La nota \xE8 cambiata durante la preview. Prepara nuovamente le modifiche.");
      return replaceDailyBlock(current, matches[0], replacement);
    });
  }
  async commit(prepared) {
    if (archivePlanningKey(this.plugin.state) !== prepared.planningKey) throw Error("Le sessioni sono cambiate durante la preview. Prepara nuovamente le modifiche.");
    this.validateBinding(prepared.blockId, prepared.file.path, prepared.date);
    const newIds = newDailyPlanIds(prepared, this.plugin.state);
    const fresh = prepareDailyPlan({ source: prepared.source, date: prepared.date, blockId: prepared.blockId, previousSource: prepared.previousSource, protectedBlockIds: prepared.protectedBlockIds, state: this.plugin.state, id: () => newIds.shift() || uid2() });
    const body = prepared.keepSource || prepared.preserveSource || fresh.records ? plain(prepared.source) : serializeDailyPlan(fresh.sessions, prepared.date, prepared.source);
    const canonical = explicitDay(prepared.originalSource) && !explicitDay(body) ? "date: " + prepared.date + "\n" + body : body;
    const previousBinding = this.bindings[prepared.blockId];
    this.applying = true;
    const writesNote = !prepared.keepSource || canonical !== prepared.originalSource;
    try {
      if (writesNote) await this.writeSource(prepared.file, prepared.blockId, prepared.originalSource, canonical, prepared.block.lineStart);
      else {
        const current = await this.context(prepared.file.path);
        if (!current || current.block.source !== prepared.originalSource || current.date !== prepared.date) throw Error("La nota \xE8 cambiata durante la sincronizzazione.");
      }
      try {
        if (archivePlanningKey(this.plugin.state) !== fresh.planningKey) throw Error("Le sessioni sono cambiate durante il salvataggio. Prepara nuovamente le modifiche.");
        await this.plugin.change(() => {
          const available = newDailyPlanIds(fresh, this.plugin.state);
          const checked = prepareDailyPlan({ source: prepared.source, date: prepared.date, blockId: prepared.blockId, previousSource: prepared.previousSource, protectedBlockIds: prepared.protectedBlockIds, state: this.plugin.state, id: () => available.shift() || uid2() });
          const existing = new Set(this.plugin.state.sessions.map((s) => s.id));
          applyDailyPlan(this.plugin.state, checked);
          this.plugin.restoreTimerFlags?.(this.plugin.state.sessions, existing);
          this.plugin.state = normalizeArchive(this.plugin.state);
          this.bindings[prepared.blockId] = { path: prepared.file.path, date: prepared.date, source: canonical, ratioVersion: 1, agendaVersion: 2, hiddenSessionIds: checked.retainedIds, budgets: fresh.budgets, unusedMinutes: fresh.unusedMinutes };
        });
      } catch (error) {
        if (previousBinding) this.bindings[prepared.blockId] = previousBinding;
        else delete this.bindings[prepared.blockId];
        try {
          if (writesNote) await this.writeSource(prepared.file, prepared.blockId, canonical, prepared.originalSource);
        } catch {
          throw Error("Salvataggio sessioni fallito e nota modificata nel frattempo. Le righe restano nella nota: verifica e riprepara la preview. " + error.message);
        }
        throw error;
      }
    } finally {
      this.applying = false;
      this.refresh(prepared.file.path);
    }
    await this.syncLedgers();
    return canonical;
  }
  apply(prepared) {
    return this.queue(() => this.commit(prepared));
  }
  async editTimedRows(updates) {
    const first = this.plugin.state.sessions.find((s) => s.id === updates.keys().next().value);
    const id = first?.noteBlockId, binding = this.bindings[id];
    if (!binding) throw Error("Sessione assente dalla nota quotidiana.");
    if (!isRegister(binding.source) && [...updates.values()].every((value) => value !== null)) return this.updateSessionNotes(id, updates);
    return this.queue(async () => {
      const ctx = await this.context(binding.path);
      if (ctx?.block.source !== binding.source) throw Error("La giornata \xE8 cambiata. Riapri il pannello.");
      const lines = binding.source.split(/\r?\n/);
      const rows = this.plugin.state.history.filter((h) => h.registerBlock === id);
      if (!isRegister(binding.source)) {
        const remaining = this.plugin.state.sessions.filter((s) => s.noteBlockId === id && !updates.has(s.id) && !s.dailyRetired && !s.manualSuperseded);
        const source2 = serializeDailyPlan(remaining, binding.date, binding.source);
        if (explicitDay(binding.source)) lines.splice(0, lines.length, "date: " + binding.date, source2);
        else lines.splice(0, lines.length, source2);
      } else {
        for (const [sessionId, links] of updates) {
          const row3 = rows.find((h) => h.sessionId === sessionId);
          if (!Number.isInteger(row3?.sourceRow) || rows.some((h) => h.sourceRow === row3.sourceRow && h.sessionId !== sessionId && !updates.has(h.sessionId)))
            throw Error("Questa riga raggruppa pi\xF9 sessioni. Modificala nella daily.");
          const index = row3.sourceRow;
          if (links === null) {
            lines[index] = null;
            continue;
          }
          const wiki2 = links.map((n) => "[[" + n.path + (n.label && n.label !== n.path ? "|" + n.label : "") + "]]").join(" ");
          const original = lines[index];
          if (/\[\[[^\]]+\]\]/.test(original)) lines[index] = original.replace(/\[\[[^\]]+\]\](?:\s+\[\[[^\]]+\]\])*/g, () => wiki2);
          else if (/^\s*-/.test(original)) lines[index] = original.replace(/^(\s*-\s*)/, (_, prefix) => prefix + wiki2 + " ");
          else lines[index] = original + " " + wiki2;
        }
      }
      const source = lines.filter((line) => line !== null).join("\n");
      const plan = prepareDailyPlan({ source, date: binding.date, blockId: id, state: this.plugin.state, previousSource: binding.source, protectedBlockIds: this.protectedBlocks(id) });
      await this.commit({ ...ctx, ...plan, originalSource: binding.source, preserveSource: true });
    });
  }
  updateSessionNotes(blockId, updates) {
    return this.queue(async () => {
      const binding = this.bindings[blockId];
      if (!binding) throw Error("Nota giornaliera non collegata.");
      const context = await this.context(binding.path);
      if (!context || context.block.source !== binding.source) throw Error("La nota giornaliera sta cambiando: attendi la sincronizzazione e riprova.");
      if (isRegister(binding.source)) throw Error("Modifica il wikilink nella riga della nota quotidiana.");
      const sessions = daySessions(this.plugin.state, binding.date, blockId).filter((s) => !binding.hiddenSessionIds?.includes(s.id)).map((s) => updates.has(s.id) ? { ...s, linkedNotes: updates.get(s.id) } : s);
      const body = serializeDailyPlan(sessions, binding.date, binding.source);
      const source = explicitDay(binding.source) ? "date: " + binding.date + "\n" + body : body;
      const plan = prepareDailyPlan({ source, date: binding.date, blockId, state: this.plugin.state, previousSource: binding.source, protectedBlockIds: this.protectedBlocks(blockId) });
      for (const session of plan.sessions) if (updates.has(session.id)) delete session.noteEstimateId;
      await this.commit({ ...context, ...plan, originalSource: context.block.source, keepSource: true });
    });
  }
  async includeDay(child) {
    const context = await this.locate(child), blockId = this.bindingId(context.file.path) || blockIdentity(context.block.source) || uid2();
    this.validateBinding(blockId, context.file.path, context.date);
    const source = serializeDailyPlan(daySessions(this.plugin.state, context.date, blockId), context.date, context.block.source);
    return { ...context, ...prepareDailyPlan({ source, date: context.date, blockId, protectedBlockIds: this.protectedBlocks(blockId), state: this.plugin.state }), originalSource: context.block.source };
  }
  detach(path) {
    return this.queue(async () => {
      this.detached.add(path);
      clearTimeout(this.timers.get(path));
      const previous = JSON.parse(JSON.stringify(this.bindings));
      const ids = new Set(Object.keys(this.bindings).filter((id) => this.bindings[id].path === path));
      this.applying = true;
      try {
        await this.plugin.change(() => {
          for (const id of ids) delete this.bindings[id];
          for (const session of this.plugin.state.sessions) if (ids.has(session.noteBlockId)) delete session.noteBlockId;
        });
      } catch (error) {
        this.plugin.dailyNotes = Object.assign(/* @__PURE__ */ Object.create(null), previous);
        throw error;
      } finally {
        this.applying = false;
        this.refresh(path);
      }
    });
  }
  archiveChanged() {
    if (this.applying || this.destroyed) return Promise.resolve();
    return this.queue(async () => {
      for (const [blockId, binding] of Object.entries(this.bindings)) {
        if (this.detached.has(binding.path)) continue;
        try {
          const context = await this.context(binding.path);
          if (!context) continue;
          if (context.kind === "estimate" || binding.agendaVersion !== 2 || binding.ratioVersion !== 1 || context.block.source !== binding.source) {
            this.schedule(binding.path);
            continue;
          }
          const sessions = daySessions(this.plugin.state, binding.date, blockId).filter((s) => !binding.hiddenSessionIds?.includes(s.id));
          if (isRegister(binding.source) || sessions.some((s) => s.registerMinutes)) continue;
          const body = serializeDailyPlan(sessions, binding.date, binding.source);
          const source = explicitDay(binding.source) ? "date: " + binding.date + "\n" + body : body;
          if (source === binding.source) continue;
          const key2 = archivePlanningKey(this.plugin.state), previousSource = binding.source;
          this.applying = true;
          try {
            await this.writeSource(context.file, blockId, previousSource, source, context.block.lineStart);
            try {
              await this.plugin.change(() => {
                if (archivePlanningKey(this.plugin.state) !== key2) throw Error("Le sessioni sono cambiate durante il salvataggio della nota.");
                for (const session of this.plugin.state.sessions) if (sessions.some((s) => s.id === session.id)) session.noteBlockId = blockId;
                this.bindings[blockId] = { ...binding, source, unusedMinutes: 0 };
              });
            } catch (error) {
              this.bindings[blockId] = binding;
              await this.writeSource(context.file, blockId, source, previousSource, context.block.lineStart);
              throw error;
            }
          } finally {
            this.applying = false;
          }
          this.errors.delete(binding.path);
        } catch (error) {
          this.errors.set(binding.path, error.message);
        }
      }
      await this.syncLedgers();
      this.refresh();
    });
  }
  destroy() {
    this.destroyed = true;
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
    for (const child of this.children) child.disposed = true;
    this.children.clear();
  }
};
var DailyBlock = class extends import_obsidian4.MarkdownRenderChild {
  constructor(el, controller, ctx, source) {
    super(el);
    this.controller = controller;
    this.ctx = ctx;
    this.source = source;
    this.disposed = false;
  }
  onload() {
    this.controller.children.add(this);
    this.refresh();
    this.controller.schedule(this.ctx.sourcePath);
  }
  onunload() {
    this.disposed = true;
    this.controller.children.delete(this);
  }
  async refresh() {
    const version = this.version = (this.version || 0) + 1;
    try {
      const context = await this.controller.locate(this);
      if (this.disposed || version !== this.version) return;
      this.source = context.block.source;
      if (context.kind === "estimate" || context.kind === "estimate-empty") {
        const el2 = this.containerEl;
        const menuOpen = el2.querySelector(".tempvs-estimate-menu")?.open;
        el2.empty();
        el2.addClass("tempvs-daily");
        const error2 = this.controller.errors.get(this.ctx.sourcePath);
        if (error2) el2.createEl("p", { text: error2, cls: "tempvs-daily-error" });
        const note = this.controller.plugin.estimates?.find(this.ctx.sourcePath);
        if (note && !note.archived) {
          const box = this.controller.plugin.estimates.render(el2, note);
          if (menuOpen) box.querySelector(".tempvs-estimate-menu").open = true;
        }
        return;
      }
      const el = this.containerEl;
      el.empty();
      el.addClass("tempvs-daily");
      const code = el.createEl("pre").createEl("code");
      const records = this.controller.plugin.state.history.filter((h) => h.registerBlock === this.controller.bindingId(this.ctx.sourcePath));
      const plannedRows = new Set(records.filter((r) => r.planned).map((r) => r.sourceRow));
      const register = isRegister(this.source);
      const lines = plain(this.source).split("\n");
      for (const [index, line] of lines.entries()) {
        if (index) code.append("\n");
        if (register && !context.kind && (plannedRows.has(index) || records.some((r) => !r.planned && r.sourceRow === index)))
          code.createSpan({ cls: "tempvs-muted", text: plannedRows.has(index) ? "Pianificata \xB7 " : "Registrata \xB7 " });
        if (line.startsWith("Calendar \xB7 ") && line.includes(" <!-- gcal:")) {
          const areaId = line.match(/ area:([^ ]+) -->$/)?.[1];
          const area = this.controller.plugin.config.areas.find((a) => a.id === areaId);
          code.createSpan({ text: line.slice(0, line.lastIndexOf(" <!-- gcal:")) + (area ? " \xB7 " + area.name : "") });
          continue;
        }
        renderSyntaxLine(code, line, this.controller.plugin.config.areas, (target, newLeaf) => this.controller.plugin.app.workspace.openLinkText(target, this.ctx.sourcePath, newLeaf).catch((e) => new import_obsidian4.Notice(e.message)));
      }
      const error = this.controller.errors.get(this.ctx.sourcePath);
      const binding = this.controller.bindings[this.controller.bindingId(this.ctx.sourcePath)];
      if (context.kind === "ledger") {
        if (error) el.createEl("small", { text: error });
        return;
      }
      if (isRegister(this.source)) {
        const rows = this.controller.plugin.state.history.filter((h) => h.registerBlock === this.controller.bindingId(this.ctx.sourcePath));
        const minutes2 = (items) => new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 }).format(items.reduce((sum, h) => sum + h.minutes, 0));
        const planned = rows.filter((row3) => row3.planned), registered = rows.filter((row3) => !row3.planned);
        const summary = (planned.length ? minutes2(planned) + " min pianificati \xB7 " : "") + minutes2(registered) + " min registrati, pause comprese";
        el.createEl("small", { text: error || summary, attr: { role: error ? "alert" : "status" } });
        const legacy = lines.map(matchBudgetHeading).find((heading) => heading?.legacy);
        if (legacy && !error) el.createEl("small", { cls: "tempvs-muted", text: "Per il budget usa " + legacy.name + " = " + legacy.value + legacy.unit + "." });
        return;
      }
      const manual = daySessions(this.controller.plugin.state, context.date, this.controller.bindingId(this.ctx.sourcePath)).filter((s) => s.noteBlockId === this.controller.bindingId(this.ctx.sourcePath));
      const actual = manual.reduce((n, s) => n + (sessionBounds(s).end - sessionBounds(s).start), 0) / 6e4;
      el.createEl("small", { text: error || (binding?.source === this.source ? "Intervalli sincronizzati" + (manual.length ? " \xB7 " + new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 }).format(actual) + " min registrati, pause comprese" : "") + (binding.unusedMinutes ? " \xB7 " + binding.unusedMinutes + " minuti finali liberi" : "") : "Aggiornamento automatico\u2026"), cls: error ? "tempvs-daily-error" : "tempvs-muted", attr: { role: error ? "alert" : "status" } });
    } catch (error) {
      if (this.disposed || version !== this.version) return;
      this.containerEl.empty();
      this.containerEl.createEl("p", { text: error.message, cls: "tempvs-daily-error" });
    }
  }
};

// obsidian/main.js
var import_obsidian7 = require("obsidian");

// obsidian/cloud-adapter.js
var import_obsidian5 = require("obsidian");
function confirmTempvs(app, title, description) {
  return new Promise((resolve) => {
    class Confirmation extends import_obsidian5.Modal {
      onOpen() {
        this.setTitle(title);
        this.contentEl.createEl("p", { text: description });
        const actions = this.contentEl.createDiv({ cls: "tempvs-controls" });
        actions.createEl("button", { text: "Conferma", cls: "mod-warning" }).onclick = () => {
          this.done = true;
          resolve(true);
          this.close();
        };
        actions.createEl("button", { text: "Annulla" }).onclick = () => this.close();
      }
      onClose() {
        if (!this.done) resolve(false);
        this.contentEl.empty();
      }
    }
    new Confirmation(app).open();
  });
}

// core/tempo-audio.js
var TempoAmbientAudio = class _TempoAmbientAudio {
  constructor(onChange = () => {
  }) {
    this.onChange = onChange;
    this.context = null;
    this.master = null;
    this.nodes = [];
    this.crackleTimer = null;
    this.pendingCleanups = /* @__PURE__ */ new Map();
    this.playing = false;
    this.audible = false;
    this.kind = "off";
    this.volume = 0.25;
    this.generation = 0;
  }
  static createNoise(context, seconds = 4) {
    const length = Math.floor(context.sampleRate * seconds);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }
  setVolume(value) {
    this.volume = Math.max(0, Math.min(1, Number(value) || 0));
    if (this.playing && this.audible && this.master && this.context) {
      const now = this.context.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setValueAtTime(this.master.gain.value, now);
      this.master.gain.setTargetAtTime(this.volume, now, 0.05);
    }
  }
  async start(kind, volume = this.volume, audible = true) {
    if (!["white", "brown", "rain", "fire"].includes(kind)) return false;
    const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Context) return false;
    this.stop(0);
    this.setVolume(volume);
    const generation = this.generation;
    let resumeTimeout;
    try {
      try {
        if (globalThis.navigator?.audioSession) globalThis.navigator.audioSession.type = "ambient";
      } catch (_) {
      }
      if (!this.context || this.context.state === "closed") this.context = new Context();
      const context = this.context;
      context.onstatechange = () => {
        if (this.context === context) this.onChange(this.playing, this.kind);
      };
      const resumed = Promise.race([
        context.resume(),
        new Promise((_, reject) => {
          resumeTimeout = setTimeout(() => reject(new Error("Audio activation timed out")), 5e3);
        })
      ]);
      const master = context.createGain();
      this.audible = Boolean(audible);
      master.gain.value = this.audible ? this.volume : 0;
      master.connect(context.destination);
      this.master = master;
      this.kind = kind;
      const source = context.createBufferSource();
      source.buffer = _TempoAmbientAudio.createNoise(context);
      source.loop = true;
      const filter = context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = kind === "white" ? 16e3 : kind === "brown" ? 220 : kind === "rain" ? 4200 : 950;
      source.connect(filter);
      filter.connect(master);
      source.start();
      this.nodes.push(source, filter, master);
      if (kind === "rain") {
        const oscillator = context.createOscillator();
        const depth = context.createGain();
        oscillator.frequency.value = 0.13;
        depth.gain.value = 1100;
        oscillator.connect(depth);
        depth.connect(filter.frequency);
        oscillator.start();
        this.nodes.push(oscillator, depth);
      }
      await resumed;
      if (this.generation !== generation || this.context !== context) return false;
      if (context.state !== "running") throw new Error("Audio context is not running");
      this.playing = true;
      this.onChange(true, kind);
      if (kind === "fire") {
        const generation2 = this.generation;
        const crackle = () => {
          if (!this.playing || !this.audible || this.generation !== generation2) return;
          const click = context.createBufferSource();
          const gain = context.createGain();
          const hp = context.createBiquadFilter();
          click.buffer = _TempoAmbientAudio.createNoise(context, 0.08);
          hp.type = "highpass";
          hp.frequency.value = 1800;
          const now = context.currentTime;
          gain.gain.setValueAtTime(1e-4, now);
          gain.gain.linearRampToValueAtTime(0.1, now + 8e-3);
          gain.gain.exponentialRampToValueAtTime(1e-4, now + 0.07);
          click.connect(hp);
          hp.connect(gain);
          gain.connect(master);
          click.start();
          click.stop(now + 0.08);
          click.onended = () => {
            click.disconnect();
            hp.disconnect();
            gain.disconnect();
          };
        };
        this.crackleTimer = setInterval(crackle, 650);
      }
      return true;
    } catch (error) {
      if (this.generation === generation) this.stop(0);
      return false;
    } finally {
      clearTimeout(resumeTimeout);
    }
  }
  /**
   * Keep user consent and sound selection armed while muting the graph.
   * Keep the context running so scheduled focus can resume without a new gesture.
   */
  setAudible(enabled, fadeSeconds = 0.9) {
    if (!this.playing || !this.context || !this.master) return;
    const audible = Boolean(enabled);
    if (this.audible === audible && (!audible || this.context.state === "running")) return;
    this.audible = audible;
    const generation = this.generation;
    const context = this.context;
    const master = this.master;
    const apply = () => {
      if (!this.playing || this.generation !== generation || this.master !== master) return;
      if (this.audible !== audible) return;
      const now = context.currentTime;
      const duration2 = Math.max(0, audible ? 0.35 : fadeSeconds);
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(audible ? this.volume : 0, now + duration2);
    };
    if (audible) void context.resume().then(apply).catch(() => {
      if (this.generation === generation) {
        this.audible = false;
        this.onChange(this.playing, this.kind);
      }
    });
    else apply();
  }
  stop(fadeSeconds = 0.9) {
    ++this.generation;
    this.playing = false;
    this.audible = false;
    this.kind = "off";
    if (this.crackleTimer !== null) clearInterval(this.crackleTimer);
    this.crackleTimer = null;
    const nodes = this.nodes;
    const master = this.master;
    this.nodes = [];
    this.master = null;
    const cleanup = () => {
      for (const node of nodes) {
        try {
          node.stop?.();
        } catch (_) {
        }
        try {
          node.disconnect?.();
        } catch (_) {
        }
      }
    };
    if (nodes.length && master && this.context && this.context.state === "running" && fadeSeconds > 0) {
      const now = this.context.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(0, now + fadeSeconds);
      const timer = setTimeout(() => {
        cleanup();
        this.pendingCleanups.delete(timer);
      }, fadeSeconds * 1e3 + 80);
      this.pendingCleanups.set(timer, cleanup);
    } else cleanup();
    this.onChange(false, "off");
  }
  destroy() {
    this.stop(0);
    for (const [timer, cleanup] of this.pendingCleanups) {
      clearTimeout(timer);
      cleanup();
    }
    this.pendingCleanups.clear();
    if (this.context) this.context.close().catch(() => {
    });
    this.context = null;
  }
};

// core/tempo-chime.js
var FocusEndChime = class {
  constructor() {
    this.context = null;
    this.lastPlayed = -Infinity;
  }
  arm() {
    const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Context) return false;
    try {
      try {
        if (globalThis.navigator?.audioSession) globalThis.navigator.audioSession.type = "ambient";
      } catch {
      }
      if (!this.context || this.context.state === "closed") {
        this.context = new Context();
        this.lastPlayed = -Infinity;
      }
      if (this.context.state !== "running") void this.context.resume().catch(() => {
      });
      return true;
    } catch {
      return false;
    }
  }
  async play(phase = "break") {
    if (!this.arm()) return false;
    const context = this.context;
    try {
      if (context.state !== "running") await context.resume();
      if (context !== this.context || context.state !== "running") return false;
      const now = context.currentTime;
      if (now - this.lastPlayed < 0.8) return false;
      this.lastPlayed = now;
      const notes = phase === "work" ? [[0, 784], [0.2, 1047]] : [[0, 880], [0.2, 659]];
      for (const [offset, frequency] of notes) {
        const oscillator = context.createOscillator();
        const envelope = context.createGain();
        oscillator.type = "triangle";
        oscillator.frequency.value = frequency;
        envelope.gain.setValueAtTime(1e-4, now + offset);
        envelope.gain.exponentialRampToValueAtTime(0.2, now + offset + 0.022);
        envelope.gain.exponentialRampToValueAtTime(1e-4, now + offset + 0.4);
        oscillator.connect(envelope);
        envelope.connect(context.destination);
        oscillator.start(now + offset);
        oscillator.stop(now + offset + 0.42);
        oscillator.onended = () => {
          oscillator.disconnect();
          envelope.disconnect();
        };
      }
      return true;
    } catch {
      return false;
    }
  }
  destroy() {
    if (this.context) void this.context.close().catch(() => {
    });
    this.context = null;
  }
};

// obsidian/main.js
var VIEW_TYPE = "tempvs-timer";
var ZERO = () => normalizeArchive({ sessions: [] });
var uuid = () => globalThis.crypto?.randomUUID?.() || String(Date.now()) + "-" + Math.random().toString(36).slice(2);
var button = (parent, label, action2) => {
  const el = parent.createEl("button", { text: label });
  el.addEventListener("click", () => Promise.resolve().then(action2).catch((e) => new import_obsidian7.Notice(e.message)));
  return el;
};
var today = () => localDateString();
var shiftDate = (value, change) => {
  const d = /* @__PURE__ */ new Date(value + "T12:00:00");
  if (Number.isNaN(d.getTime())) return today();
  d.setDate(d.getDate() + change);
  return localDateString(d);
};
var iconButton = (parent, icon, label, action2) => {
  const el = parent.createEl("button", { cls: "tempvs-icon-button", attr: { "aria-label": label, "title": label } });
  (0, import_obsidian7.setIcon)(el, icon);
  el.addEventListener("click", () => Promise.resolve().then(action2).catch((e) => new import_obsidian7.Notice(e.message)));
  return el;
};
var setPanel = (el, show) => {
  el.hidden = !show;
};
var TempvsView = class extends import_obsidian7.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.day = today();
    this.panel = null;
    this.creation = "start";
    this.panelId = "tempvs-" + uuid();
    this.planDay = null;
  }
  getViewType() {
    return VIEW_TYPE;
  }
  getDisplayText() {
    return "TEMPVS";
  }
  getIcon() {
    return "timer";
  }
  async onOpen() {
    this.draw();
    this.loadAllocations();
    if (typeof IntersectionObserver === "function") {
      this.visibilityObserver = new IntersectionObserver((entries) => {
        this.timerVisible = entries.at(-1).isIntersecting;
        this.plugin.updateClock();
        if (this.plugin.eink && this.timerVisible) this.update(true);
      });
      this.visibilityObserver.observe(this.containerEl);
    }
  }
  loadAllocations() {
    this.plugin.daily.loadAllocations(this.day).catch((error) => new import_obsidian7.Notice(error.message));
  }
  async onClose() {
    this.visibilityObserver?.disconnect();
    this.timerVisible = false;
    this.plugin.updateClock();
  }
  draw() {
    const plugin = this.plugin;
    const root = this.containerEl.children[1];
    root.empty();
    root.addClass("tempvs-root");
    root.toggleClass("tempvs-wide", plugin.layout === "wide");
    const heading = root.createDiv({ cls: "tempvs-header" });
    const brand = heading.createDiv({ cls: "tempvs-brand" });
    brand.createEl("h3", { text: "TEMPVS" });
    const actions = heading.createDiv({ cls: "tempvs-heading-actions" });
    iconButton(actions, "settings", "Impostazioni TEMPVS", () => plugin.openSettings());
    const timer = root.createDiv({ cls: "tempvs-timer" });
    timer.createDiv({ cls: "tempvs-phase" });
    const face = timer.createDiv({ cls: "tempvs-face" });
    face.createDiv({ cls: "tempvs-clock" });
    timer.createDiv({ cls: "tempvs-area" });
    const progress = face.createDiv({ cls: "tempvs-progress", attr: { role: "progressbar", "aria-label": "Avanzamento della fase", "aria-valuemin": "0", "aria-valuemax": "100" } });
    progress.createDiv({ cls: "tempvs-progress-fill" });
    timer.createDiv({ cls: "tempvs-timer-hint" });
    const controls = root.createDiv({ cls: "tempvs-controls tempvs-primary-controls" });
    const pauseButton = button(controls, "Pausa", () => plugin.togglePause());
    pauseButton.addClass("mod-cta", "tempvs-pause-button");
    const finishButton = button(controls, "Concludi", () => plugin.finish());
    finishButton.addClass("tempvs-finish-button");
    const sessionHeader = root.createDiv({ cls: "tempvs-section-heading" });
    sessionHeader.createEl("h4", { text: "La tua agenda" });
    const nav = sessionHeader.createDiv({ cls: "tempvs-date-nav" });
    iconButton(nav, "chevron-left", "Giorno precedente", () => this.selectDay(shiftDate(this.day, -1)));
    const dateLabel = nav.createEl("button", { cls: "tempvs-day-label", text: "Oggi", attr: { title: "Torna a oggi", "aria-label": "Data selezionata: oggi. Torna a oggi" } });
    dateLabel.onclick = () => this.selectDay(today());
    iconButton(nav, "chevron-right", "Giorno successivo", () => this.selectDay(shiftDate(this.day, 1)));
    const picker = nav.createEl("input", { attr: { type: "date", "aria-label": "Vai alla data" } });
    picker.onchange = () => {
      if (validDay(picker.value)) this.selectDay(picker.value);
    };
    root.createDiv({ cls: "tempvs-daily-status", attr: { role: "status" } });
    root.createDiv({ cls: "tempvs-sessions" });
    const add = button(root, "+ Nuova sessione", () => this.togglePanel("create"));
    add.addClass("mod-cta", "tempvs-add-button");
    add.dataset.panel = "create";
    const quickActions = root.createDiv({ cls: "tempvs-shortcuts" });
    const planShortcut = iconButton(quickActions, "calendar-days", "Pianifica", () => {
      this.creation = "plan";
      this.togglePanel("create", true);
      this.showCreation();
    });
    planShortcut.createSpan({ text: "Pianifica" });
    planShortcut.dataset.panel = "create";
    const soundShortcut = iconButton(quickActions, "volume-2", "Suoni", () => this.togglePanel("sound"));
    soundShortcut.createSpan({ text: "Suoni" });
    soundShortcut.dataset.panel = "sound";
    const panels = root.createDiv({ cls: "tempvs-panels" });
    const create = panels.createDiv({ cls: "tempvs-panel tempvs-create-panel" });
    create.hidden = true;
    create.createEl("h4", { text: "Crea il tuo prossimo momento" });
    const method = create.createEl("select", { cls: "tempvs-method", attr: { "aria-label": "Metodo di inserimento" } });
    method.createEl("option", { text: "Avvia adesso", value: "start" });
    method.createEl("option", { text: "Pianificazione rapida", value: "plan" });
    method.value = this.creation;
    method.onchange = () => {
      this.creation = method.value;
      this.showCreation();
    };
    const startBox = create.createDiv({ cls: "tempvs-method-start" });
    const form = startBox.createEl("form", { cls: "tempvs-form" });
    const field = (parent, label) => parent.createEl("label", { cls: "tempvs-field", text: label });
    const area = field(form, "A cosa vuoi dedicarti?").createEl("select", { attr: { "aria-label": "Area" } });
    for (const a of plugin.config.areas) area.createEl("option", { text: a.name, attr: { value: a.name } });
    const gross = field(form, "Durata totale \xB7 minuti").createEl("input", { attr: { type: "number", min: "1", max: "1439", value: "30", "aria-label": "Durata totale in minuti", placeholder: "Minuti totali" } });
    gross.required = true;
    const presets = form.createDiv({ cls: "tempvs-presets", attr: { role: "group", "aria-label": "Durate rapide" } });
    const updatePresets = () => {
      for (const el of presets.children) el.setAttribute("aria-pressed", String(el.dataset.minutes === gross.value));
    };
    for (const value of [15, 30, 60]) {
      const preset = button(presets, value + " min", () => {
        gross.value = String(value);
        updatePresets();
      });
      preset.type = "button";
      preset.dataset.minutes = String(value);
    }
    gross.addEventListener("input", updatePresets);
    updatePresets();
    form.createEl("p", { cls: "tempvs-help", text: "La durata totale comprende focus e pause. Il timer segue l\u2019orario anche quando sospendi il conteggio del focus." });
    const advanced = form.createEl("details");
    advanced.createEl("summary", { text: "Focus e pause (avanzate)" });
    const focus = field(advanced, "Durata di ogni focus \xB7 minuti").createEl("input", { attr: { type: "number", min: "1", max: "240", value: String(plugin.state.defaults.workMinutes), "aria-label": "Minuti focus" } });
    focus.required = true;
    const pause = field(advanced, "Pausa finale \xB7 minuti (facoltativa)").createEl("input", { attr: { type: "number", min: "0", max: "1438", placeholder: "Pausa personalizzata (facoltativa)", "aria-label": "Minuti di pausa" } });
    form.createEl("button", { text: "Avvia", cls: "mod-cta", attr: { type: "submit" } });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (form.dataset.busy) return;
      form.dataset.busy = "true";
      const submit = form.querySelector('[type="submit"]');
      submit.disabled = true;
      plugin.start(area.value, Number(gross.value), Number(focus.value), pause.value === "" ? void 0 : Number(pause.value)).then(() => this.togglePanel(null, true)).catch((err) => new import_obsidian7.Notice(err.message)).finally(() => {
        delete form.dataset.busy;
        submit.disabled = false;
      });
    });
    const planBox = create.createDiv({ cls: "tempvs-method-plan" });
    const plan = planBox.createEl("form", { cls: "tempvs-form" });
    this.planDay = null;
    const dateInput = field(plan, "Giorno").createEl("input", { attr: { type: "date", "aria-label": "Data", value: this.day } });
    dateInput.required = true;
    const plannedArea = field(plan, "Area").createEl("select", { attr: { "aria-label": "Area da pianificare" } });
    for (const a of plugin.config.areas) plannedArea.createEl("option", { text: a.name, value: a.name });
    const planFields = plan.createDiv({ cls: "tempvs-plan-fields" });
    const startTime = field(planFields, "Ora di inizio").createEl("input", { attr: { type: "time" } });
    const duration2 = field(planFields, "Durata \xB7 minuti").createEl("input", { attr: { type: "number", min: "1", max: "1439", value: "30", required: "" } });
    plan.createEl("p", { text: "Lascia vuoto l\u2019orario per assegnare la durata e impostare il timer in seguito." });
    let plannedNote;
    const noteField = plan.createDiv({ cls: "tempvs-controls" });
    const noteChoice = button(noteField, "Collega nota dell\u2019attivit\xE0", () => new SessionNotePicker(plugin.app, (value) => {
      const [note] = noteLinks(value);
      if (!note) throw Error("Nota non valida.");
      plannedNote = note;
      noteChoice.textContent = note.label;
      clearNote.hidden = false;
    }).open());
    noteChoice.type = "button";
    const clearNote = button(noteField, "Scollega nota dell\u2019attivit\xE0", () => {
      plannedNote = void 0;
      noteChoice.textContent = "Collega nota dell\u2019attivit\xE0";
      clearNote.hidden = true;
    });
    clearNote.type = "button";
    clearNote.hidden = true;
    const cycleInput = field(plan, "Pomodoro lordo \xB7 minuti (facoltativo)").createEl("input", { attr: { type: "number", min: "1", max: "1439", placeholder: "Es. 60 \u2192 50 focus + 10 pausa", "aria-label": "Durata lorda del pomodoro" } });
    const cycleHint = plan.createEl("p", { cls: "tempvs-help", text: "Lascia vuoto per usare il focus predefinito. La durata totale della sessione comprende tutte le pause." });
    cycleInput.addEventListener("input", () => {
      try {
        const c = grossCycle(Number(cycleInput.value));
        cycleHint.textContent = `Ogni pomodoro: ${c.focusMinutes} min focus + ${c.breakMinutes} min pausa. L\u2019ultimo ciclo si ferma alla fine della sessione.`;
      } catch {
        cycleHint.textContent = cycleInput.value ? "Inserisci da 2 a 288 minuti interi." : "Lascia vuoto per usare il focus predefinito.";
      }
    });
    const batch = plan.createEl("details", { cls: "tempvs-batch" });
    batch.createEl("summary", { text: "Inserisci pi\xF9 sessioni con il testo" });
    batch.createEl("p", { cls: "tempvs-help", text: "14:00-16:00 30m Studio crea quattro sessioni da 25 minuti di concentrazione e 5 di pausa. La fascia pu\xF2 superare la mezzanotte." });
    const lines = field(batch, "Sessioni in formato rapido").createEl("textarea", { attr: { "aria-label": "Sessioni", placeholder: "14:00-16:00 30m Studio\n18:00-19:30 45m Lavoro", rows: "3" } });
    const updatePlanMode = () => {
      const textMode = Boolean(lines.value.trim());
      for (const input of [plannedArea, startTime, duration2, cycleInput]) input.disabled = textMode;
      noteField.hidden = textMode;
    };
    lines.addEventListener("input", updatePlanMode);
    plan.createEl("button", { text: "Programma", cls: "mod-cta", attr: { type: "submit" } });
    plan.addEventListener("submit", (e) => {
      e.preventDefault();
      if (plan.dataset.busy) return;
      plan.dataset.busy = "true";
      const submit = plan.querySelector('[type="submit"]');
      submit.disabled = true;
      const date = dateInput.value;
      const text = lines.value.trim();
      const area2 = plugin.config.areas.find((a) => a.name === plannedArea.value);
      const request = { area: area2?.name, areaId: area2?.id, minutes: duration2.valueAsNumber };
      if (cycleInput.value) request.cycleMinutes = cycleInput.valueAsNumber;
      const save = text ? plugin.schedule(text, date) : startTime.value ? plugin.scheduleRequests([{ ...request, start: startTime.value }], date, plannedNote) : plugin.assignTime(request, date, plannedNote);
      save.then(() => {
        clearNote.click();
        lines.value = "";
        startTime.value = "";
        updatePlanMode();
        this.togglePanel(null, true);
        this.selectDay(date);
      }).catch((err) => new import_obsidian7.Notice(err.message)).finally(() => {
        delete plan.dataset.busy;
        submit.disabled = false;
      });
    });
    const sounds = panels.createDiv({ cls: "tempvs-panel tempvs-sound-panel" });
    sounds.hidden = true;
    sounds.createEl("h4", { text: "Suoni di sottofondo" });
    sounds.createEl("p", { cls: "tempvs-help", text: "Attiva il sottofondo in anticipo: partir\xE0 alla concentrazione, anche come avviso. Resta silenzioso nelle pause. Tieni Obsidian aperto; dopo la riapertura, attivalo di nuovo." });
    const soundChoice = sounds.createEl("select", { cls: "tempvs-sound-choice", attr: { "aria-label": "Rumore ambientale" } });
    for (const [value, label] of [["white", "Rumore bianco"], ["brown", "Rumore marrone"], ["rain", "Pioggia"], ["fire", "Caminetto"]]) soundChoice.createEl("option", { value, text: label });
    soundChoice.value = plugin.audioKind;
    soundChoice.addEventListener("change", () => void plugin.selectAmbient(soundChoice.value).catch((e) => new import_obsidian7.Notice(e.message)));
    const soundVolume = sounds.createDiv({ cls: "tempvs-sound-volume" });
    soundVolume.createEl("label", { text: "Volume", attr: { for: "tempvs-volume" } });
    const slider = soundVolume.createEl("input", { cls: "tempvs-volume-slider", attr: { type: "range", id: "tempvs-volume", min: "0", max: "100", step: "1", "aria-label": "Volume audio" } });
    slider.value = String(plugin.audioVolume);
    slider.addEventListener("input", () => plugin.adjustAmbientVolume(Number(slider.value)));
    slider.addEventListener("change", () => void plugin.persist().catch((e) => new import_obsidian7.Notice(e.message)));
    const soundToggle = sounds.createEl("button", { cls: "tempvs-sound-toggle mod-cta", text: "Avvia suono" });
    soundToggle.addEventListener("click", () => void plugin.toggleAmbient().catch((e) => new import_obsidian7.Notice(e.message)));
    sounds.createDiv({ cls: "tempvs-sound-status", attr: { role: "status", "aria-live": "polite" } });
    const volumeValue = soundVolume.createEl("output", { text: slider.value + "%", "attr": { "aria-label": "Volume selezionato" } });
    slider.addEventListener("input", () => {
      volumeValue.textContent = slider.value + "%";
    });
    for (const [name, panel] of [["create", create], ["sound", sounds]]) {
      const header2 = panel.createDiv({ cls: "tempvs-panel-heading" });
      header2.appendChild(panel.querySelector("h4"));
      panel.prepend(header2);
      iconButton(header2, "x", "Chiudi pannello", () => {
        this.togglePanel(null, true);
        root.querySelector(`[data-panel="${name}"]`)?.focus();
      });
    }
    root.onkeydown = (e) => {
      if (e.key === "Escape" && this.panel) {
        const name = this.panel;
        this.togglePanel(null, true);
        root.querySelector(`[data-panel="${name}"]`)?.focus();
        e.stopPropagation();
      }
    };
    this.showCreation();
    this.applyPanel();
    this.update(true);
  }
  selectDay(day) {
    this.day = day;
    this.loadAllocations();
    this.showCreation();
    this.update(true);
  }
  showCreation() {
    const root = this.containerEl.children[1];
    const start = root.querySelector(".tempvs-method-start");
    const plan = root.querySelector(".tempvs-method-plan");
    if (start) start.hidden = this.creation !== "start";
    if (plan) plan.hidden = this.creation !== "plan";
    const choice = root.querySelector(".tempvs-method");
    if (choice) choice.value = this.creation;
    if (this.creation === "plan" && this.planDay !== this.day) {
      root.querySelector('.tempvs-method-plan input[type="date"]').value = this.day;
      this.planDay = this.day;
    }
  }
  togglePanel(panel, force = false) {
    this.panel = force ? panel : this.panel === panel ? null : panel;
    this.showCreation();
    this.applyPanel();
    if (this.panel) {
      const el = this.containerEl.children[1].querySelector(".tempvs-" + this.panel + "-panel");
      el?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "nearest" });
      el?.querySelector("select, input, button")?.focus({ preventScroll: true });
    }
  }
  applyPanel() {
    const root = this.containerEl.children[1];
    for (const name of ["create", "sound"]) {
      const el = root.querySelector(".tempvs-" + name + "-panel");
      if (el) {
        el.id = this.panelId + "-" + name;
        setPanel(el, this.panel === name);
      }
    }
    for (const trigger of root.querySelectorAll("[data-panel]")) {
      trigger.setAttribute("aria-controls", this.panelId + "-" + trigger.dataset.panel);
      trigger.setAttribute("aria-expanded", String(trigger.dataset.panel === this.panel));
      trigger.toggleClass("is-active", trigger.dataset.panel === this.panel);
    }
  }
  updateSoundControls() {
    const root = this.containerEl.children[1], plugin = this.plugin;
    if (!root?.hasClass("tempvs-root")) return;
    const active = plugin.active();
    const eligible = Boolean(active && !active.paused && getPhase(active).kind === "work");
    const toggle = root.querySelector(".tempvs-sound-toggle");
    if (toggle) {
      toggle.disabled = false;
      toggle.textContent = plugin.ambient.playing ? "Disattiva sottofondo" : eligible ? "Avvia suono" : "Attiva per le sessioni";
    }
    const status = root.querySelector(".tempvs-sound-status");
    if (status) status.textContent = plugin.ambient.playing ? plugin.ambient.audible ? "Suono attivo" : "Audio pronto \xB7 in attesa della concentrazione" : eligible ? "Pronto" : "Attiva ora per sentire il sottofondo all\u2019inizio delle sessioni";
  }
  renderSessionNotes(parent, notes, session, ids) {
    const resources = parent.createDiv({ cls: "tempvs-session-resources" });
    const source = this.plugin.dailyNotes?.[session.noteBlockId]?.path || "";
    let more;
    for (const [index, note] of notes.entries()) {
      if (index === 1) {
        more = resources.createEl("details");
        more.createEl("summary", { text: "Risorse (" + (notes.length - 1) + ")" });
      }
      const row3 = (more || resources).createDiv({ cls: "tempvs-session-note" });
      const label = note.label || note.path;
      const link = row3.createEl("a", { cls: "internal-link tempvs-session-resource", text: label, attr: { href: note.path, title: note.path } });
      link.addEventListener("click", (event) => {
        event.preventDefault();
        void this.plugin.app.workspace.openLinkText(note.path, source, event.metaKey || event.ctrlKey).catch((e) => new import_obsidian7.Notice(e.message));
      });
      if (index > 0) iconButton(row3, "arrow-up", "Rendi principale " + label, () => this.plugin.setSessionNote(ids, "", { primaryPath: note.path }));
      iconButton(row3, "x", "Scollega " + label, () => this.plugin.setSessionNote(ids, "", { removePath: note.path }));
    }
    button(resources, notes.length ? "Cambia nota" : "\uFF0B Collega nota", () => new SessionNotePicker(this.plugin.app, (value) => this.plugin.setSessionNote(ids, value)).open());
  }
  update(full = false) {
    const root = this.containerEl.children[1];
    if (!root?.hasClass("tempvs-root")) return;
    const plugin = this.plugin;
    const active = plugin.active();
    const phase = active ? getPhase(active) : null;
    const next = active ? null : getNextSession(plugin.state.sessions.filter((s) => !s.finished && !s.dailyRetired && !s.manualSuperseded));
    const upcoming = next ? getPhase(next, sessionBounds(next).start) : null;
    root.querySelector(".tempvs-timer").dataset.state = active?.paused ? "paused" : phase?.kind || "idle";
    root.querySelector(".tempvs-phase").textContent = active?.paused ? "Conteggio focus sospeso" : phase ? phase.label : next ? "Prossima sessione" : "Pronto per concentrarti";
    root.querySelector(".tempvs-clock").textContent = phase ? mmss(phase.remaining) : upcoming ? mmss(upcoming.remaining) : String(plugin.state.defaults.workMinutes).padStart(2, "0") + ":00";
    root.querySelector(".tempvs-area").textContent = active ? active.area || active.title : next ? next.area || next.title : "Scegli un\u2019area e inizia una sessione";
    const progress = root.querySelector(".tempvs-progress");
    const timer = root.querySelector(".tempvs-timer");
    const area = plugin.config.areas.find((a) => a.name === (active || next)?.area);
    timer.style.setProperty("--tempvs-area-color", area?.color || "var(--interactive-accent)");
    timer.dataset.style = plugin.eink ? "digits" : plugin.timerStyle;
    timer.dataset.size = plugin.clockSize;
    timer.style.setProperty("--tempvs-progress-angle", (phase?.progress || 0) * 3.6 + "deg");
    progress.hidden = plugin.eink || !phase || plugin.timerStyle === "digits";
    progress.setAttribute("aria-valuenow", String(Math.round(phase?.progress || 0)));
    progress.firstElementChild.style.width = (phase?.progress || 0) + "%";
    root.querySelector(".tempvs-timer-hint").textContent = phase ? "Fine sessione alle " + formatTime(phase.sessionEnd) + (active.paused ? " \xB7 L\u2019orario continua a scorrere" : "") : next ? "Inizio alle " + next.start + (next.date !== today() ? " \xB7 " + next.date : "") + " \xB7 fine alle " + next.end : "Il tuo prossimo passo: Nuova sessione";
    const pause = root.querySelector(".tempvs-pause-button");
    const finish = root.querySelector(".tempvs-finish-button");
    if (pause) {
      pause.disabled = !active;
      pause.textContent = active?.paused ? "Riprendi" : "Pausa";
    }
    if (pause) pause.title = "Sospende il conteggio del focus; gli orari della sessione continuano a scorrere.";
    if (finish) finish.disabled = !active;
    root.querySelector(".tempvs-primary-controls").hidden = !active;
    this.updateSoundControls();
    const dailyStatus = root.querySelector(".tempvs-daily-status");
    if (dailyStatus) {
      const path = plugin.app.workspace.getActiveFile?.()?.path;
      const error = plugin.daily?.errors.get(path);
      dailyStatus.textContent = error ? "TEMPVS: " + error : "";
      dailyStatus.hidden = !error;
      dailyStatus.toggleClass("tempvs-daily-error", Boolean(error));
    }
    if (!full) return;
    const dayLabel = root.querySelector(".tempvs-day-label");
    if (dayLabel) {
      dayLabel.textContent = this.day === today() ? "Oggi" : new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short" }).format(/* @__PURE__ */ new Date(this.day + "T12:00:00"));
      dayLabel.setAttribute("aria-label", "Data selezionata: " + this.day + ". Torna a oggi");
    }
    root.querySelector(".tempvs-date-nav input").value = this.day;
    const list = root.querySelector(".tempvs-sessions");
    const pendingTime = new Map([...list.querySelectorAll("[data-allocation]")].map((input) => [input.dataset.allocation, input.value]));
    const focusedTime = list.ownerDocument?.activeElement?.dataset?.allocation;
    list.empty();
    const tint = (element, id, name) => {
      if (plugin.eink) return;
      const area2 = plugin.config.areas.find((a) => id && a.id === id || a.name === name);
      if (!area2?.color) return;
      element.addClass("tempvs-agenda-tint");
      element.style.setProperty("--tempvs-area-color", area2.color);
    };
    const now = /* @__PURE__ */ new Date();
    const registered = plugin.state.history.filter((h) => h.registerBlock && h.registerDay === this.day && !h.planned);
    const binding = Object.values(plugin.dailyNotes || {}).find((b) => b.date === this.day);
    const events = calendarRows(binding?.source);
    const budgets = (binding?.budgets || []).map((b) => {
      const area2 = plugin.config.areas.find((a) => a.name === b.area);
      const minutes2 = events.filter((e) => e.area === area2?.id).reduce((n, e) => n + e.minutes, 0);
      return { ...b, assigned: b.assigned + minutes2 * 60 };
    });
    for (const b of budgets) {
      const difference = b.seconds - b.assigned;
      list.createEl("p", { text: b.area + " \xB7 " + readableDuration(b.assigned) + " su " + readableDuration(b.seconds) + (difference ? " \xB7 " + readableDuration(Math.abs(difference)) + (difference > 0 ? " disponibili" : " oltre il budget") : "") });
    }
    const sessions = plugin.state.sessions.filter((s) => {
      if (s.registerMinutes) return false;
      if (s.dailyRetired || s.manualSuperseded) return false;
      return s.date === this.day || this.day === today() && sessionBounds(s).start <= now && sessionBounds(s).end > now;
    }).sort((a, b) => sessionBounds(a).start - sessionBounds(b).start);
    const expanded = this.expandedGroups ?? (this.expandedGroups = /* @__PURE__ */ new Set());
    const timeline = registered.map((record) => ({
      record,
      start: record.start ? (/* @__PURE__ */ new Date((record.date || this.day) + "T" + record.start)).getTime() : Infinity
    }));
    for (const group of groupSessions(sessions, plugin.estimates?.notes || [])) {
      timeline.push({ group, start: +sessionBounds(group.sessions[0]).start });
    }
    for (const event of events) {
      const time2 = event.time === "Tutto il giorno" ? "00:00" : event.time.slice(0, 5);
      timeline.push({ event, start: +/* @__PURE__ */ new Date(this.day + "T" + time2) });
    }
    timeline.sort((a, b) => a.start - b.start);
    let body;
    for (const { record, group, event } of timeline) {
      if (event) {
        body = null;
        const item2 = list.createDiv({ cls: "tempvs-session tempvs-calendar-event" });
        tint(item2, event.area);
        const info2 = item2.createDiv({ cls: "tempvs-session-info" });
        info2.createEl("strong", { text: event.time + " \xB7 " + event.title });
        const area2 = info2.createEl("select", { attr: { "aria-label": "Area per " + event.title } });
        area2.createEl("option", { text: "Area da assegnare", attr: { value: "" } });
        for (const a of plugin.config.areas) area2.createEl("option", { text: a.name, attr: { value: a.id } });
        area2.value = event.area;
        area2.onchange = () => plugin.editCalendarEvent(binding, event.key, area2.value).catch((e) => {
          area2.value = event.area;
          new import_obsidian7.Notice(e.message);
        });
        iconButton(item2, "trash-2", "Rimuovi dalla daily " + event.title, () => plugin.editCalendarEvent(binding, event.key, null));
        continue;
      }
      if (record) {
        if (!body) {
          const table = list.createEl("table"), head = table.createEl("thead").createEl("tr");
          for (const label of ["Area", "Orario", "Nota", "Durata"]) head.createEl("th", { text: label });
          body = table.createEl("tbody");
        }
        const row3 = body.createEl("tr");
        tint(row3, record.areaId, record.area);
        row3.createEl("td", { text: record.area });
        row3.createEl("td", { text: record.end ? record.start + "\u2013" + record.end : record.start || "\u2014" });
        const cell = row3.createEl("td"), note = record.linkedNotes[0];
        if (note) button(cell, note.label, () => plugin.app.workspace.openLinkText(note.path, plugin.dailyNotes[record.registerBlock]?.path || "", false));
        else cell.textContent = "\u2014";
        row3.createEl("td", { text: readableDuration(Math.round(record.minutes * 60)) });
        continue;
      }
      body = null;
      const first = group.sessions[0], last = group.sessions.at(-1), ids = group.sessions.map((s) => s.id);
      const item = list.createDiv({ cls: "tempvs-session tempvs-session-group" });
      const info = item.createDiv({ cls: "tempvs-session-info" });
      const heading = info.createDiv({ cls: "tempvs-session-heading" });
      heading.createEl("strong", { text: first.start + "\u2013" + last.end });
      tint(item, first.areaId, first.area);
      heading.createSpan({ text: first.area || first.title });
      const current = group.sessions.find((s) => s.id === active?.id);
      item.toggleClass("is-current", Boolean(current));
      const done = group.sessions.filter((s) => s.finished || sessionBounds(s).end <= now).length;
      info.createEl("small", { cls: "tempvs-muted", text: `${ids.length} ${ids.length === 1 ? "sessione" : "sessioni"} \xB7 ${Math.round((sessionBounds(last).end - sessionBounds(first).start) / 6e4)} min \xB7 ${done} concluse` + (current ? " \xB7 " + (current.paused ? "Focus sospeso" : "In corso") : "") });
      this.renderSessionNotes(info, group.notes, first, ids);
      if (ids.length > 1) {
        const detail = info.createEl("details", { cls: "tempvs-session-cycles" });
        const key2 = ids.join("|");
        detail.open = expanded.has(key2);
        detail.addEventListener("toggle", () => {
          if (detail.open) expanded.add(key2);
          else expanded.delete(key2);
        });
        detail.createEl("summary", { text: "Singole sessioni" });
        for (const s of group.sessions) {
          const row3 = detail.createDiv({ cls: "tempvs-session-cycle" });
          row3.createEl("span", { text: s.start + "\u2013" + s.end + " \xB7 " + (s.finished || sessionBounds(s).end <= now ? "Conclusa" : s.id === active?.id ? "In corso" : "Programmata") + (s.cycleMinutes ? ` \xB7 ${s.workMinutes}/${s.cycleMinutes - s.workMinutes}` : "") });
          this.renderSessionNotes(row3, group.notes, s, [s.id]);
          if (!s.finished && sessionBounds(s).start > now) iconButton(row3, "trash-2", "Elimina sessione " + s.start, () => plugin.removeSession(s.id));
        }
      } else if (!first.finished && sessionBounds(first).start > now) {
        iconButton(item, "trash-2", "Elimina sessione " + (first.area || first.title), () => plugin.removeSession(first.id));
      }
    }
    if (registered.length || events.some((e) => e.area && e.minutes)) {
      const totals = /* @__PURE__ */ new Map();
      for (const r of registered) totals.set(r.area, (totals.get(r.area) || 0) + r.minutes);
      for (const e of events) {
        const name = plugin.config.areas.find((a) => a.id === e.area)?.name;
        if (e.minutes && name) totals.set(name, (totals.get(name) || 0) + e.minutes);
      }
      if (!budgets.length && totals.size) list.createEl("small", { text: [...totals].map(([area2, min]) => area2 + " " + min + " min").join(" \xB7 ") });
    }
    for (const allocation of plugin.allocatedOn(this.day)) {
      const item = list.createDiv({ cls: "tempvs-session tempvs-allocation" });
      const heading = item.createDiv({ cls: "tempvs-allocation-heading" });
      heading.createEl("strong", { text: allocation.area + " \xB7 " + allocation.minutes + " min \xB7 Da programmare" });
      iconButton(heading, "trash-2", "Elimina tempo assegnato", () => plugin.removeAllocation(allocation));
      const links = item.createDiv({ cls: "tempvs-allocation-links" });
      if (allocation.note) {
        const note = button(links, allocation.note.label, () => plugin.app.workspace.openLinkText(allocation.note.path, allocation.file?.path || "", false));
        note.addClass("tempvs-allocation-link");
      }
      if (allocation.file) {
        const daily = button(links, "Apri nota giornaliera", () => plugin.app.workspace.openLinkText(allocation.file.path, "", false));
        daily.addClass("tempvs-allocation-link");
      }
      const form = item.createEl("form", { cls: "tempvs-allocation-form" });
      const time2 = form.createEl("label", { text: "Ora di inizio" }).createEl("input", { attr: { type: "time", required: "" } });
      time2.dataset.allocation = allocation.id;
      time2.value = pendingTime.get(allocation.id) || "";
      if (focusedTime === allocation.id) time2.focus({ preventScroll: true });
      const submit = form.createEl("button", { text: "Imposta orario", attr: { type: "submit" } });
      form.onsubmit = async (event) => {
        event.preventDefault();
        if (submit.disabled) return;
        submit.disabled = true;
        try {
          await plugin.scheduleAllocation(allocation, time2.value);
        } catch (error) {
          new import_obsidian7.Notice(error.message);
        } finally {
          submit.disabled = false;
        }
      };
    }
    if (!events.length && !sessions.length && !registered.length && !budgets.length && !plugin.allocatedOn(this.day).length) {
      const empty = list.createDiv({ cls: "tempvs-empty" });
      (0, import_obsidian7.setIcon)(empty.createDiv({ cls: "tempvs-empty-icon" }), "calendar-check");
      empty.createEl("strong", { text: "Spazio per i tuoi progetti" });
      empty.createEl("p", { text: "Nessuna sessione in agenda. Avvia un focus o pianifica un momento per questa giornata." });
    }
  }
};
var TempvsSettings = class extends import_obsidian7.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const el = this.containerEl;
    el.empty();
    el.createEl("h2", { text: "TEMPVS \u2014 Impostazioni" });
    el.createEl("h3", { text: "Google Calendar" });
    el.createEl("p", { text: "Aggiungi l\u2019indirizzo iCal di ogni calendario da leggere su questo dispositivo. TEMPVS aggiorna le daily esistenti dal " + this.plugin.calendar.since + " ogni 15 minuti con Obsidian aperto." });
    for (const raw of this.plugin.calendar.urls) {
      const name = decodeURIComponent(calendarAddress(raw).calendar);
      new import_obsidian7.Setting(el).setName(name).addButton((b) => b.setButtonText("Scollega").onClick(() => {
        this.plugin.setCalendarUrls(this.plugin.calendar.urls.filter((url) => url !== raw));
        this.display();
      }));
    }
    const link = el.createEl("input", { attr: { type: "password", placeholder: "Indirizzo iCal", "aria-label": "Indirizzo iCal", autocomplete: "off" } });
    button(el, "Aggiungi calendario", async () => {
      const entry = calendarAddress(link.value);
      this.plugin.setCalendarUrls([...this.plugin.calendar.urls.filter((u) => calendarAddress(u).calendar !== entry.calendar), entry.url]);
      this.display();
      await this.plugin.calendarImport.sync();
    });
    button(el, "Aggiorna calendari ora", async () => {
      await this.plugin.calendarImport.sync();
      new import_obsidian7.Notice("Calendari aggiornati.");
    });
    new import_obsidian7.Setting(el).setName("Modalit\xE0 e-ink").setDesc("Su questo dispositivo, il conto alla rovescia si aggiorna solo nel pannello visibile. Con Obsidian aperto ricevi un avviso a inizio sessione, pausa e ripresa.").addToggle((t) => t.setValue(this.plugin.eink).onChange((value) => this.plugin.setEink(value)));
    new import_obsidian7.Setting(el).setName("Layout del timer").setDesc("Automatico, pannello laterale oppure scheda ampia su iPad e desktop.").addDropdown((d) => d.addOptions({ auto: "Automatico", side: "Pannello laterale", wide: "Scheda ampia" }).setValue(this.plugin.layout).onChange(async (v) => {
      this.plugin.layout = v;
      await this.plugin.persist();
      await this.plugin.openView(true);
    }));
    for (const [key2, label, choices] of [
      ["timerStyle", "Aspetto del timer", { digits: "Sole cifre", bar: "Cifre con barra", ring: "Cifre con anello" }],
      ["clockSize", "Dimensione delle cifre", { small: "Piccole", medium: "Medie", large: "Grandi" }]
    ]) {
      new import_obsidian7.Setting(el).setName(label).addDropdown((d) => d.addOptions(choices).setValue(this.plugin[key2]).onChange(async (value) => {
        this.plugin[key2] = value;
        this.plugin.refresh(true);
        await this.plugin.persist();
      }));
    }
    new import_obsidian7.Setting(el).setName("Minuti focus predefiniti").addText((t) => t.setValue(String(this.plugin.state.defaults.workMinutes)).onChange(async (v) => {
      const n = Number(v);
      if (Number.isInteger(n) && n >= 1 && n <= 240)
        await this.plugin.change(() => {
          this.plugin.state.defaults.workMinutes = n;
        });
    }));
    new import_obsidian7.Setting(el).setName("Pause automatiche").addToggle((t) => t.setValue(Boolean(this.plugin.state.defaults.breakEnabled)).onChange(async (v) => this.plugin.change(() => {
      this.plugin.state.defaults.breakEnabled = v;
    })));
    new import_obsidian7.Setting(el).setName("Avvisi sonori").setDesc("Segnale udibile ai cambi tra concentrazione e pausa, quando Obsidian \xE8 in primo piano.").addToggle((t) => t.setValue(this.plugin.chimeEnabled).onChange(async (value) => {
      this.plugin.chimeEnabled = value;
      if (value) this.plugin.chime.arm();
      await this.plugin.persist();
    }));
    new import_obsidian7.Setting(el).setName("Prova avviso").setDesc("Tocca per attivare e verificare l'audio su questo dispositivo.").addButton((b) => b.setButtonText("Riproduci").onClick(() => {
      void this.plugin.chime.play("break").then((ok) => {
        if (!ok) new import_obsidian7.Notice("Audio non disponibile: controlla il volume e riprova toccando Riproduci.");
      });
    }));
    el.createEl("h3", { text: "Aree" });
    el.createEl("p", { cls: "tempvs-muted", text: "Rinomina, riordina o elimina le aree senza perdere sessioni e statistiche. La descrizione Markdown resta associata all'area." });
    for (const [index, area] of this.plugin.config.areas.entries()) {
      const section = el.createDiv({ cls: "tempvs-area-config" });
      const heading = new import_obsidian7.Setting(section).setName(area.name);
      const nameInput = section.createEl("input", { attr: { type: "text", maxlength: "80", "aria-label": "Nuovo nome area " + area.name, value: area.name } });
      const colorInput = section.createEl("input", { attr: { type: "color", "aria-label": "Colore area " + area.name, value: area.color || "#54769b" } });
      const details = section.createEl("details");
      details.createEl("summary", { text: "Descrizione Markdown" });
      const description = details.createEl("textarea", { attr: { rows: "4", "aria-label": "Descrizione area " + area.name } });
      description.value = area.description || "";
      heading.addButton((b) => b.setButtonText("Salva").onClick(async () => {
        try {
          const next = nameInput.value.trim();
          if (!next || next.length > 80 || this.plugin.config.areas.some((a) => a.name !== area.name && a.name.toLocaleLowerCase() === next.toLocaleLowerCase())) throw Error("Nome area non valido o gi\xE0 presente.");
          const previous = area.name;
          await this.plugin.change(() => {
            const stored = this.plugin.config.areas.find((a) => a.name === previous);
            if (!stored) throw Error("Area non disponibile.");
            stored.name = next;
            stored.color = colorInput.value;
            stored.description = description.value;
            if (next !== previous) this.plugin.remapArea(previous, next);
          });
          this.display();
          new import_obsidian7.Notice("Area aggiornata.");
        } catch (e) {
          new import_obsidian7.Notice(e.message);
        }
      }));
      heading.addButton((b) => b.setButtonText("\u2191").setTooltip("Sposta in alto").setDisabled(index === 0).onClick(async () => {
        try {
          await this.plugin.change(() => {
            const a = this.plugin.config.areas;
            [a[index - 1], a[index]] = [a[index], a[index - 1]];
          });
          this.display();
        } catch (e) {
          new import_obsidian7.Notice(e.message);
        }
      }));
      heading.addButton((b) => b.setButtonText("\u2193").setTooltip("Sposta in basso").setDisabled(index === this.plugin.config.areas.length - 1).onClick(async () => {
        try {
          await this.plugin.change(() => {
            const a = this.plugin.config.areas;
            [a[index], a[index + 1]] = [a[index + 1], a[index]];
          });
          this.display();
        } catch (e) {
          new import_obsidian7.Notice(e.message);
        }
      }));
      if (this.plugin.config.areas.length > 1) {
        const transfer = section.createEl("select", { attr: { "aria-label": "Sposta i dati di " + area.name + " nell'area" } });
        for (const other of this.plugin.config.areas.filter((a) => a.name !== area.name))
          transfer.createEl("option", { text: "Trasferisci in " + other.name, value: other.name });
        heading.addButton((b) => b.setButtonText("Elimina").onClick(async () => {
          const target = transfer.value;
          if (!await confirmTempvs(this.plugin.app, "Eliminare \xAB" + area.name + "\xBB?", "Le sessioni, le attivit\xE0 e lo storico verranno trasferiti nell'area \xAB" + target + "\xBB senza cancellare i tempi registrati.")) return;
          try {
            await this.plugin.change(() => {
              this.plugin.remapArea(area.name, target);
              this.plugin.config.areas = this.plugin.config.areas.filter((a) => a.name !== area.name);
            });
            this.display();
            new import_obsidian7.Notice("Area eliminata e dati trasferiti.");
          } catch (e) {
            new import_obsidian7.Notice(e.message);
          }
        }));
      }
    }
    const addArea = new import_obsidian7.Setting(el).setName("Nuova area");
    let addName = "";
    addArea.addText((t) => t.setPlaceholder("Nome della nuova area").onChange((v) => {
      addName = v;
    }));
    addArea.addButton((b) => b.setButtonText("Aggiungi").onClick(async () => {
      const name = addName.trim();
      if (!name || name.length > 80 || this.plugin.config.areas.some((a) => a.name.toLocaleLowerCase() === name.toLocaleLowerCase())) return new import_obsidian7.Notice("Nome area non valido o gi\xE0 utilizzato.");
      try {
        await this.plugin.change(() => this.plugin.config.areas.push({ name, description: "", color: "#54769B" }));
        this.display();
        new import_obsidian7.Notice("Area aggiunta.");
      } catch (e) {
        new import_obsidian7.Notice(e.message);
      }
    }));
  }
};
var TempvsPlugin = class extends import_obsidian7.Plugin {
  async onload() {
    try {
      const data = await this.loadData();
      const legacy = data?.archive || (Array.isArray(data?.sessions) ? data : null);
      if (data && !legacy && data.format !== 2 && Object.keys(data).length) throw Error("Formato impostazioni sconosciuto.");
      if (legacy) {
        const adapter = this.app.vault.adapter;
        const dir = this.manifest.dir || this.app.vault.configDir + "/plugins/" + this.manifest.id;
        const path = dir + "/pre-0.7-recovery.json";
        if (!await adapter.exists(path)) {
          await adapter.write(path, JSON.stringify({ archive: legacy, dailyNotes: data.dailyNotes, allocations: data.allocations }));
        }
      }
      this.state = normalizeArchive({ sessions: [], defaults: data?.defaults || legacy?.defaults || ZERO().defaults });
      this.state.defaults.simple.noteEstimates = {};
      this.calendar = { since: data?.calendarSince || today(), urls: this.app.loadLocalStorage?.("tempo-pomodoro:calendars") || [] };
      this.dailyNotes = /* @__PURE__ */ Object.create(null);
      this.allocations = [];
      this.timerFlags = data?.timerFlags || {};
      this.noteFlags = data?.noteFlags || {};
      this.compact = typeof data?.ui?.compact === "boolean" ? data.ui.compact : import_obsidian7.Platform.isMobile;
      this.layout = ["auto", "side", "wide"].includes(data?.ui?.layout) ? data.ui.layout : "auto";
      this.timerStyle = ["digits", "ring"].includes(data?.ui?.timerStyle) ? data.ui.timerStyle : "bar";
      this.clockSize = ["small", "large"].includes(data?.ui?.clockSize) ? data.ui.clockSize : "medium";
      this.audioKind = ["white", "brown", "rain", "fire"].includes(data?.audio?.kind) ? data.audio.kind : "brown";
      const savedVolume = Number(data?.audio?.volume);
      this.audioVolume = data?.audio?.volume !== void 0 && Number.isFinite(savedVolume) ? Math.max(0, Math.min(100, Math.round(savedVolume))) : 25;
      this.chimeEnabled = data?.notifications?.sound !== false;
    } catch (error) {
      new import_obsidian7.Notice("TEMPVS: dati non validi, archivio lasciato intatto. " + error.message, 1e4);
      throw error;
    }
    this.einkStorageKey = "tempvs:eink:" + (this.app.vault?.getName?.() || "");
    try {
      this.eink = (this.app.loadLocalStorage ? this.app.loadLocalStorage("tempo-pomodoro:eink") : window.localStorage?.getItem(this.einkStorageKey)) === "on";
    } catch {
      this.eink = false;
    }
    this.einkHidden = document.hidden;
    this.ambient = new TempoAmbientAudio(() => this.refreshAudioControls());
    this.chime = new FocusEndChime();
    this.lastTick = Date.now();
    this.lastSave = Date.now();
    this.lastNoticeCheck = Date.now();
    this.lastNotifiedPhase = this.currentNoticePhase(new Date(this.lastNoticeCheck));
    this.dirty = false;
    this.writeChain = Promise.resolve();
    this.estimates = new NoteEstimates(this);
    this.registerEditorExtension?.(syntaxExtension());
    this.daily = new DailyBlocks(this);
    this.daily.start();
    this.calendarImport = new CalendarImport(this, async (url) => (await (0, import_obsidian6.requestUrl)({ url, method: "GET" })).text);
    const syncCalendars = () => {
      if (this.calendar.urls.length) this.calendarImport.sync().catch((e) => new import_obsidian7.Notice(e.message));
    };
    this.app.workspace.onLayoutReady?.(async () => {
      await this.daily.ready;
      await this.persist();
      syncCalendars();
    });
    this.syncCalendars = syncCalendars;
    if (this.app.vault?.on) this.registerEvent(this.app.vault.on("create", (file) => {
      if (!this.calendar.urls.length || !this.daily.panelDay(file)) return;
      window.clearTimeout(this.calendarDebounce);
      this.calendarDebounce = window.setTimeout(syncCalendars, 2e3);
    }));
    this.updateCalendarInterval();
    this.addCommand({ id: "refresh-google-calendars", name: "Aggiorna Google Calendar", callback: syncCalendars });
    this.registerView(VIEW_TYPE, (leaf) => new TempvsView(leaf, this));
    this.addSettingTab(new TempvsSettings(this.app, this));
    this.addCommand({ id: "open-tempvs", name: "Apri timer TEMPVS", callback: () => this.openView() });
    this.addCommand({ id: "pause-tempvs", name: "Pausa o riprendi TEMPVS", callback: () => this.togglePause().catch((e) => new import_obsidian7.Notice(e.message)) });
    this.addCommand({ id: "finish-tempvs", name: "Concludi sessione TEMPVS", callback: () => this.finish().catch((e) => new import_obsidian7.Notice(e.message)) });
    this.addCommand({ id: "toggle-compact-view", name: "Espandi o compatta il pannello TEMPVS", callback: () => this.setCompact(!this.compact) });
    this.addRibbonIcon("timer", "Apri TEMPVS", () => this.openView());
    if (!import_obsidian7.Platform.isMobile) {
      this.status = this.addStatusBarItem();
      this.status.addClass("tempvs-status");
      this.status.setAttribute("role", "button");
      this.status.setAttribute("tabindex", "0");
      this.status.addEventListener("click", () => this.openView());
      this.status.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this.openView();
        }
      });
    }
    this.updateClock();
    const layoutChanged = () => {
      if (this.eink) this.refresh();
    };
    if (this.app.workspace.on) {
      this.registerEvent(this.app.workspace.on("layout-change", layoutChanged));
      this.registerEvent(this.app.workspace.on("active-leaf-change", layoutChanged));
    }
    const armChime = () => {
      if (this.chimeEnabled) this.chime.arm();
    };
    this.registerDomEvent(document, "pointerdown", armChime);
    this.registerDomEvent(document, "touchstart", armChime);
    this.registerDomEvent(document, "keydown", armChime);
    this.registerDomEvent(document, "visibilitychange", () => {
      if (this.eink) {
        this.record();
        this.einkHidden = document.hidden;
        this.updateClock();
        if (!document.hidden) this.refresh(true);
      } else if (!document.hidden) {
        this.tick();
        this.refresh(true);
      }
    });
    this.refresh(true);
  }
  setCalendarUrls(urls) {
    this.app.saveLocalStorage("tempo-pomodoro:calendars", urls);
    this.calendar.urls = urls;
    this.updateCalendarInterval();
  }
  updateCalendarInterval() {
    if (this.calendarInterval) window.clearInterval(this.calendarInterval);
    this.calendarInterval = this.calendar.urls.length ? window.setInterval(this.syncCalendars, 15 * 60 * 1e3) : null;
  }
  async editCalendarEvent(binding, key2, area) {
    await this.daily.queue(async () => {
      const context = await this.daily.context(binding.path);
      if (!context?.date || !calendarRows(context.block.source).some((e) => e.key === key2)) throw Error("L\u2019evento \xE8 cambiato.");
      await this.daily.writeSource(context.file, null, context.block.source, changeRow(context.block.source, key2, area), context.block.lineStart);
    });
    await this.daily.syncFile(binding.path);
  }
  get config() {
    return this.state.defaults.simple;
  }
  setEink(value) {
    this.record();
    this.eink = value;
    this.einkHidden = document.hidden;
    try {
      if (this.app.saveLocalStorage) this.app.saveLocalStorage("tempo-pomodoro:eink", value ? "on" : "off");
      else window.localStorage.setItem(this.einkStorageKey, value ? "on" : "off");
    } catch {
      new import_obsidian7.Notice("Preferenza e-ink applicata per questa apertura di Obsidian.");
    }
    this.lastNoticeCheck = Date.now();
    this.lastNotifiedPhase = this.currentNoticePhase(new Date(this.lastNoticeCheck));
    this.refresh(true);
  }
  visibleTimers() {
    if (document.hidden) return [];
    return this.app.workspace.getLeavesOfType(VIEW_TYPE).map((leaf) => leaf.view).filter((view) => view?.timerVisible && view.containerEl.getClientRects().length && (!view.containerEl.checkVisibility || view.containerEl.checkVisibility({ visibilityProperty: true })));
  }
  updateClock() {
    if (this.clockStopped) return;
    const visible = this.eink ? this.visibleTimers() : [];
    const active = this.eink && visible.length ? this.active() : null;
    const mode = !this.eink ? "regular" : active && !active.paused ? "digits" : "off";
    if (mode !== this.clockMode) {
      if (this.clockHandle != null) window.clearInterval(this.clockHandle);
      this.clockHandle = null;
      this.clockMode = mode;
      if (mode === "regular") this.clockHandle = window.setInterval(() => this.tick(), 1e3);
      if (mode === "digits") this.clockHandle = window.setInterval(() => {
        const views = this.visibleTimers(), session = this.active();
        if (!views.length || !session || session.paused) {
          this.updateClock();
          return;
        }
        const digits = mmss(getPhase(session).remaining);
        for (const view of views) {
          const clock3 = view.containerEl.querySelector(".tempvs-clock");
          if (clock3 && clock3.textContent !== digits) clock3.textContent = digits;
        }
      }, 1e3);
    }
    if (this.eink && !visible.length && this.ambient.playing) this.ambient.stop();
  }
  scheduleBoundary() {
    if (this.clockStopped) return;
    const now = Date.now(), date = new Date(now);
    let next = Infinity;
    if (this.eink) {
      for (const session of this.state.sessions) {
        if (session.finished || session.dailyRetired || session.manualSuperseded) continue;
        const { start, end } = sessionBounds(session);
        if (+start > now) next = Math.min(next, +start);
        else if (+end > now) next = Math.min(next, session.paused ? +end : +getPhase(session, date).end);
      }
    }
    if (this.eink && this.boundaryAt != null && this.boundaryAt <= now) return;
    if (next === this.boundaryAt) return;
    window.clearTimeout(this.boundaryHandle);
    this.boundaryAt = next;
    if (!Number.isFinite(next)) return;
    this.boundaryHandle = window.setTimeout(() => {
      this.boundaryAt = null;
      if (this.clockStopped || !this.eink) return;
      const fired = Date.now();
      if (fired >= next) {
        const current = this.currentNoticePhase(new Date(fired));
        if (!document.hidden && current && current.start === next && fired - next <= 8e3) {
          const session = this.state.sessions.find((item) => item.id === current.id);
          const beginning = +sessionBounds(session).start === next;
          this.showPhaseNotice(current, beginning);
        }
        this.record();
        if (this.dirty) this.persist().catch((e) => new import_obsidian7.Notice(e.message));
      }
      this.refresh(true);
    }, Math.min(2147483647, Math.max(1, next - now)));
  }
  currentNoticePhase(now = /* @__PURE__ */ new Date()) {
    const active = getActiveSession(this.state.sessions.filter((s) => !s.finished), now);
    if (!active || active.paused) return null;
    const phase = getPhase(active, now);
    return { id: active.id, kind: phase.kind, start: +phase.start, area: active.area || active.title };
  }
  notifyPhaseTransition(nowMs = Date.now()) {
    const current = this.currentNoticePhase(new Date(nowMs));
    const previous = this.lastNotifiedPhase;
    const gap = nowMs - this.lastNoticeCheck;
    this.lastNotifiedPhase = current;
    this.lastNoticeCheck = nowMs;
    if (!current || !previous || current.id !== previous.id || current.kind === previous.kind || gap < 0 || gap > 8e3 || nowMs - current.start < 0 || nowMs - current.start > 8e3 || document.hidden) return;
    this.showPhaseNotice(current, false);
  }
  showPhaseNotice(current, beginning) {
    const message = beginning ? "TEMPVS \xB7 Inizia la sessione \u2014 " + current.area : current.kind === "break" ? "TEMPVS \xB7 Inizia la pausa \u2014 " + current.area : "TEMPVS \xB7 Riprende la concentrazione \u2014 " + current.area;
    new import_obsidian7.Notice(message, 6500);
    if (this.chimeEnabled) void this.chime.play(current.kind).catch((error) => console.warn("TEMPVS: avviso acustico non disponibile", error));
  }
  refreshAudioControls() {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) leaf.view?.updateSoundControls?.();
  }
  syncAmbient(now = /* @__PURE__ */ new Date()) {
    if (!this.ambient?.playing) return;
    const pending = this.state.sessions.filter((s) => !s.finished);
    const mode = getAmbientFocusMode(pending, now);
    const active = getActiveSession(pending, now);
    this.ambient.setAudible(mode === "focus" && !active?.paused);
    this.refreshAudioControls();
  }
  async toggleAmbient() {
    if (this.ambient.playing) {
      this.ambient.stop(0.9);
      return;
    }
    const active = this.active();
    const audible = Boolean(active && !active.paused && getPhase(active).kind === "work");
    const started = this.ambient.start(this.audioKind, this.audioVolume / 100, audible);
    if (!await started) new import_obsidian7.Notice("Impossibile avviare l'audio: verifica i permessi su Obsidian e iPadOS.");
    else this.syncAmbient();
  }
  async selectAmbient(kind) {
    if (!["white", "brown", "rain", "fire"].includes(kind)) return;
    this.audioKind = kind;
    const restarted = this.ambient.playing ? this.ambient.start(
      kind,
      this.audioVolume / 100,
      getAmbientFocusMode(this.state.sessions.filter((s) => !s.finished)) === "focus" && !this.active()?.paused
    ) : null;
    if (restarted && !await restarted) new import_obsidian7.Notice("Impossibile cambiare il rumore ambientale.");
    this.syncAmbient();
    await this.persist();
  }
  adjustAmbientVolume(value) {
    if (!Number.isFinite(value)) return;
    this.audioVolume = Math.max(0, Math.min(100, Math.round(value)));
    this.ambient.setVolume(this.audioVolume / 100);
  }
  active() {
    const session = getActiveSession(this.state.sessions.filter((s) => !s.finished));
    return session || null;
  }
  async openView(forceLayout = false) {
    let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0];
    if (forceLayout && leaf) {
      leaf.detach();
      leaf = null;
    }
    if (!leaf) {
      leaf = this.layout === "wide" ? this.app.workspace.getLeaf(true) : this.app.workspace.getRightLeaf(false) || this.app.workspace.getLeaf(true);
      if (!leaf) return;
      await leaf.setViewState({ type: VIEW_TYPE, active: true });
    }
    leaf.view?.selectDay?.(today());
    await this.app.workspace.revealLeaf(leaf);
  }
  openSettings() {
    this.app.setting?.open();
    this.app.setting?.openTabById(this.manifest.id);
  }
  refresh(full = false) {
    this.updateClock();
    this.scheduleBoundary();
    this.syncAmbient();
    const session = this.active();
    const phase = session ? getPhase(session) : null;
    if (this.status) {
      this.status.textContent = this.eink ? "TEMPVS" : phase ? "TEMPVS \xB7 " + mmss(phase.remaining) + " \xB7 " + (session.area || session.title) : "TEMPVS \xB7 pronto";
      this.status.setAttribute("aria-label", "Apri TEMPVS");
    }
    const views = this.eink ? this.visibleTimers() : this.app.workspace.getLeavesOfType(VIEW_TYPE).map((leaf) => leaf.view);
    for (const view of views) view?.update?.(full);
    if (full) this.daily?.refresh();
  }
  record() {
    const now = Date.now();
    if (this.eink && this.einkHidden || now <= this.lastTick) {
      this.lastTick = now;
      return;
    }
    for (const s of this.state.sessions) {
      const elapsed = measuredFocus(s, this.lastTick, now, this.eink ? Infinity : 15e3);
      if (elapsed > 0) {
        s.actualSeconds = (s.actualSeconds || 0) + elapsed;
        this.dirty = true;
      }
    }
    this.lastTick = now;
  }
  tick() {
    this.notifyPhaseTransition();
    this.record();
    const now = Date.now();
    if (this.dirty && now - this.lastSave >= 15e3) {
      this.persist().catch((e) => new import_obsidian7.Notice("TEMPVS: salvataggio fallito: " + e.message));
      this.lastSave = now;
    }
    if (Math.floor(now / 15e3) !== Math.floor((now - 1e3) / 15e3)) this.daily?.refresh();
    this.refresh(Math.floor(now / 6e4) !== Math.floor((now - 1e3) / 6e4));
  }
  timerKey(s) {
    const b = sessionBounds(s);
    return JSON.stringify([s.date, s.area, +b.start, +b.end]);
  }
  restoreTimerFlags(sessions, existing) {
    for (const s of sessions) {
      if (existing.has(s.id)) continue;
      const flags = this.timerFlags[this.timerKey(s)];
      if (flags && flags.until > Date.now()) Object.assign(s, { paused: flags.paused, finished: flags.finished, actualSeconds: flags.actualSeconds });
    }
  }
  async persist() {
    if (this.daily?.indexing) return;
    const defaults = JSON.parse(JSON.stringify(this.state.defaults));
    delete defaults.simple.noteEstimates;
    const now = Date.now();
    for (const [key2, flags] of Object.entries(this.timerFlags)) if (flags.until <= now) delete this.timerFlags[key2];
    for (const session of this.state.sessions) {
      const bounds = sessionBounds(session);
      if (+bounds.end <= now || +bounds.start > now) continue;
      const key2 = this.timerKey(session);
      this.timerFlags[key2] = { until: +bounds.end, paused: !!session.paused, finished: !!session.finished, actualSeconds: session.actualSeconds || 0 };
    }
    for (const note of this.estimates?.notes || []) {
      if (note.completed) this.noteFlags[note.path] = { completed: true };
      else delete this.noteFlags[note.path];
    }
    const data = JSON.parse(JSON.stringify({
      format: 2,
      defaults,
      calendarSince: this.calendar.since,
      timerFlags: this.timerFlags,
      noteFlags: this.noteFlags,
      ui: { compact: this.compact, layout: this.layout, timerStyle: this.timerStyle, clockSize: this.clockSize },
      audio: { kind: this.audioKind, volume: this.audioVolume },
      notifications: { sound: this.chimeEnabled }
    }));
    const write = this.writeChain.catch(() => {
    }).then(() => this.saveData(data));
    this.writeChain = write;
    await write;
    this.dirty = false;
  }
  async change(mutator) {
    if (this.changing) throw Error("Salvataggio in corso. Attendi prima di riprovare.");
    this.changing = true;
    try {
      this.record();
      const previous = JSON.stringify(this.state);
      const previousAllocations = this.allocations;
      try {
        mutator();
        this.state = normalizeArchive(this.state);
        await this.persist();
      } catch (error) {
        this.state = JSON.parse(previous);
        this.allocations = previousAllocations;
        this.refresh(true);
        throw error;
      }
      this.refresh(true);
    } finally {
      this.changing = false;
    }
    if (!this.daily?.applying) await this.daily?.syncLedgers();
  }
  setSessionNote(ids, input, options = {}) {
    const operation = (this.noteWrite || Promise.resolve()).then(() => this.applySessionNote(ids, input, options));
    this.noteWrite = operation.catch(() => {
    });
    return operation;
  }
  async applySessionNote(ids, input, options) {
    const updates = /* @__PURE__ */ new Map();
    for (const id of ids) {
      const session = this.state.sessions.find((s) => s.id === id);
      if (!session) throw Error("La sessione non \xE8 pi\xF9 disponibile.");
      const links = updatedSessionNotes(session, input, { ...options, replacePrimary: true, estimates: this.estimates?.notes || [] });
      updates.set(id, input.trim() ? links.slice(0, 1) : links);
    }
    const bindings = new Set(ids.map((id) => this.state.sessions.find((s) => s.id === id).noteBlockId));
    if (bindings.has(void 0) || bindings.has(null)) throw Error("Sessione assente dalla nota quotidiana.");
    if (bindings.size !== 1) throw Error("Modifica una giornata alla volta.");
    await this.daily.editTimedRows(updates);
  }
  async setCompact(value) {
    this.compact = Boolean(value);
    await this.persist();
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) leaf.view?.draw?.();
  }
  remapArea(from, to) {
    for (const session of this.state.sessions) {
      if (session.area === from) session.area = to;
      if (session.title === from) session.title = to;
    }
    for (const item of this.state.history || []) {
      if (item.area === from) item.area = to;
      if (item.title === from) item.title = to;
    }
    for (const task of this.state.tasks || []) if (task.area === from) task.area = to;
    if (this.state.appearance?.areaColors && Object.prototype.hasOwnProperty.call(this.state.appearance.areaColors, from)) {
      if (!Object.prototype.hasOwnProperty.call(this.state.appearance.areaColors, to))
        this.state.appearance.areaColors[to] = this.state.appearance.areaColors[from];
      delete this.state.appearance.areaColors[from];
    }
  }
  async start(area, gross, focus, pause, note, cycleMinutes) {
    if (!this.config.areas.some((a) => a.name === area)) throw Error("Area non valida.");
    if (!Number.isInteger(gross) || gross < 1 || gross > 1439) throw Error("Durata lorda non valida.");
    if (!Number.isInteger(focus) || focus < 1 || focus > 240) throw Error("Focus da 1 a 240 minuti.");
    if (pause !== void 0 && (!Number.isInteger(pause) || pause < 0 || pause >= gross)) throw Error("Pausa personalizzata non valida.");
    const now = /* @__PURE__ */ new Date();
    await this.daily.writeAllocation({
      area,
      minutes: gross,
      date: localDateString(now),
      start: formatTime(now),
      note,
      offsetMs: now.getSeconds() * 1e3 + now.getMilliseconds(),
      cycleMinutes,
      focusMinutes: cycleMinutes ? void 0 : focus,
      customBreakMinutes: pause
    });
  }
  async schedule(text, date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw Error("Data non valida.");
    const requests = parseQuick(text.split("\n").map((line) => expandRange(line.trim())).join("\n"), this.config.areas);
    if (!requests.length) throw Error("Inserisci almeno una sessione.");
    if (requests.some((r) => !r.start)) throw Error("Per ora specifica +HH:MM per ogni sessione. Le fasce automatiche saranno aggiunte successivamente.");
    await this.scheduleRequests(requests, date);
    new import_obsidian7.Notice("TEMPVS: " + requests.length + " sessioni programmate.");
  }
  async assignTime(request, date, note) {
    if (!validDay(date)) throw Error("Data non valida.");
    if (!this.config.areas.some((area) => area.name === request.area)) throw Error("Area non valida.");
    if (!Number.isInteger(request.minutes) || request.minutes < 1 || request.minutes > 1439)
      throw Error("Durata da 1 a 1439 minuti.");
    planSessions([request], [], [], this.state.defaults);
    await this.daily.writeAllocation({ ...request, date, note });
  }
  allocatedOn(date) {
    const entries = this.daily.allocationsByDay.get(date) || [];
    const unified = this.state.history.flatMap((record) => {
      if (!record.planned || record.start || record.registerDay !== date) return [];
      const binding = this.dailyNotes[record.registerBlock];
      const file = binding && this.app.vault?.getAbstractFileByPath(binding.path);
      const raw = binding?.source.split(/\r?\n/)[record.sourceRow];
      return file && raw ? [{ ...record, id: record.sessionId, file, raw, index: record.sourceRow, note: record.linkedNotes[0], unified: true }] : [];
    });
    return [...unified, ...entries];
  }
  removeAllocation(entry) {
    if (entry.unified) return this.daily.updateUnifiedAllocation(entry);
    return entry.file ? this.daily.consumeAllocation(entry) : this.change(() => {
      this.allocations = this.allocations.filter((item) => item.id !== entry.id);
    });
  }
  async scheduleRequests(requests, date, note) {
    if (!validDay(date)) throw Error("Data non valida.");
    this.plannedSessions(requests, date);
    await this.daily.writeAllocations(requests.map((r) => ({ ...r, date, note })));
  }
  plannedSessions(requests, date) {
    const result = planSessions(
      requests,
      [],
      this.state.sessions.filter((s) => !s.finished && !s.dailyRetired && !s.manualSuperseded),
      this.state.defaults,
      /* @__PURE__ */ new Date(),
      uuid,
      date
    );
    if (result.remainder || !result.sessions.length) throw Error("Programmazione incompleta.");
    return result.sessions;
  }
  async scheduleAllocation(allocation, start) {
    if (allocation.unified) {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(start) || /* @__PURE__ */ new Date(allocation.date + "T" + start) <= /* @__PURE__ */ new Date())
        throw Error("Scegli un orario futuro per avviare il timer.");
      return this.daily.updateUnifiedAllocation(allocation, start);
    }
    if (!allocation.file) throw Error("Assegnazione assente dalla daily.");
    await this.daily.migrateAllocationBlock(allocation.file);
    await this.daily.syncFile(allocation.file.path);
    throw Error("La daily usa ora il blocco unificato. Scegli la riga aggiornata per impostare l\u2019orario.");
  }
  async togglePause() {
    const s = this.active();
    if (!s) throw Error("Nessuna sessione attiva.");
    await this.change(() => {
      s.paused = !s.paused;
    });
    this.lastNoticeCheck = Date.now();
    this.lastNotifiedPhase = this.currentNoticePhase(new Date(this.lastNoticeCheck));
  }
  async finish() {
    const s = this.active();
    if (!s) throw Error("Nessuna sessione attiva.");
    await this.change(() => {
      s.finished = true;
      s.paused = false;
    });
    this.lastNoticeCheck = Date.now();
    this.lastNotifiedPhase = this.currentNoticePhase(new Date(this.lastNoticeCheck));
  }
  async removeSession(id) {
    const s = this.state.sessions.find((s2) => s2.id === id);
    if (!s || s.finished || sessionBounds(s).start <= /* @__PURE__ */ new Date()) throw Error("Puoi eliminare solo sessioni future.");
    await this.daily.editTimedRows(/* @__PURE__ */ new Map([[id, null]]));
  }
  async onunload() {
    this.clockStopped = true;
    window.clearTimeout(this.calendarDebounce);
    if (this.calendarInterval) window.clearInterval(this.calendarInterval);
    if (this.clockHandle != null) window.clearInterval(this.clockHandle);
    window.clearTimeout(this.boundaryHandle);
    this.daily?.destroy();
    await this.daily?.chain.catch(() => {
    });
    this.chime?.destroy();
    this.ambient?.destroy();
    this.record();
    if (this.dirty) await this.persist().catch((e) => console.error("TEMPVS:", e));
    await this.writeChain.catch(() => {
    });
  }
};
