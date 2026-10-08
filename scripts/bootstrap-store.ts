import fs from "fs";
import path from "path";

const dir = process.env.DATA_DIR || path.join(process.cwd(), "data");
const target = path.join(dir, "store.json");
const snapshot = path.join(process.cwd(), "data", "hosted-snapshot.json");

fs.mkdirSync(dir, { recursive: true });
if (!fs.existsSync(target) && fs.existsSync(snapshot) && path.resolve(snapshot) !== path.resolve(target)) {
  fs.copyFileSync(snapshot, target);
  console.log(JSON.stringify({ bootstrapped: true }));
} else {
  console.log(JSON.stringify({ bootstrapped: false }));
}
