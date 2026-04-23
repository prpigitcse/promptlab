/**
 * Copyright 2026 Pradosh Ranjan Pattanayak
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const DB_NAME = "PromptLabUserPrompts";
const DB_VERSION = 1;
const STORE_NAME = "prompts";

export const DRAFT_RECORD_ID = "working-draft";
export const PROMPT_RECORD_KIND = {
  DRAFT: "draft",
  GENERATED: "generated",
};

let dbPromise;

function isIndexedDbAvailable() {
  return typeof indexedDB !== "undefined";
}

function openDatabase() {
  if (!isIndexedDbAvailable()) {
    return Promise.reject(new Error("IndexedDB is not available."));
  }

  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (db.objectStoreNames.contains(STORE_NAME)) return;
      const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
      store.createIndex("kind", "kind", { unique: false });
      store.createIndex("updatedAt", "updatedAt", { unique: false });
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error || new Error("Unable to open IndexedDB."));
  });

  return dbPromise;
}

async function withStore(mode, action) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    let result;

    const request = action(store);
    if (request) {
      request.onsuccess = () => {
        result = request.result;
      };
      request.onerror = () =>
        reject(request.error || new Error("IndexedDB request failed."));
    }

    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () =>
      reject(transaction.error || new Error("IndexedDB transaction failed."));
    transaction.onabort = () =>
      reject(transaction.error || new Error("IndexedDB transaction aborted."));
  });
}

export async function savePromptRecord(record) {
  return withStore("readwrite", (store) => store.put(record));
}

export async function getPromptRecords() {
  const records = (await withStore("readonly", (store) => store.getAll())) || [];
  return records.sort((a, b) => {
    if (a.kind === PROMPT_RECORD_KIND.DRAFT) return -1;
    if (b.kind === PROMPT_RECORD_KIND.DRAFT) return 1;
    return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
  });
}

export async function deletePromptRecord(id) {
  return withStore("readwrite", (store) => store.delete(id));
}

export async function clearGeneratedPromptRecords() {
  const records = await getPromptRecords();
  const generatedRecords = records.filter(
    (record) => record.kind === PROMPT_RECORD_KIND.GENERATED,
  );

  await Promise.all(
    generatedRecords.map((record) => deletePromptRecord(record.id)),
  );
}
