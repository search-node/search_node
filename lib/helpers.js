/**
 * @file
 * This file defines some helper functions.
 */

// Export the object.
module.exports = {
  /**
   * Print object into console with depth given.
   *
   * @param obj
   *   The object (JSON) to print.
   * @param depth
   *   The depth of the object to print.
   */
  'clog': function print(obj, depth) {
    console.log(require('util').inspect(obj, true, depth));
  }
};