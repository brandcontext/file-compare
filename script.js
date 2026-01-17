let filePairs = [];
let filesToClean = [];

// ========== CLEANING FUNCTIONS (from clean_json.js) ==========

function removeSuperscriptNumbers(text) {
    if (typeof text !== "string") return text;
    return text.replace(/[¹²³⁴⁵⁶⁷⁸⁹⁰]+/g, "");
}

function removeUnwantedPhrases(text) {
    if (typeof text !== "string") return text;
    text = text.replace(/learn\s+more/gi, "");
    text = text.replace(/terms\s+and\s+conditions?/gi, "");
    text = text.replace(/terms\s*&\s*conditions?/gi, "");
    return text;
}

function cleanGeneralText(text) {
    if (typeof text !== "string") return text;
    text = removeSuperscriptNumbers(text);
    text = removeUnwantedPhrases(text);
    text = text.replace(/  +/g, " ");
    text = text.replace(/\t+/g, "");
    text = text.replace(/'{2,}/g, "'");
    text = text.replace(/"{2,}/g, '"');
    text = text.replace(/,{2,}/g, ",");
    text = text.replace(/\.{2,}/g, ".");
    text = text.replace(/\*{2,}/g, "*");
    text = text.replace(/_{2,}/g, "_");
    text = text.replace(/\\"/g, '"');
    text = text.replace(/…/g, "");
    text = text.trim();
    return text;
}

function cleanFaqText(text) {
    if (typeof text !== "string") return text;
    text = removeSuperscriptNumbers(text);
    text = removeUnwantedPhrases(text);
    text = text.replace(/  +/g, " ");
    text = text.replace(/\t+/g, "");
    text = text.replace(/'{2,}/g, "'");
    text = text.replace(/"{2,}/g, '"');
    text = text.replace(/,{2,}/g, ",");
    text = text.replace(/\.{2,}/g, ".");
    text = text.replace(/\*{2,}/g, "*");
    text = text.replace(/_{2,}/g, "_");
    text = text.replace(/\\"/g, '"');
    text = text.replace(/…/g, "");
    text = text.trim();
    return text;
}

function cleanBigSummary(text) {
    if (typeof text !== "string") return text;
    text = removeSuperscriptNumbers(text);
    text = removeUnwantedPhrases(text);
    text = text.replace(/[^\S\n]+/g, " ");
    text = text.replace(/\t+/g, "");
    text = text.replace(/'{2,}/g, "'");
    text = text.replace(/"{2,}/g, '"');
    text = text.replace(/,{2,}/g, ",");
    text = text.replace(/\.{2,}/g, ".");
    text = text.replace(/\*{2,}/g, "*");
    text = text.replace(/_{2,}/g, "_");
    text = text.replace(/\\"/g, '"');
    text = text.replace(/…/g, "");
    return text;
}

function cleanObject(obj, isFaqFile = false) {
    if (Array.isArray(obj)) {
        return obj.map((item) => cleanObject(item, isFaqFile));
    } else if (obj !== null && typeof obj === "object") {
        const cleaned = {};
        for (const [key, value] of Object.entries(obj)) {
            if (key === "big_summary") {
                cleaned[key] = cleanBigSummary(value);
            } else if (isFaqFile && typeof value === "string") {
                cleaned[key] = cleanFaqText(value);
            } else if (typeof value === "string") {
                cleaned[key] = cleanGeneralText(value);
            } else {
                cleaned[key] = cleanObject(value, isFaqFile);
            }
        }
        return cleaned;
    }
    return obj;
}

// ========== MODE SWITCHING ==========

function switchMode(mode) {
    const cleanMode = document.getElementById("cleanMode");
    const compareMode = document.getElementById("compareMode");
    const cleanModeBtn = document.getElementById("cleanModeBtn");
    const compareModeBtn = document.getElementById("compareModeBtn");
    const results = document.getElementById("results");

    if (mode === "clean") {
        cleanMode.style.display = "block";
        compareMode.style.display = "none";
        cleanModeBtn.classList.add("active");
        compareModeBtn.classList.remove("active");
    } else {
        cleanMode.style.display = "none";
        compareMode.style.display = "block";
        cleanModeBtn.classList.remove("active");
        compareModeBtn.classList.add("active");
    }

    // Hide results when switching modes
    results.classList.remove("show");
}

// ========== CLEAN MODE HANDLERS ==========

document.getElementById("cleanFiles").addEventListener("change", function (e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    filesToClean = Array.from(files);
    document.getElementById("cleanUpload").classList.add("loaded");
    document.getElementById("cleanFileNames").textContent = `${filesToClean.length} file(s) selected`;
    document.getElementById("cleanFileNames").style.display = "block";
    document.getElementById("cleanBtn").disabled = false;
});

let cleanedFilesCache = [];

document.getElementById("cleanBtn").addEventListener("click", function () {
    if (filesToClean.length === 0) return;

    let processedCount = 0;
    const originalFiles = [];
    const cleanedFiles = [];

    filesToClean.forEach((file) => {
        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const jsonData = JSON.parse(e.target.result);
                const isFaqFile = file.name.toLowerCase().includes("faq");
                const cleanedData = cleanObject(jsonData, isFaqFile);

                originalFiles.push({
                    name: file.name,
                    data: jsonData,
                });

                cleanedFiles.push({
                    name: file.name.replace(".json", "-cleaned.json"),
                    data: cleanedData,
                });

                processedCount++;
                if (processedCount === filesToClean.length) {
                    previewCleanedChanges(originalFiles, cleanedFiles);
                }
            } catch (error) {
                console.error(`Error processing ${file.name}:`, error);
                alert(`Error processing ${file.name}: ${error.message}`);
            }
        };
        reader.readAsText(file);
    });
});

document.getElementById("downloadCleanedBtn").addEventListener("click", function () {
    if (cleanedFilesCache.length === 0) return;
    downloadCleanedFiles(cleanedFilesCache);
});

function previewCleanedChanges(originalFiles, cleanedFiles) {
    // Cache cleaned files for download
    cleanedFilesCache = cleanedFiles;

    // Create comparison data
    const allDifferences = [];
    originalFiles.forEach((originalFile, index) => {
        const cleanedFile = cleanedFiles[index];
        const differences = compareJSON(originalFile.data, cleanedFile.data);
        differences.forEach((diff) => {
            diff.fileName = originalFile.name;
            allDifferences.push(diff);
        });
    });

    // Show results
    displayResults(allDifferences, true);

    // Enable download button
    document.getElementById("downloadCleanedBtn").disabled = false;
    document.getElementById("downloadCleanedBtn").style.display = "inline-block";
}

function downloadCleanedFiles(cleanedFiles) {
    if (cleanedFiles.length === 1) {
        // Single file - direct download
        const file = cleanedFiles[0];
        const blob = new Blob([JSON.stringify(file.data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
        alert("✅ File cleaned and downloaded!");
    } else {
        // Multiple files - download each
        cleanedFiles.forEach((file) => {
            const blob = new Blob([JSON.stringify(file.data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = file.name;
            a.click();
            URL.revokeObjectURL(url);
        });
        alert(`✅ ${cleanedFiles.length} files cleaned and downloaded!`);
    }
}

// ========== COMPARE MODE HANDLERS ==========

// Bulk file upload handler
document.getElementById("bulkFiles").addEventListener("change", function (e) {
    handleBulkUpload(e.target.files);
});

function handleBulkUpload(files) {
    if (!files || files.length === 0) return;

    const fileMap = new Map();
    const cleanedFiles = new Map();
    let processedCount = 0;

    // First pass: organize files
    Array.from(files).forEach((file) => {
        const fileName = file.name;

        if (fileName.includes("-cleaned.json")) {
            // This is a cleaned file
            const baseName = fileName.replace("-cleaned.json", ".json");
            cleanedFiles.set(baseName, file);
        } else {
            // This is an original file
            fileMap.set(fileName, file);
        }
    });

    // Match pairs
    filePairs = [];
    fileMap.forEach((originalFile, fileName) => {
        const cleanedFile = cleanedFiles.get(fileName);
        if (cleanedFile) {
            filePairs.push({
                originalFile: originalFile,
                cleanedFile: cleanedFile,
                name: fileName,
            });
        }
    });

    if (filePairs.length === 0) {
        alert("No matching pairs found! Make sure you have both original and -cleaned versions of files.");
        return;
    }

    // Load all file pairs
    loadFilePairs();
}

function loadFilePairs() {
    let loadedPairs = 0;

    filePairs.forEach((pair, index) => {
        // Load original file
        const originalReader = new FileReader();
        originalReader.onload = function (e) {
            try {
                pair.originalData = JSON.parse(e.target.result);
                checkPairLoaded();
            } catch (error) {
                console.error(`Error parsing ${pair.originalFile.name}:`, error);
            }
        };
        originalReader.readAsText(pair.originalFile);

        // Load cleaned file
        const cleanedReader = new FileReader();
        cleanedReader.onload = function (e) {
            try {
                pair.cleanedData = JSON.parse(e.target.result);
                checkPairLoaded();
            } catch (error) {
                console.error(`Error parsing ${pair.cleanedFile.name}:`, error);
            }
        };
        cleanedReader.readAsText(pair.cleanedFile);
    });

    function checkPairLoaded() {
        loadedPairs++;
        if (loadedPairs === filePairs.length * 2) {
            // All files loaded
            displayMatchedPairs();
            document.getElementById("compareBtn").disabled = false;
            document.getElementById("bulkUpload").classList.add("loaded");
            document.getElementById("bulkFileNames").textContent = `${filePairs.length} pair(s) loaded`;
            document.getElementById("bulkFileNames").style.display = "block";
        }
    }
}

function displayMatchedPairs() {
    const pairsDiv = document.getElementById("pairsList");
    const matchedDiv = document.getElementById("matchedPairs");

    matchedDiv.style.display = "block";

    pairsDiv.innerHTML = filePairs
        .map(
            (pair, index) => `
					<div style="padding: 10px; margin: 5px 0; background: #f0f9ff; border-radius: 8px; border-left: 4px solid #0284c7;">
						<strong>${index + 1}.</strong> ${pair.name} ↔️ ${pair.cleanedFile.name}
					</div>
				`
        )
        .join("");
}

// Compare button handler
document.getElementById("compareBtn").addEventListener("click", function () {
    if (filePairs.length === 0) return;

    const allDifferences = [];

    filePairs.forEach((pair) => {
        const differences = compareJSON(pair.originalData, pair.cleanedData);
        differences.forEach((diff) => {
            diff.fileName = pair.name;
            allDifferences.push(diff);
        });
    });

    displayResults(allDifferences);
});

function compareJSON(original, cleaned, path = "") {
    const differences = [];

    function traverse(obj1, obj2, currentPath) {
        if (Array.isArray(obj1) && Array.isArray(obj2)) {
            const maxLength = Math.max(obj1.length, obj2.length);
            for (let i = 0; i < maxLength; i++) {
                traverse(obj1[i], obj2[i], `${currentPath}[${i}]`);
            }
        } else if (typeof obj1 === "object" && obj1 !== null && typeof obj2 === "object" && obj2 !== null) {
            const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);
            allKeys.forEach((key) => {
                traverse(obj1[key], obj2[key], currentPath ? `${currentPath}.${key}` : key);
            });
        } else if (typeof obj1 === "string" && typeof obj2 === "string") {
            if (obj1 !== obj2) {
                differences.push({
                    path: currentPath,
                    original: obj1,
                    cleaned: obj2,
                    type: "modified",
                    removedText: findRemovedText(obj1, obj2),
                });
            }
        } else if (obj1 !== obj2) {
            differences.push({
                path: currentPath,
                original: obj1,
                cleaned: obj2,
                type: obj1 && !obj2 ? "removed" : "modified",
            });
        }
    }

    traverse(original, cleaned, path);
    return differences;
}

function findRemovedText(original, cleaned) {
    const removed = [];

    // Find superscript numbers
    const superscripts = original.match(/[¹²³⁴⁵⁶⁷⁸⁹⁰]+/g);
    if (superscripts) removed.push(...superscripts);

    // Find extra spaces
    const extraSpaces = original.match(/  +/g);
    if (extraSpaces) removed.push("extra spaces");

    // Find learn more
    if (/learn\s+more/i.test(original)) removed.push("learn more");

    // Find terms and conditions
    if (/terms\s+and\s+conditions?/i.test(original)) removed.push("terms and conditions");

    // Find extra quotes
    if (original.match(/'{2,}/g) || original.match(/"{2,}/g)) removed.push("extra quotes");

    // Find extra dots
    if (original.match(/\.{2,}/g)) removed.push("extra dots");

    // Find extra asterisks
    if (original.match(/\*{2,}/g)) removed.push("extra asterisks");

    // Find extra underscores
    if (original.match(/_{2,}/g)) removed.push("extra underscores");

    // Find escaped quotes
    if (original.match(/\\"/g)) removed.push("escaped quotes");

    // Find ellipsis
    if (original.match(/…/g)) removed.push("ellipsis");

    return removed;
}

function highlightRemovedText(original, cleaned) {
    if (typeof original !== "string" || typeof cleaned !== "string") {
        return escapeHtml(original);
    }

    let highlighted = original;

    // Highlight superscript numbers
    highlighted = highlighted.replace(/([¹²³⁴⁵⁶⁷⁸⁹⁰]+)/g, '<span class="diff-highlight">$1</span>');

    // Highlight extra spaces (2 or more consecutive spaces)
    highlighted = highlighted.replace(/(  +)/g, '<span class="diff-highlight">$1</span>');

    // Highlight "learn more"
    highlighted = highlighted.replace(/(learn\s+more)/gi, '<span class="diff-highlight">$1</span>');

    // Highlight "terms and conditions"
    highlighted = highlighted.replace(
        /(terms\s+and\s+conditions?)/gi,
        '<span class="diff-highlight">$1</span>'
    );
    highlighted = highlighted.replace(
        /(terms\s*&\s*conditions?)/gi,
        '<span class="diff-highlight">$1</span>'
    );

    // Highlight extra quotes
    highlighted = highlighted.replace(/(''{2,})/g, '<span class="diff-highlight">$1</span>');
    highlighted = highlighted.replace(/("{2,})/g, '<span class="diff-highlight">$1</span>');

    // Highlight extra dots
    highlighted = highlighted.replace(/(\.{2,})/g, '<span class="diff-highlight">$1</span>');

    // Highlight extra asterisks
    highlighted = highlighted.replace(/(\*{2,})/g, '<span class="diff-highlight">$1</span>');

    // Highlight extra underscores
    highlighted = highlighted.replace(/(_{2,})/g, '<span class="diff-highlight">$1</span>');

    // Highlight escaped quotes
    highlighted = highlighted.replace(/(\\["'])/g, '<span class="diff-highlight">$1</span>');

    // Highlight ellipsis
    highlighted = highlighted.replace(/(…)/g, '<span class="diff-highlight">$1</span>');

    return highlighted;
}

function displayResults(differences, isCleanMode = false) {
    const resultsDiv = document.getElementById("results");
    const statsDiv = document.getElementById("stats");
    const changesDiv = document.getElementById("changesContainer");

    resultsDiv.classList.add("show");

    // Calculate statistics
    const totalChanges = differences.length;
    const modifiedFields = differences.filter((d) => d.type === "modified").length;
    const removedFields = differences.filter((d) => d.type === "removed").length;
    const fileCount = isCleanMode ? filesToClean.length : filePairs.length;

    // Count what was removed
    const removedItems = {
        superscripts: 0,
        extraSpaces: 0,
        learnMore: 0,
        termsConditions: 0,
        extraQuotes: 0,
        extraDots: 0,
        extraAsterisks: 0,
        extraUnderscores: 0,
        escapedQuotes: 0,
        ellipsis: 0,
    };

    differences.forEach((diff) => {
        if (typeof diff.original === "string") {
            if (/[¹²³⁴⁵⁶⁷⁸⁹⁰]+/.test(diff.original)) removedItems.superscripts++;
            if (/  +/.test(diff.original)) removedItems.extraSpaces++;
            if (/learn\s+more/i.test(diff.original)) removedItems.learnMore++;
            if (/terms\s+and\s+conditions?/i.test(diff.original)) removedItems.termsConditions++;
            if (diff.original.match(/'{2,}/g) || diff.original.match(/"{2,}/g)) removedItems.extraQuotes++;
            if (diff.original.match(/\.{2,}/g)) removedItems.extraDots++;
            if (diff.original.match(/\*{2,}/g)) removedItems.extraAsterisks++;
            if (diff.original.match(/_{2,}/g)) removedItems.extraUnderscores++;
            if (diff.original.match(/\\"/g)) removedItems.escapedQuotes++;
            if (diff.original.match(/…/g)) removedItems.ellipsis++;
        }
    });

    // Display stats
    statsDiv.innerHTML = `
                <div class="stat-card">
                    <h3>${fileCount}</h3>
                    <p>Files Compared</p>
                </div>
                <div class="stat-card">
                    <h3>${totalChanges}</h3>
                    <p>Total Changes</p>
                </div>
                <div class="stat-card">
                    <h3>${removedItems.superscripts}</h3>
                    <p>Superscripts Removed</p>
                </div>
                <div class="stat-card">
                    <h3>${removedItems.extraSpaces}</h3>
                    <p>Extra Spaces Cleaned</p>
                </div>
                <div class="stat-card">
                    <h3>${removedItems.learnMore + removedItems.termsConditions}</h3>
                    <p>Unwanted Phrases</p>
                </div>
                <div class="stat-card">
                    <h3>${removedItems.extraDots + removedItems.extraAsterisks + removedItems.extraUnderscores}</h3>
                    <p>Extra Symbols</p>
                </div>
                <div class="stat-card">
                    <h3>${removedItems.ellipsis + removedItems.escapedQuotes}</h3>
                    <p>Special Characters</p>
                </div>
            `;

    // Display changes
    if (differences.length === 0) {
        changesDiv.innerHTML = `
                    <div class="no-changes">
                        <h2>✅ No Changes Detected</h2>
                        <p>All files appear to be identical</p>
                    </div>
                `;
    } else {
        changesDiv.innerHTML = differences
            .map((diff) => {
                const originalText =
                    typeof diff.original === "string"
                        ? diff.original
                        : JSON.stringify(diff.original, null, 2);
                const cleanedText =
                    typeof diff.cleaned === "string" ? diff.cleaned : JSON.stringify(diff.cleaned, null, 2);

                // Highlight removed text in original
                const highlightedOriginal =
                    typeof diff.original === "string"
                        ? highlightRemovedText(diff.original, diff.cleaned)
                        : escapeHtml(JSON.stringify(diff.original, null, 2));

                return `
                        <div class="change-item">
                            <div class="change-header">
                                <div>
                                    <div style="font-size: 0.85em; color: #0284c7; margin-bottom: 5px;">📄 ${diff.fileName
                    }</div>
                                    <span class="change-path">${diff.path}</span>
                                </div>
                                <span class="change-type ${diff.type}">${diff.type.toUpperCase()}</span>
                            </div>
                            <div class="text-comparison">
                                <div class="text-block original-text">
                                    <h4>Original</h4>
                                    <pre>${highlightedOriginal}</pre>
                                </div>
                                <div class="text-block cleaned-text">
                                    <h4>Cleaned</h4>
                                    <pre>${escapeHtml(cleanedText)}</pre>
                                </div>
                            </div>
                            ${diff.removedText && diff.removedText.length > 0
                        ? `
                                <div style="margin-top: 15px; padding: 10px; background: #fef2f2; border-radius: 5px;">
                                    <strong>Removed:</strong> ${diff.removedText.join(", ")}
                                </div>
                            `
                        : ""
                    }
                        </div>
                    `;
            })
            .join("");
    }

    // Scroll to results
    resultsDiv.scrollIntoView({ behavior: "smooth" });
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}