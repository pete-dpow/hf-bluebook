// backup.js — CommonJS version (works without ES module config)
const fs = require("fs");
const tar = require("tar");

async function createBackup() {
  const backupName = `dpow_chat_stable_backup_${Date.now()}.tar.gz`;

  console.log(`🧩 Creating project backup: ${backupName}`);

  await tar.c(
    {
      gzip: true,
      file: backupName,
      cwd: ".",
      portable: true,
      filter: (filePath) =>
        !filePath.startsWith("node_modules") &&
        !filePath.startsWith(".next") &&
        !filePath.startsWith(".bolt"),
    },
    ["."]
  );

  console.log(`✅ Backup complete → ${backupName}`);
}

createBackup().catch((err) => {
  console.error("❌ Backup failed:", err);
});
