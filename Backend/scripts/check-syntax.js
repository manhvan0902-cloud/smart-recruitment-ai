const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function checkFolder(folder) {
  let count = 0;
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    const filename = path.join(folder, entry.name);
    if (entry.isDirectory()) count += checkFolder(filename);
    else if (entry.name.endsWith(".js")) {
      new vm.Script(fs.readFileSync(filename, "utf8"), { filename });
      count++;
    }
  }
  return count;
}

try {
  const count = checkFolder(path.resolve(__dirname, "../src"));
  console.log(count + " file JavaScript hợp lệ về cú pháp.");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
