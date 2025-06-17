# ODK Central Wrapper API

A lightweight TypeScript REST API for securely extracting, modifying, and returning encrypted submission data from an ODK Central instance. 
Built with Express and Zod, and featuring OpenAPI/Swagger documentation for immediate testability.

---

## ✨ Features

- Fetches and decrypts submission data from ODK Central
- Normalizes `idFieldId` to use ODK Central’s internal UUID (`KEY`)
- Removes unwanted fields from export
- Returns a cleaned-up `.zip` archive of the submission CSV
- OpenAPI (Swagger) docs with interactive "Try it out" support

---

## 🚀 Quick Start

### Prerequisites

- Node.js ≥ 16
- npm

### Installation

```bash
git clone https://github.com/OxfordRSE/ib-odk-wrapper.git
cd odk-wrapper
npm install
````

### Development Mode

```bash
npm run dev
```

### Production Build

```bash
npm run build
npm start
```

---

## 📡 API Usage

### Endpoint

```
POST /
```

### Body Parameters (JSON)

| Field            | Type                    | Required | Description                                             |
|------------------|-------------------------|----------|---------------------------------------------------------|
| `odkCentralUrl`  | `string (URL)`          | ✅        | The URL of your ODK Central instance                    |
| `email`          | `string (email)`        | ✅        | Your ODK Central login email                            |
| `password`       | `string`                | ✅        | Your ODK Central password                               |
| `projectId`      | `number`                | ✅        | Project ID                                              |
| `formName`       | `string`                | ✅        | The `xmlFormId` of the form                             |
| `decryptionKeys` | `Record<number,string>` | ✅        | Map of encryption key IDs to passwords                  |
| `idFieldId`      | `string`                | ✅        | Id of the field used to link submissions longitudinally |
| `dropFieldIds`   | `string[]` (optional)   | ❌        | Ids of fields to omit from the returned dataset         |

---

## 📖 Documentation

Interactive Swagger UI is available at:

```
http://localhost:3000/docs
```

Use this to explore and test the API directly from your browser using real values.

---

## 📦 What It Does Internally

1. Authenticates with ODK Central and retrieves a session token
2. Downloads a `.zip` of submission data for the given form
3. Extracts the CSV and parses all submissions
4. Normalizes the `idFieldId` using ODK Central’s `KEY` UUID
5. Removes any specified fields (`dropFieldIds`)
6. Re-zips the data and returns it in the response
7. Cleans up temporary files

---

## 🔐 Security Notes

* All decryption happens in memory; no credentials or secrets are persisted
* Temporary files are deleted as soon as the response is complete

---

## 🛠 Troubleshooting

Errors will return a JSON object with `error` and `parent` fields.
The `error` field contains a human-readable message, while `parent` provides the original error object for debugging.
Because this is a thin wrapper API, the full error stack can be returned to the client for easier debugging.

---

## 📄 License

MIT — free to use, modify, and distribute.

