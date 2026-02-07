// backup_v3_1.js
import fs from "fs";
import { exec } from "child_process";

console.log("🧩 Creating dpow.chat v3.1 backup (Bolt-safe)...");

exec("npm pack", (error, stdout, stderr) => {
  if (error) {
    console.error("❌ Backup failed:", error.message);
    return;
  }
  if (stderr) console.error(stderr);
  console.log("✅ dpow.chat v3.1 backup created successfully:", stdout);
});
