// All balances are stored as integer minor units (cents) to avoid floating point drift.
// Every currency in this system uses 2 decimal places, including JPY.

const toMinor = (major) => Math.round(major * 100);
const toMajor = (minor) => minor / 100;

module.exports = { toMinor, toMajor };
