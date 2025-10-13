// Test file to verify ESLint custom plugin functionality
// This file intentionally contains issues that should trigger custom rules

// This should trigger no-excessive-logging rule
console.log('Debug log 1');
console.log('Debug log 2');
console.log('Debug log 3');
console.log('Debug log 4');
console.log('Debug log 5');
console.log('Debug log 6'); // This should trigger the rule (6th log statement)

// This should trigger id-consistency rule (ObjectId usage)
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const newId = new ObjectId();

// This should trigger max-complexity rule
function overlyComplexFunction(param1, param2, param3) {
  if (param1) {
    if (param2) {
      if (param3) {
        if (param1 && param2) {
          if (param3 || param1) {
            if (param2 && param3) {
              if (param1 || param2) {
                if (param3 && param1) {
                  if (param2 || param3) {
                    if (param1 && param2 && param3) {
                      return 'too complex';
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  return 'result';
}

module.exports = { overlyComplexFunction };