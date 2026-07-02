const { danger, warn, fail, message } = require("danger");

const modifiedFiles = danger.git.modified_files;
const createdFiles = danger.git.created_files;
const allChangedFiles = [...modifiedFiles, ...createdFiles];

// --- Rule 1: Bulk change warning ---
if (allChangedFiles.length > 15) {
  warn(
    `This PR changes **${allChangedFiles.length} files**. ` +
      `Large PRs are harder to review and more likely to introduce regressions. ` +
      `Consider splitting into smaller PRs.`,
  );
}

// --- Rule 2: Critical file protection ---
const criticalFiles = [
  "src/pages/admin/IncidentDetailPage.tsx",
  "src/pages/admin/WorkflowDesignerPage.tsx",
  "src/utils/lazyWithRetry.ts",
  "docker-entrypoint.sh",
  "Dockerfile",
  "vite.config.ts",
];

const touchedCritical = allChangedFiles.filter((f) =>
  criticalFiles.some((cf) => f.endsWith(cf)),
);

if (touchedCritical.length > 0) {
  warn(
    `This PR modifies critical files that need careful review:\n` +
      touchedCritical.map((f) => `- \`${f}\``).join("\n"),
  );
}

// --- Rule 3: Commented-out code detection ---
const checkForCommentedCode = async () => {
  const diffs = await Promise.all(
    allChangedFiles
      .filter((f) => f.match(/\.(ts|tsx|js|jsx|css)$/))
      .map((f) => danger.git.diffForFile(f)),
  );

  const filesWithCommentedCode = [];

  for (const diff of diffs) {
    if (!diff) continue;
    const addedLines = diff.added.split("\n").filter((l) => l.startsWith("+"));
    const commentedOutLines = addedLines.filter(
      (l) =>
        l.match(/^\+\s*\/\//) &&
        !l.match(/^\+\s*\/\/\s*(TODO|FIXME|NOTE|HACK|eslint|@ts)/),
    );
    if (commentedOutLines.length > 3) {
      filesWithCommentedCode.push(diff.path || "unknown");
    }
  }

  if (filesWithCommentedCode.length > 0) {
    warn(
      `Detected significant commented-out code in:\n` +
        filesWithCommentedCode.map((f) => `- \`${f}\``).join("\n") +
        `\n\nCommented-out code can mask reverted fixes. Please verify these are intentional.`,
    );
  }
};

// --- Rule 4: Missing tests warning ---
const srcChanges = allChangedFiles.filter(
  (f) => f.startsWith("src/") && !f.includes(".test.") && !f.includes(".spec."),
);
const testChanges = allChangedFiles.filter(
  (f) => f.includes(".test.") || f.includes(".spec.") || f.startsWith("e2e/"),
);

if (srcChanges.length > 3 && testChanges.length === 0) {
  message(
    `This PR modifies ${srcChanges.length} source files but includes no test changes. ` +
      `Consider adding tests for the changes.`,
  );
}

// --- Rule 5: Unrelated file changes (scope check) ---
const prTitle = danger.github.pr.title.toLowerCase();
const prBody = (danger.github.pr.body || "").toLowerCase();

const fileCategories = {
  components: allChangedFiles.filter((f) => f.includes("src/components/")),
  pages: allChangedFiles.filter((f) => f.includes("src/pages/")),
  utils: allChangedFiles.filter((f) => f.includes("src/utils/")),
  config: allChangedFiles.filter(
    (f) => f.match(/\.(json|yml|yaml|config\.)/) && !f.includes("package"),
  ),
  docker: allChangedFiles.filter(
    (f) => f.includes("Dockerfile") || f.includes("docker-"),
  ),
};

const nonEmptyCategories = Object.entries(fileCategories).filter(
  ([, files]) => files.length > 0,
);

if (nonEmptyCategories.length >= 4) {
  warn(
    `This PR touches files across ${nonEmptyCategories.length} different areas ` +
      `(${nonEmptyCategories.map(([cat]) => cat).join(", ")}). ` +
      `Wide-reaching PRs may indicate scope creep — ensure all changes are related.`,
  );
}

// --- Rule 6: Package.json changes without lockfile ---
const packageChanged = allChangedFiles.includes("package.json");
const lockfileChanged = allChangedFiles.includes("package-lock.json");

if (packageChanged && !lockfileChanged) {
  warn(
    "`package.json` was modified but `package-lock.json` was not. " +
      "Did you forget to run `npm install`?",
  );
}

// Run async checks
checkForCommentedCode();
