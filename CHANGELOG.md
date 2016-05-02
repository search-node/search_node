# Change log for the search node

## Development

## 2.1.5

* UI support for import/export mappings in JSON
* Added analyzer_startswith analyzer (can be used to create auto-complete)

## 2.1.4

* Support for geo-point in mapping configuration.
* Added create new index API call.
* Added remove index API call.
* Change error message to be JSON.
* Fixed error in addIndex where "Mappings already exists." is always returned.

## 2.1.3

* Fixed sort error to now use multi field .sort in the index, which is not analyzed.

## 2.1.2

* Re-addded sortable fields in admin UI.

## v2.1.1

* Added support for raw fields to create better facets.
* Added Copy mappings in admin UI.

## v2.1.0

* Node module have been updated - run update.sh
* Read/Write (rw) and read-only (r) access have been added to api keys - Update apikeys.json
* Added /api/[index]/flush to the api.
* Added count query to socket client.
* Fixed default analyzer.
* Added support for default indexer
* Fixed document update by using "index" API
* Added support for multi-field .raw
