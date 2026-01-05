/* eslint-disable */
const { dump } = require('js-yaml');

const testObj = {
  "Accept": "application/json",
  "Authorization": "Bearer token"
};

const output = dump(testObj);
console.log('--- Output Start ---');
console.log(output);
console.log('--- Output End ---');

const testArray = [
    { header: "ID", key: "id" },
    { header: "Name", key: "name" }
];

const outputArray = dump(testArray);
console.log('--- Array Output Start ---');
console.log(outputArray);
console.log('--- Array Output End ---');
